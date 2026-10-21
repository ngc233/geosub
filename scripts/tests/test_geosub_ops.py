import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch, MagicMock

SCRIPT = Path(__file__).resolve().parents[1] / 'geosub_ops.py'
spec = importlib.util.spec_from_file_location('ops', SCRIPT)
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)


class OpsTest(unittest.TestCase):
    def test_failure_phase_preserves_http_200_body_timeout(self):
        data = dict(http_code=200, time_connect=.1, time_appconnect=.2, time_starttransfer=.3, url_effective='https://example.org')
        self.assertEqual(ops.failure_stage(data, 28), 'body')
        data['time_starttransfer'] = 0
        self.assertEqual(ops.failure_stage(data, 28), 'first-byte')
        data['time_appconnect'] = 0
        self.assertEqual(ops.failure_stage(data, 35), 'tls')
        self.assertEqual(ops.failure_stage({}, 6), 'dns')
        self.assertEqual(ops.failure_stage({}, 7), 'connect')

    def test_probe_retains_partial_failure_and_only_allowed_headers(self):
        def curl(cmd, **kwargs):
            Path(cmd[cmd.index('--output')+1]).write_text('<html>partial')
            Path(cmd[cmd.index('--dump-header')+1]).write_text('HTTP/2 200\nCF-Ray: correlation-id\nSet-Cookie: SECRET\n')
            return types.SimpleNamespace(returncode=28, stdout=json.dumps(dict(http_code=200, time_connect=.1, time_appconnect=.2, time_starttransfer=.3, url_effective='https://example.org')), stderr='body timeout')
        with patch.object(ops.subprocess, 'run', side_effect=curl):
            row = ops.probe('https://example.org', '/zh', 'test')
        self.assertFalse(row['ok']); self.assertEqual(row['failedStage'], 'body')
        self.assertEqual(row['headers'], {'cf-ray': 'correlation-id'})
        self.assertNotIn('SECRET', json.dumps(row))
        self.assertEqual(len(row['sampleId']), 32)

    def test_probe_rejects_unhealthy_200_and_records_observer_error(self):
        def curl(cmd, **kwargs):
            Path(cmd[cmd.index('--output')+1]).write_text('{"status":"degraded"}')
            return types.SimpleNamespace(returncode=0, stdout='{"http_code":200}', stderr='')
        with patch.object(ops.subprocess, 'run', side_effect=curl):
            row = ops.probe('https://example.org', '/api/health', 'test')
        self.assertFalse(row['ok']); self.assertEqual(row['failedStage'], 'content')
        with patch.object(ops.subprocess, 'run', side_effect=FileNotFoundError()):
            row = ops.probe('https://example.org', '/zh', 'test')
        self.assertFalse(row['ok']); self.assertEqual(row['failedStage'], 'observer')

    def test_idle_guard_is_bounded_and_released_on_exception(self):
        child = MagicMock(); child.poll.return_value = None
        with patch.object(ops.platform, 'system', return_value='Darwin'), patch.object(ops.subprocess, 'Popen', return_value=child) as launch:
            with self.assertRaises(ValueError):
                with ops.awake(75): raise ValueError('interrupted')
        self.assertEqual(launch.call_args.args[0][-2:], ['-t', '75'])
        child.terminate.assert_called_once(); child.wait.assert_called_once()

    def test_private_evidence_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp)/'receipt'
            ops.private_create(file, {'first': True})
            with self.assertRaises(FileExistsError): ops.private_create(file, {'second': True})
            self.assertEqual(json.loads(file.read_text()), {'first': True})
            self.assertEqual(file.stat().st_mode & 0o777, 0o600)

    def test_reservation_idempotency_and_status_after_unit_disappears(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); commit = 'a'*40; control = root/'controllers'/commit
            control.mkdir(parents=True); (root/'control').symlink_to(control)
            marker = root/'called'
            (control/'upgrade.sh').write_text('echo called >> '+str(marker)+'\n')
            req = dict(id='test-run', controllerCommit=commit, releaseRoot=str(root), kind='web-upgrade')
            real_run, real_stat = subprocess.run, Path.stat
            calls = []
            def stat(path, *a, **kw):
                s = real_stat(path, *a, **kw)
                return types.SimpleNamespace(st_uid=0, st_mode=s.st_mode)
            def run(command, **kwargs):
                calls.append(command)
                if command[0] == 'systemd-run':
                    i = command.index('/usr/bin/python3')
                    return real_run([sys.executable]+command[i+1:], **kwargs)
                raise AssertionError('completed request must not depend on retained unit')
            with patch.object(ops.os, 'geteuid', return_value=0), patch.object(Path, 'stat', stat), patch.object(ops.subprocess, 'run', side_effect=run):
                self.assertEqual(ops.server_request('start', req)['state'], 'succeeded')
                self.assertEqual(ops.server_request('start', req)['state'], 'succeeded')
                self.assertEqual(ops.server_request('status', req)['state'], 'succeeded')
                with self.assertRaises(ValueError): ops.server_request('start', {**req, 'kind':'collector-upgrade', 'candidateCommit':'b'*40})
            self.assertEqual(len(calls), 1)
            self.assertEqual(marker.read_text(), 'called\n')

    def test_unknown_reservation_never_redispatches_or_claims_success(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); folder=root/'operator-requests'/'test-run';folder.mkdir(parents=True)
            req=dict(id='test-run',controllerCommit='a'*40,releaseRoot=str(root),kind='web-upgrade')
            with patch.object(ops.os,'geteuid',return_value=0),patch.object(ops.subprocess,'run') as run:
                self.assertEqual(ops.server_request('start',req)['state'],'unknown')
                run.assert_not_called()
            ops.private_create(folder/'request.json',req)
            with patch.object(ops.os,'geteuid',return_value=0),patch.object(ops.subprocess,'run',return_value=types.SimpleNamespace(stdout='ActiveState=failed\nResult=timeout\n')):
                result=ops.server_request('status',req)
            self.assertEqual(result['state'],'unknown');self.assertFalse(result['retryAllowed'])

    def test_validation_and_rollback_are_explicit(self):
        req=dict(id='safe',controllerCommit='a'*40,releaseRoot='/opt/geosub/releases',kind='web-upgrade')
        for bad in [{'id':'../oops'},{'controllerCommit':'main'},{'releaseRoot':'/opt/../etc'},{'kind':'restart'}]:
            with self.assertRaises(ValueError):ops.validate_request({**req,**bad})
        with self.assertRaises(ValueError):ops.validate_request({**req,'kind':'web-rollback'})
        req.update(kind='collector-rollback',attempt='20261020T132123Z-533')
        ops.validate_request(req)
        self.assertEqual(ops.release_argv(req)[-4:],['--attempt',req['attempt'],'--confirm',req['attempt']])

    def test_finalize_requires_exact_attempt_and_candidate(self):
        req=dict(id='safe',controllerCommit='a'*40,releaseRoot='/opt/geosub/releases',kind='web-finalize',attempt='20261021T111929Z-174',candidateCommit='b'*40)
        ops.validate_request(req)
        self.assertEqual(ops.release_argv(req),['/bin/bash','/opt/geosub/releases/controllers/'+'a'*40+'/finalize-release.sh','--attempt',req['attempt'],'--confirm',req['attempt'],'--commit',req['candidateCommit']])
        for bad in [{'attempt':'latest'},{'attempt':''},{'candidateCommit':'main'},{'candidateCommit':''}]:
            with self.assertRaises(ValueError):ops.validate_request({**req,**bad})

    def test_ssh_failure_is_unknown_not_automatic_resubmission(self):
        with tempfile.TemporaryDirectory() as temp:
            file=Path(temp)/'key';file.touch()
            args=argparse.Namespace(host='root@host',identity=str(file),known_hosts=str(file))
            with patch.object(ops.platform,'system',return_value='Linux'),patch.object(ops.subprocess,'run',return_value=types.SimpleNamespace(returncode=255)) as run:
                with self.assertRaisesRegex(RuntimeError,'UNKNOWN'):ops.ssh_request(args,'start',{})
            self.assertEqual(run.call_count,1)
            self.assertIn('StrictHostKeyChecking=yes',run.call_args.args[0])


if __name__ == '__main__': unittest.main()
