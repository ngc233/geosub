import argparse
import datetime
import errno
import socket
import ssl
import importlib.util
import io
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


class OfflineTest(unittest.TestCase):
    def setUp(self):
        # Any unmocked HTTP call fails the test before it can reach the network.
        self.network = self.enterContext(patch.object(ops, 'build_opener', side_effect=AssertionError('Real network forbidden')))
        self.enterContext(patch.dict(os.environ, {'GITHUB_TOKEN': ''}))


class OpsTest(OfflineTest):
    def test_web_upgrade_passes_exact_candidate_to_controller(self):
        req = dict(id='pinned', controllerCommit='a'*40, candidateCommit='b'*40,
                   releaseRoot='/opt/geosub/releases', kind='web-upgrade')
        ops.validate_request(req)
        self.assertEqual(ops.release_argv(req), [
            '/bin/bash', '/opt/geosub/releases/controllers/'+'a'*40+'/upgrade.sh',
            '--commit', 'b'*40])
        for value in (None, '', 'main', 'b'*39, 'b'*41, 'B'*40, 'b'*40+'\n'):
            with self.subTest(candidate=value), self.assertRaises(ValueError):
                ops.validate_request({**req, 'candidateCommit': value})

    def test_missing_web_candidate_is_rejected_before_receipt_or_dispatch(self):
        with tempfile.TemporaryDirectory() as temp:
            receipt = Path(temp)/'receipt.json'
            command = [str(SCRIPT), 'start', '--kind', 'web-upgrade',
                       '--controller-commit', 'a'*40, '--host', 'test-host',
                       '--identity', 'unused', '--known-hosts', 'unused',
                       '--receipt', str(receipt)]
            result = subprocess.run([sys.executable, *command], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn('full candidate commit', result.stderr)
            self.assertFalse(receipt.exists())

    def test_web_start_records_and_dispatches_the_same_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            receipt = Path(temp)/'receipt.json'
            args = [str(SCRIPT), 'start', '--kind', 'web-upgrade',
                    '--controller-commit', 'a'*40, '--candidate-commit', 'b'*40,
                    '--host', 'test-host', '--identity', 'unused', '--known-hosts', 'unused',
                    '--receipt', str(receipt)]
            with patch.object(sys, 'argv', args), patch.object(ops, 'check_ci', return_value={'overrideUsed': False}), patch.object(ops, 'ssh_request', return_value={'state': 'running'}) as ssh, patch('sys.stdout', new_callable=io.StringIO), patch('sys.stderr', new_callable=io.StringIO):
                self.assertEqual(ops.main(), 3)
            req = json.loads(receipt.read_text())
            self.assertEqual(req['candidateCommit'], 'b'*40)
            self.assertEqual(req['controllerCommit'], 'a'*40)
            self.assertEqual(ssh.call_args.args[1:], ('start', req))
            self.assertEqual(ops.release_argv(req)[-2:], ['--commit', 'b'*40])

    def test_legacy_web_receipt_remains_queryable_but_cannot_start(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            req = dict(id='legacy', host='test-host', controllerCommit='a'*40,
                       candidateCommit=None, releaseRoot=str(root), kind='web-upgrade')
            folder = root/'operator-requests'/'legacy'
            folder.mkdir(parents=True)
            ops.private_create(folder/'request.json', req)
            ops.private_create(folder/'completion.json', {'state': 'succeeded', 'exitCode': 0})
            with patch.object(ops.os, 'geteuid', return_value=0), patch.object(ops.subprocess, 'run') as run:
                self.assertEqual(ops.server_request('status', req)['state'], 'succeeded')
                with self.assertRaises(ValueError):
                    ops.server_request('start', req)
                run.assert_not_called()
            receipt = root/'local.json'
            ops.private_create(receipt, req)
            args = [str(SCRIPT), 'status', '--receipt', str(receipt),
                    '--identity', 'unused', '--known-hosts', 'unused']
            with patch.object(sys, 'argv', args), patch.object(ops, 'ssh_request', return_value={'state': 'succeeded'}) as ssh, patch('sys.stdout', new_callable=io.StringIO):
                self.assertEqual(ops.main(), 0)
                self.assertEqual(ssh.call_args.args[1:], ('status', req))

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
            req = dict(id='test-run', controllerCommit=commit, candidateCommit='b'*40, releaseRoot=str(root), kind='web-upgrade')
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
            req=dict(id='test-run',controllerCommit='a'*40,candidateCommit='b'*40,releaseRoot=str(root),kind='web-upgrade')
            with patch.object(ops.os,'geteuid',return_value=0),patch.object(ops.subprocess,'run') as run:
                self.assertEqual(ops.server_request('start',req)['state'],'unknown')
                run.assert_not_called()
            ops.private_create(folder/'request.json',req)
            with patch.object(ops.os,'geteuid',return_value=0),patch.object(ops.subprocess,'run',return_value=types.SimpleNamespace(stdout='ActiveState=failed\nResult=timeout\n')):
                result=ops.server_request('status',req)
            self.assertEqual(result['state'],'unknown');self.assertFalse(result['retryAllowed'])

    def test_validation_and_rollback_are_explicit(self):
        req=dict(id='safe',controllerCommit='a'*40,candidateCommit='b'*40,releaseRoot='/opt/geosub/releases',kind='web-upgrade')
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


CANDIDATE = 'b' * 40
MAIN = 'c' * 40


def fixture_run(run_id=20, **changes):
    return dict(dict(id=run_id, run_number=run_id, run_attempt=1, name='CI', head_sha=CANDIDATE,
                     status='completed', conclusion='success', created_at='2026-11-03T10:00:00Z',
                     run_started_at='2026-11-03T10:00:01Z', updated_at='2026-11-03T10:05:00Z'), **changes)


class CIGateTest(OfflineTest):
    def fake_api(self, runs=None, *, ancestry='ahead', first_error=None, refresh=None):
        runs = [fixture_run()] if runs is None else runs

        def respond(path):
            if path == '/git/ref/heads/main':
                return {'object': {'type': 'commit', 'sha': MAIN}}
            if path == '/compare/' + CANDIDATE + '...' + MAIN + '?per_page=1':
                return {'status': ancestry, 'base_commit': {'sha': CANDIDATE},
                        'merge_base_commit': {'sha': CANDIDATE}}
            if path.startswith('/actions/runs?'):
                self.assertIn('head_sha=' + CANDIDATE, path)
                self.assertNotIn('status=', path)
                self.assertNotIn('event=', path)
                if first_error:
                    raise first_error
                page = int(path.rsplit('=', 1)[1])
                return {'total_count': len(runs), 'workflow_runs': runs[(page-1)*100:page*100]}
            if path.startswith('/actions/runs/'):
                if isinstance(refresh, Exception):
                    raise refresh
                return refresh or next(run for run in runs if str(run['id']) == path.rsplit('/', 1)[1])
            raise AssertionError('Unexpected API path: ' + path)
        return respond

    def check(self, runs=None, **kwargs):
        with patch.object(ops, 'github_json', side_effect=self.fake_api(runs, **kwargs)):
            return ops.check_ci(CANDIDATE)

    def test_success_records_exact_run_attempt_main_and_check_time(self):
        result = self.check([fixture_run(run_attempt=3)])
        self.assertEqual(result['candidateCommit'], CANDIDATE)
        self.assertEqual(result['mainCommit'], MAIN)
        self.assertTrue(result['reachableFromMain'])
        self.assertEqual((result['runId'], result['runNumber'], result['runAttempt']), (20, 20, 3))
        self.assertEqual(result['conclusion'], 'success')
        self.assertFalse(result['overrideUsed'])
        self.assertFalse(result['overrideRequested'])
        self.assertIsNone(result['approvalId'])
        self.assertIsNotNone(datetime.datetime.fromisoformat(result['checkedAt']).tzinfo)

    def test_definitive_non_success_never_accepts_exception(self):
        for status, conclusion in [('completed', c) for c in
                                   ('failure', 'cancelled', 'timed_out', 'neutral', 'skipped', 'action_required', None)] + [
                                       ('in_progress', None), ('queued', None), ('waiting', None), ('pending', None), ('requested', None)]:
            for allow in (False, True):
                with self.subTest(status=status, conclusion=conclusion, allow=allow):
                    run = fixture_run(status=status, conclusion=conclusion)
                    with patch.object(ops, 'github_json', side_effect=self.fake_api([run])):
                        with self.assertRaisesRegex(ops.CIError, status):
                            ops.check_ci(CANDIDATE, allow, 'APR-0003' if allow else None)

    def test_no_ci_or_only_other_workflow_is_not_found_even_with_exception(self):
        for runs in ([], [fixture_run(name='CI-extra')]):
            with patch.object(ops, 'github_json', side_effect=self.fake_api(runs)):
                with self.assertRaisesRegex(ops.CIError, 'not_found'):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')

    def test_latest_failure_cannot_select_older_success_in_either_order(self):
        old = fixture_run(1, run_started_at='2026-11-03T09:00:00Z', created_at='2026-11-03T09:00:00Z')
        new = fixture_run(2, conclusion='failure')
        for runs in ([old, new], [new, old]):
            with self.assertRaisesRegex(ops.CIError, 'run 2.*failure'):
                self.check(runs)

    def test_latest_success_can_follow_an_older_failure(self):
        old = fixture_run(1, conclusion='failure', run_started_at='2026-11-03T09:00:00Z', created_at='2026-11-03T09:00:00Z')
        self.assertEqual(self.check([old, fixture_run(2)])['runId'], 2)

    def test_rerun_of_older_run_id_is_the_latest_attempt(self):
        rerun = fixture_run(1, run_attempt=2, conclusion='failure', created_at='2026-11-02T09:00:00Z',
                            run_started_at='2026-11-03T11:00:00Z', updated_at='2026-11-03T11:05:00Z')
        with self.assertRaisesRegex(ops.CIError, 'run 1 attempt 2.*failure'):
            self.check([fixture_run(20), rerun])
        rerun['conclusion'] = 'success'
        self.assertEqual(self.check([fixture_run(20, conclusion='failure'), rerun])['runAttempt'], 2)

    def test_old_slow_run_finishing_later_does_not_hide_new_failure(self):
        old = fixture_run(1, created_at='2026-11-03T09:00:00Z', run_started_at='2026-11-03T09:00:00Z',
                          updated_at='2026-11-03T12:00:00Z')
        with self.assertRaisesRegex(ops.CIError, 'run 2.*failure'):
            self.check([old, fixture_run(2, conclusion='failure')])

    def test_queued_rerun_with_stale_or_null_start_blocks_release(self):
        for started in ('2026-11-02T09:00:00Z', None):
            rerun = fixture_run(1, run_attempt=2, status='queued', conclusion=None,
                                created_at='2026-11-02T09:00:00Z', run_started_at=started,
                                updated_at='2026-11-03T11:00:00Z')
            with self.assertRaisesRegex(ops.CIError, 'queued'):
                self.check([fixture_run(20), rerun])

    def test_timestamp_tie_does_not_pick_success_over_failure(self):
        with self.assertRaisesRegex(ops.CIError, 'failure'):
            self.check([fixture_run(1, conclusion='failure'), fixture_run(20)])

    def test_newest_rerun_on_second_page_is_checked(self):
        runs = [fixture_run(i+1, name='Other') for i in range(100)]
        runs[0] = fixture_run(999)
        runs.append(fixture_run(1, run_attempt=3, conclusion='failure', run_started_at='2026-11-03T11:00:00Z'))
        with self.assertRaisesRegex(ops.CIError, 'attempt 3.*failure'):
            self.check(runs)

    def test_paginated_listing_must_be_complete_unique_and_stable(self):
        bad_pages = [
            [{'total_count': 1001, 'workflow_runs': []}],
            [{'total_count': 1, 'workflow_runs': []}],
            [{'total_count': 2, 'workflow_runs': [fixture_run(), fixture_run()]}],
            [{'total_count': 1, 'workflow_runs': [fixture_run(head_sha='d'*40)]}],
            [{'total_count': 101, 'workflow_runs': [fixture_run(i+1) for i in range(100)]},
             {'total_count': 102, 'workflow_runs': [fixture_run(101), fixture_run(102)]}],
            [{'total_count': 101, 'workflow_runs': [fixture_run(i+1) for i in range(100)]},
             ops.CIUnavailable('GitHub HTTP 503')],
        ]
        for pages in bad_pages:
            fake = self.fake_api()
            calls = iter(pages)
            def respond(path):
                if path.startswith('/actions/runs?'):
                    response = next(calls)
                    if isinstance(response, Exception):
                        raise response
                    return response
                return fake(path)
            with self.subTest(pages=len(pages)), patch.object(ops, 'github_json', side_effect=respond):
                with self.assertRaises(ops.CIError):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')

    def test_run_refresh_change_or_failure_cannot_be_bypassed(self):
        for refresh in (fixture_run(run_attempt=2, status='queued', conclusion=None),
                        fixture_run(head_sha='d'*40), ops.CIUnavailable('GitHub HTTP 503')):
            with patch.object(ops, 'github_json', side_effect=self.fake_api(refresh=refresh)):
                with self.assertRaises(ops.CIError):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')

    def test_main_ancestry_is_mandatory_even_with_passing_ci_and_exception(self):
        for status in ('behind', 'diverged', 'unknown'):
            with patch.object(ops, 'github_json', side_effect=self.fake_api(ancestry=status)) as api:
                with self.assertRaisesRegex(ops.CIError, 'not reachable'):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')
                self.assertEqual(api.call_count, 2)
        self.assertEqual(self.check(ancestry='identical')['conclusion'], 'success')

    def test_unavailable_main_lookup_or_comparison_never_accepts_exception(self):
        for fail_path in ('/git/ref/heads/main', '/compare/'):
            fake = self.fake_api()
            def respond(path):
                if path.startswith(fail_path):
                    raise ops.CIUnavailable('GitHub network unreachable')
                return fake(path)
            with patch.object(ops, 'github_json', side_effect=respond):
                with self.assertRaisesRegex(ops.CIError, 'reachability.*not applicable'):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')

    def test_exception_requires_both_valid_approval_and_flag_before_api(self):
        for allow, approval in ((True, None), (True, ''), (True, '1234'), (True, 'APR-'),
                                (True, 'APR-0003\n'), (False, 'APR-0003')):
            with patch.object(ops, 'github_json') as api:
                with self.assertRaisesRegex(ops.CIError, 'approval-id'):
                    ops.check_ci(CANDIDATE, allow, approval)
                api.assert_not_called()

    def test_only_initial_ci_unavailability_with_approval_can_be_overridden(self):
        for reason in ('GitHub network unreachable', 'GitHub HTTP 503'):
            with patch.object(ops, 'github_json', side_effect=self.fake_api(first_error=ops.CIUnavailable(reason))):
                with self.assertRaisesRegex(ops.CIError, 'release refused'):
                    ops.check_ci(CANDIDATE)
                result = ops.check_ci(CANDIDATE, True, 'APR-0003')
            self.assertTrue(result['overrideRequested'])
            self.assertTrue(result['overrideUsed'])
            self.assertEqual(result['approvalId'], 'APR-0003')
            self.assertEqual(result['reason'], reason)
            self.assertIsNone(result['runId'])
            self.assertIsNone(result['conclusion'])
            self.assertTrue(result['reachableFromMain'])

    def test_exception_request_is_recorded_but_not_used_when_ci_passes(self):
        with patch.object(ops, 'github_json', side_effect=self.fake_api()):
            result = ops.check_ci(CANDIDATE, True, 'APR-0003')
        self.assertTrue(result['overrideRequested'])
        self.assertFalse(result['overrideUsed'])
        self.assertEqual(result['approvalId'], 'APR-0003')

    def test_malformed_response_does_not_become_an_exception(self):
        for change in ({'run_attempt': 0}, {'status': 'made-up'}, {'conclusion': 'made-up'},
                       {'created_at': 'bad'}, {'run_started_at': None}, {'updated_at': '2026-11-03'}):
            with patch.object(ops, 'github_json', side_effect=self.fake_api([fixture_run(**change)])):
                with self.assertRaises(ops.CIError):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')
        for comparison in ({}, {'base_commit': None}, {'base_commit': {'sha': CANDIDATE},
                                                     'merge_base_commit': {'sha': 'd'*40}, 'status': 'ahead'}):
            with patch.object(ops, 'github_json', side_effect=[{'object': {'type': 'commit', 'sha': MAIN}}, comparison]):
                with self.assertRaises(ops.CIError):
                    ops.check_ci(CANDIDATE, True, 'APR-0003')

    def cli_start(self, receipt, kind='web-upgrade', extra=()):
        return [str(SCRIPT), 'start', '--kind', kind, '--controller-commit', 'a'*40,
                '--candidate-commit', CANDIDATE, '--host', 'test-host', '--identity', 'unused',
                '--known-hosts', 'unused', '--receipt', str(receipt), '--attempt', '20261103T100000Z', *extra]

    def test_both_upgrades_persist_and_dispatch_ci_evidence(self):
        for kind in ('web-upgrade', 'collector-upgrade'):
            with tempfile.TemporaryDirectory() as temp:
                receipt = Path(temp)/'receipt.json'
                with patch.object(sys, 'argv', self.cli_start(receipt, kind)), patch.object(ops, 'github_json', side_effect=self.fake_api()), patch.object(ops, 'ssh_request', return_value={'state': 'running'}) as ssh, patch('sys.stdout', new_callable=io.StringIO), patch('sys.stderr', new_callable=io.StringIO) as err:
                    self.assertEqual(ops.cli(), 3)
                req = json.loads(receipt.read_text())
                self.assertEqual(req['ciCheck']['conclusion'], 'success')
                self.assertEqual(req['ciCheck']['candidateCommit'], req['candidateCommit'])
                self.assertEqual(req, ssh.call_args.args[2])
                self.assertEqual(receipt.stat().st_mode & 0o777, 0o600)
                self.assertIn(CANDIDATE, err.getvalue())

    def test_failure_cli_prints_reason_returns_nonzero_and_never_dispatches(self):
        for kind in ('web-upgrade', 'collector-upgrade'):
            with tempfile.TemporaryDirectory() as temp:
                receipt = Path(temp)/'receipt.json'
                with patch.object(sys, 'argv', self.cli_start(receipt, kind, ('--allow-unverified-ci', '--approval-id', 'APR-0003'))), patch.object(ops, 'github_json', side_effect=self.fake_api([fixture_run(conclusion='failure')])), patch.object(ops, 'ssh_request') as ssh, patch('sys.stderr', new_callable=io.StringIO) as err:
                    self.assertEqual(ops.cli(), 2)
                self.assertIn('failure', err.getvalue())
                self.assertIn(CANDIDATE, err.getvalue())
                self.assertFalse(receipt.exists())
                ssh.assert_not_called()

    def test_exception_receipt_and_warning_include_approval(self):
        with tempfile.TemporaryDirectory() as temp:
            receipt = Path(temp)/'receipt.json'
            with patch.object(sys, 'argv', self.cli_start(receipt, extra=('--allow-unverified-ci', '--approval-id', 'APR-0003'))), patch.object(ops, 'github_json', side_effect=self.fake_api(first_error=ops.CIUnavailable('GitHub HTTP 503'))), patch.object(ops, 'ssh_request', return_value={'state': 'running'}), patch('sys.stdout', new_callable=io.StringIO), patch('sys.stderr', new_callable=io.StringIO) as err:
                self.assertEqual(ops.cli(), 3)
            evidence = json.loads(receipt.read_text())['ciCheck']
            self.assertTrue(evidence['overrideUsed'])
            self.assertEqual(evidence['approvalId'], 'APR-0003')
            self.assertIn('WARNING: UNVERIFIED CI EXCEPTION', err.getvalue())
            self.assertIn('APR-0003', err.getvalue())

    def test_rollbacks_and_finalize_never_query_ci(self):
        for kind in ('web-rollback', 'collector-rollback', 'web-finalize'):
            with tempfile.TemporaryDirectory() as temp:
                receipt = Path(temp)/'receipt.json'
                with patch.object(sys, 'argv', self.cli_start(receipt, kind)), patch.object(ops, 'github_json') as api, patch.object(ops, 'ssh_request', return_value={'state': 'running'}) as ssh, patch('sys.stdout', new_callable=io.StringIO):
                    self.assertEqual(ops.cli(), 3)
                api.assert_not_called()
                self.assertNotIn('ciCheck', json.loads(receipt.read_text()))
                self.assertEqual(ssh.call_count, 1)

    def test_exception_options_on_exempt_operations_are_rejected_without_ci(self):
        for kind in ('web-rollback', 'collector-rollback', 'web-finalize'):
            with tempfile.TemporaryDirectory() as temp:
                receipt = Path(temp)/'receipt.json'
                args = self.cli_start(receipt, kind, ('--allow-unverified-ci', '--approval-id', 'APR-0003'))
                with patch.object(sys, 'argv', args), patch.object(ops, 'github_json') as api, patch.object(ops, 'ssh_request') as ssh, patch('sys.stderr', new_callable=io.StringIO):
                    self.assertEqual(ops.cli(), 2)
                api.assert_not_called()
                ssh.assert_not_called()
                self.assertFalse(receipt.exists())

    def test_status_uses_existing_evidence_without_rechecking_ci(self):
        with tempfile.TemporaryDirectory() as temp:
            receipt = Path(temp)/'receipt.json'
            req = dict(id='existing', host='test-host', controllerCommit='a'*40, candidateCommit=CANDIDATE,
                       kind='web-upgrade', releaseRoot='/opt/geosub/releases', ciCheck={'conclusion': 'success'})
            ops.private_create(receipt, req)
            args = [str(SCRIPT), 'status', '--receipt', str(receipt), '--identity', 'unused', '--known-hosts', 'unused']
            with patch.object(sys, 'argv', args), patch.object(ops, 'github_json') as api, patch.object(ops, 'ssh_request', return_value={'state': 'succeeded'}), patch('sys.stdout', new_callable=io.StringIO):
                self.assertEqual(ops.cli(), 0)
            api.assert_not_called()


class GitHubTransportTest(OfflineTest):
    def response(self, value, *, raw=None):
        response = MagicMock()
        response.status = 200
        response.read.return_value = json.dumps(value).encode() if raw is None else raw
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value = response
        return opener

    def test_optional_token_is_only_in_authorization_header(self):
        for token in ('', 'test_private_token_DO_NOT_LOG'):
            opener = self.response({'ok': True})
            with patch.dict(os.environ, {'GITHUB_TOKEN': token}), patch.object(ops, 'build_opener', return_value=opener):
                self.assertEqual(ops.github_json('/git/ref/heads/main'), {'ok': True})
            request = opener.open.call_args.args[0]
            self.assertEqual(request.full_url, 'https://api.github.com/repos/ngc233/geosub/git/ref/heads/main')
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + token if token else None)
            self.assertEqual(opener.open.call_args.kwargs['timeout'], 20)

    def test_http_errors_are_sanitized_and_only_5xx_are_unavailable(self):
        secret = 'test_private_token_DO_NOT_LOG'
        for code in (301, 401, 403, 404, 422, 429, 500, 502, 503, 599):
            error = ops.HTTPError('https://example.invalid/' + secret, code, secret, {}, io.BytesIO(secret.encode()))
            opener = MagicMock()
            opener.open.side_effect = error
            with patch.dict(os.environ, {'GITHUB_TOKEN': secret}), patch.object(ops, 'build_opener', return_value=opener):
                with self.assertRaises(ops.CIError) as caught:
                    ops.github_json('/actions/runs')
            self.assertEqual(isinstance(caught.exception, ops.CIUnavailable), code >= 500)
            self.assertNotIn(secret, str(caught.exception))
            self.assertIsNone(caught.exception.__cause__)

    def test_network_failure_classification_does_not_allow_tls_or_other_errors(self):
        cases = [(socket.gaierror('SECRET'), True), (TimeoutError('SECRET'), True),
                 (ConnectionRefusedError('SECRET'), True), (ConnectionResetError('SECRET'), True),
                 (OSError(errno.ENETUNREACH, 'SECRET'), True), (ssl.SSLCertVerificationError('SECRET'), False),
                 ('SECRET', False), (PermissionError('SECRET'), False)]
        for reason, unavailable in cases:
            opener = MagicMock()
            opener.open.side_effect = ops.URLError(reason)
            with patch.object(ops, 'build_opener', return_value=opener):
                with self.assertRaises(ops.CIError) as caught:
                    ops.github_json('/actions/runs')
            self.assertEqual(isinstance(caught.exception, ops.CIUnavailable), unavailable)
            self.assertNotIn('SECRET', str(caught.exception))

    def test_invalid_json_schema_oversize_and_redirect_fail_closed(self):
        for raw in (b'not-json SECRET', b'[]', b'x' * (4*1024*1024+1)):
            with patch.object(ops, 'build_opener', return_value=self.response(None, raw=raw)):
                with self.assertRaises(ops.CIError) as caught:
                    ops.github_json('/actions/runs')
            self.assertNotIsInstance(caught.exception, ops.CIUnavailable)
            self.assertNotIn('SECRET', str(caught.exception))
        self.assertIsNone(ops.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid'))

    def test_invalid_token_is_rejected_without_exposure_or_network(self):
        with patch.dict(os.environ, {'GITHUB_TOKEN': 'SECRET\nheader'}):
            with self.assertRaisesRegex(ops.CIError, 'Invalid GITHUB_TOKEN') as caught:
                ops.github_json('/actions/runs')
        self.assertNotIn('SECRET', str(caught.exception))
        self.network.assert_not_called()

    def test_http_and_network_failures_through_cli_preserve_bypass_boundary_and_secrets(self):
        secret = 'test_private_token_DO_NOT_LOG'
        for failure, expected in ((401, 2), (403, 2), (404, 2), (429, 2), (503, 3), ('network', 3), ('tls', 2)):
            fake = CIGateTest().fake_api()
            opener = MagicMock()
            def respond(request, **kwargs):
                self.assertEqual(request.get_header('Authorization'), 'Bearer ' + secret)
                path = request.full_url.split('/repos/ngc233/geosub', 1)[1]
                if path.startswith('/actions/runs?'):
                    if failure == 'network':
                        raise ops.URLError(socket.gaierror(secret))
                    if failure == 'tls':
                        raise ops.URLError(ssl.SSLCertVerificationError(secret))
                    raise ops.HTTPError(request.full_url, failure, secret, {}, io.BytesIO(secret.encode()))
                return self.response(fake(path)).open.return_value
            opener.open.side_effect = respond
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as temp:
                receipt = Path(temp)/'receipt.json'
                args = CIGateTest().cli_start(receipt, extra=('--allow-unverified-ci', '--approval-id', 'APR-0003'))
                with patch.object(sys, 'argv', args), patch.dict(os.environ, {'GITHUB_TOKEN': secret}), patch.object(ops, 'build_opener', return_value=opener), patch.object(ops, 'ssh_request', return_value={'state': 'running'}) as ssh, patch('sys.stdout', new_callable=io.StringIO) as out, patch('sys.stderr', new_callable=io.StringIO) as err:
                    self.assertEqual(ops.cli(), expected)
                self.assertEqual(ssh.call_count, 1 if expected == 3 else 0)
                self.assertEqual(receipt.exists(), expected == 3)
                evidence = receipt.read_text() if receipt.exists() else ''
                self.assertNotIn(secret, evidence + out.getvalue() + err.getvalue())
                if expected == 3:
                    self.assertTrue(json.loads(evidence)['ciCheck']['overrideUsed'])
                    self.assertIn('WARNING: UNVERIFIED CI EXCEPTION', err.getvalue())
                else:
                    self.assertIn('CI rejected', err.getvalue())

    def test_token_is_absent_from_success_receipt_and_all_cli_output(self):
        secret = 'test_private_token_DO_NOT_LOG'
        fake = CIGateTest().fake_api()
        opener = MagicMock()
        def respond(request, **kwargs):
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + secret)
            data = fake(request.full_url.split('/repos/ngc233/geosub', 1)[1])
            # Even reflected API fields must not get copied into the receipt.
            data['untrusted_text'] = secret
            return self.response(data).open.return_value
        opener.open.side_effect = respond
        with tempfile.TemporaryDirectory() as temp:
            receipt = Path(temp)/'receipt.json'
            with patch.object(sys, 'argv', CIGateTest().cli_start(receipt)), patch.dict(os.environ, {'GITHUB_TOKEN': secret}), patch.object(ops, 'build_opener', return_value=opener), patch.object(ops, 'ssh_request', return_value={'state': 'running'}), patch('sys.stdout', new_callable=io.StringIO) as out, patch('sys.stderr', new_callable=io.StringIO) as err:
                self.assertEqual(ops.cli(), 3)
            self.assertNotIn(secret, receipt.read_text() + out.getvalue() + err.getvalue())


if __name__ == '__main__': unittest.main()
