"""Behavior tests; all transports are doubles, no real credentials or network."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, Mock

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / 'geosub-backend/deploy/linux-arm64'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


hb = load('heartbeat', DEPLOY / 'task-heartbeat.py')
installer = load('installer', DEPLOY / 'install-task-heartbeats.py')
remote = load('remote', DEPLOY / 'db-backup-remote.py')


class Heartbeats(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.environ = {key: 'https://sm.hetrixtools.net/hb/?s=' + str(i) * 32
                        for i, key in enumerate(hb.VARIABLES.values(), 1)}
        self.transport = Mock(return_value=subprocess.CompletedProcess([], 0, '200', ''))
        self.patches = contextlib.ExitStack()
        self.addCleanup(self.patches.close)
        self.patches.enter_context(patch.object(hb, 'RUNTIME', self.root))
        self.patches.enter_context(patch.dict(os.environ, self.environ, clear=True))
        self.patches.enter_context(patch.object(hb.subprocess, 'run', self.transport))
        self.logs = io.StringIO()
        self.patches.enter_context(contextlib.redirect_stdout(self.logs))
        self.patches.enter_context(contextlib.redirect_stderr(self.logs))
        for task in hb.VARIABLES:
            (self.root / ('geosub-heartbeat-' + task)).mkdir(mode=0o700)

    def task(self, name, run='a' * 32):
        os.environ.update(GEOSUB_TASK_HEARTBEAT_TASK=name, INVOCATION_ID=run)
        return name

    def call(self, task):
        with patch.object(sys, 'argv', ['heartbeat', 'send', task]):
            self.assertEqual(hb.main(), 0)

    def test_four_successes_are_distinct_and_once_per_invocation(self):
        for task in hb.VARIABLES:
            self.task(task)
            if task in hb.PROOFS:
                hb.record(task)
            self.call(task)
            self.call(task)
        self.assertEqual(self.transport.call_count, 4)
        urls = [call.kwargs['input'] for call in self.transport.call_args_list]
        self.assertEqual(len(set(urls)), 4)
        for call in self.transport.call_args_list:
            self.assertNotIn('/hb/', str(call.args))
            self.assertIn('--disable', call.args[0])
            self.assertIn('--max-time', call.args[0])
            self.assertNotIn('--location', call.args[0])
            self.assertEqual(call.kwargs['timeout'], 12)
        for url in self.environ.values():
            self.assertNotIn(url, self.logs.getvalue())

    def test_unconfigured_is_no_request(self):
        for task, variable in hb.VARIABLES.items():
            self.task(task)
            os.environ[variable] = ''
            self.call(task)
        self.transport.assert_not_called()
        self.assertIn('not active', self.logs.getvalue())

    def test_missing_or_stale_proof_blocks_backup_and_partial_fx(self):
        for task in hb.PROOFS:
            self.task(task)
            self.call(task)
            hb.record(task)
            self.task(task, 'b' * 32)
            self.call(task)
        self.transport.assert_not_called()

    def test_corrupt_future_old_or_wrong_task_receipts_are_not_success(self):
        task = self.task('db-backup')
        hb.record(task)
        file = hb.runtime(task) / 'success.json'
        original = json.loads(file.read_text())
        for change in [{'task': 'exchange-rate-sync'}, {'proof': 'local-only'},
                       {'completed_at': 0}, {'completed_at': float('inf')}, {'invocation': 'c' * 32}]:
            file.write_text(json.dumps({**original, **change}))
            self.call(task)
        file.write_text('not json')
        self.call(task)
        self.transport.assert_not_called()

    def test_symlink_receipt_and_world_readable_receipt_refused(self):
        task = self.task('db-backup')
        hb.record(task)
        file = hb.runtime(task) / 'success.json'
        file.chmod(0o644)
        self.call(task)
        file.rename(file.with_suffix('.old'))
        file.symlink_to(file.with_suffix('.old'))
        self.call(task)
        self.transport.assert_not_called()

    def test_no_invocation_and_duplicate_endpoints_refused(self):
        task = self.task('collector-jobs')
        os.environ['INVOCATION_ID'] = ''
        self.call(task)
        self.task(task)
        os.environ['GEOSUB_BACKUP_HEARTBEAT_URL'] = os.environ['GEOSUB_COLLECTOR_HEARTBEAT_URL']
        self.call(task)
        self.transport.assert_not_called()

    def test_bad_endpoint_values_are_redacted_and_never_requested(self):
        task = self.task('collector-jobs')
        for url in ['http://sm.hetrixtools.net/hb/?s=' + 'x' * 32,
                    'https://evil.example/hb/?s=' + 'x' * 32,
                    'https://sm.hetrixtools.net/hb/?s=' + 'x' * 32 + '\nverbose',
                    'https://sm.hetrixtools.net:443/hb/?s=' + 'x' * 32,
                    'https://sm.hetrixtools.net/hb/?s=' + 'x' * 32 + '&secret=exposed']:
            os.environ['GEOSUB_COLLECTOR_HEARTBEAT_URL'] = url
            self.call(task)
            self.assertNotIn(url, self.logs.getvalue())
        self.transport.assert_not_called()

    def test_http_redirect_error_and_unknown_transport_never_retry_or_fail_business(self):
        task = self.task('collector-jobs')
        cases = [subprocess.CompletedProcess([], 0, '302', 'secret'),
                 subprocess.CompletedProcess([], 22, '500', 'secret'),
                 subprocess.CompletedProcess([], 60, '000', 'secret'),
                 subprocess.TimeoutExpired(['curl'], 12, output='secret')]
        for i, result in enumerate(cases):
            self.task(task, str(i) * 32)
            self.transport.side_effect = result if isinstance(result, Exception) else None
            self.transport.return_value = result
            self.call(task)
            self.call(task)
        self.assertEqual(self.transport.call_count, 4)
        self.assertNotIn('secret', self.logs.getvalue())
        self.assertNotIn('accepted', self.logs.getvalue())

    def test_runtime_is_bounded_between_invocations(self):
        task = self.task('collector-jobs')
        for i in range(20):
            self.task(task, format(i, '032x'))
            self.call(task)
        self.assertEqual([p.name for p in hb.runtime(task).iterdir()], ['attempt'])


class UploadProof(unittest.TestCase):
    def test_only_all_four_verified_members_can_record_success(self):
        with tempfile.TemporaryDirectory() as name, patch.dict(os.environ, {'GEOSUB_BACKUP_REMOTE_URL': 's3://fake/backups'}):
            folder = Path(name)
            stem = 'geosub_test_20980101T000000Z'
            for item in remote.parts(stem):
                (folder / item).write_bytes(b'synthetic')
            for fail_at in [0, 1, 2, 3, None]:
                calls = []
                def put(key, *args):
                    calls.append(key)
                    if len(calls) - 1 == fail_at:
                        raise remote.BackupError('synthetic readback failure')
                store = Mock(prefix='backups', put_verified=put)
                with patch.object(remote, 'Store', return_value=store), patch.object(remote, 'verify', return_value={'sha256': 'a' * 64}), patch.object(remote, 'record_uploaded_backup') as record:
                    if fail_at is None:
                        remote.upload(folder / (stem + '.dump'))
                        record.assert_called_once_with()
                    else:
                        with self.assertRaises(remote.BackupError):
                            remote.upload(folder / (stem + '.dump'))
                        record.assert_not_called()
                    self.assertEqual([Path(x).name for x in calls], remote.parts(stem)[:len(calls)])

    def test_no_remote_is_not_remote_success(self):
        with patch.dict(os.environ, {'GEOSUB_BACKUP_REMOTE_URL': ''}), patch.object(remote, 'record_uploaded_backup') as record:
            remote.upload(Path('/unused.dump'))
            record.assert_not_called()

    def test_receipt_helper_failure_does_not_erase_verified_upload(self):
        helper = '/opt/geosub/task-heartbeats/' + 'a' * 40 + '/task-heartbeat.py'
        with patch.dict(os.environ, {'GEOSUB_TASK_HEARTBEAT_HELPER': helper, 'GEOSUB_TASK_HEARTBEAT_TASK': 'db-backup'}), patch.object(remote.subprocess, 'run', side_effect=OSError('secret')):
            log = io.StringIO()
            with contextlib.redirect_stderr(log):
                remote.record_uploaded_backup()
            self.assertNotIn('secret', log.getvalue())
            self.assertIn('remains verified', log.getvalue())


class Installation(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.root = self.base / 'root'
        self.root.mkdir()
        self.source = self.base / 'source'
        self.source.mkdir()
        for task in installer.TASKS:
            file = self.root / ('etc/systemd/system/geosub-' + task + '.service')
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('[Service]\nType=oneshot\nExecStart=/bin/true\n')
        self.envfile = self.root / installer.ENV
        self.envfile.parent.mkdir(parents=True, exist_ok=True)
        self.envfile.write_text('OWNER_SECRET=synthetic-never-read\n')
        self.envfile.chmod(0o600)
        deploy = self.source / installer.DEPLOY
        deploy.mkdir(parents=True)
        for name in ['install-task-heartbeats.py', 'task-heartbeat.py']:
            shutil.copyfile(DEPLOY / name, deploy / name)
        self.git('init', '-q')
        self.git('add', '.')
        self.git('-c', 'user.name=fixture', '-c', 'user.email=fixture@invalid.example', 'commit', '-qm', 'fixture')
        self.commit = self.git('rev-parse', 'HEAD').strip()
        self.expected = hashlib.sha256((DEPLOY / 'task-heartbeat.py').read_bytes()).hexdigest()
        self.logs = io.StringIO()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.source), *args], text=True)

    def invoke(self, action='install', **changes):
        args = ['installer', action, '--root', str(self.root), '--source', str(self.source),
                '--commit', changes.get('commit', self.commit), '--helper-sha256', changes.get('expected', self.expected)]
        with patch.object(sys, 'argv', args), contextlib.redirect_stdout(self.logs), contextlib.redirect_stderr(self.logs):
            return installer.main()

    def drop(self, task='db-backup'):
        return self.root / ('etc/systemd/system/geosub-' + task + '.service.d/50-geosub-heartbeat.conf')

    def test_install_repeat_verify_and_uninstall_restore_originals(self):
        prior = b'# original owner setting\n[Service]\nNice=9\n'
        self.drop().parent.mkdir()
        self.drop().write_bytes(prior)
        unrelated = self.drop().with_name('80-owner.conf')
        unrelated.write_text('[Service]\nNice=8\n')
        self.assertEqual(self.invoke(), 0)
        state = self.root / installer.STATE / 'installation.json'
        first = state.read_bytes()
        self.assertEqual(self.invoke(), 0)
        self.assertEqual(state.read_bytes(), first)
        for task in installer.TASKS:
            text = self.drop(task).read_text()
            self.assertIn(self.commit, text)
            self.assertNotIn('\nExecStart=', text)
            self.assertNotIn('OnFailure', text)
        self.assertNotIn('synthetic-never-read', self.logs.getvalue())
        self.assertEqual(self.invoke('uninstall'), 0)
        self.assertEqual(self.drop().read_bytes(), prior)
        self.assertTrue(unrelated.exists())
        self.assertEqual(self.envfile.read_text(), 'OWNER_SECRET=synthetic-never-read\n')
        self.assertEqual(self.invoke('uninstall'), 0)

    def test_wrong_hash_commit_and_modified_installer_refused(self):
        self.assertEqual(self.invoke(expected='f' * 64), 1)
        self.assertEqual(self.invoke(commit='f' * 40), 1)
        self.assertEqual(self.invoke(commit='main'), 1)
        self.assertFalse(self.drop().exists())
        (self.source / installer.DEPLOY / 'install-task-heartbeats.py').write_text('# altered')
        self.git('add', '.')
        self.git('-c', 'user.name=fixture', '-c', 'user.email=fixture@invalid.example', 'commit', '-qm', 'modified')
        self.assertEqual(self.invoke(commit=self.git('rev-parse', 'HEAD').strip()), 1)

    def test_changed_managed_file_refuses_install_and_uninstall(self):
        self.assertEqual(self.invoke(), 0)
        self.drop().write_text('owner changed it')
        self.assertEqual(self.invoke(), 1)
        self.assertEqual(self.invoke('uninstall'), 1)
        self.assertEqual(self.drop().read_text(), 'owner changed it')

    def test_symlink_destination_and_loose_credentials_refused(self):
        self.drop().parent.mkdir()
        target = self.base / 'untouched'
        target.write_text('sentinel')
        self.drop().symlink_to(target)
        self.assertEqual(self.invoke(), 1)
        self.assertEqual(target.read_text(), 'sentinel')
        self.drop().unlink()
        self.envfile.chmod(0o644)
        self.assertEqual(self.invoke(), 1)
        self.assertFalse(self.drop().exists())

    def test_failed_reload_restores_previous_files(self):
        with patch.object(installer, 'reload', side_effect=[installer.InstallError('test reload failed'), None]):
            self.assertEqual(self.invoke(), 1)
        self.assertFalse(self.drop().exists())
        self.assertFalse((self.root / installer.STATE / 'installation.json').exists())
        self.assertFalse((self.root / installer.STATE / 'transaction.json').exists())

    def test_interrupted_install_blocks_retry_then_explicit_recovery(self):
        original = installer.write
        count = 0
        def interrupt(path, value):
            nonlocal count
            original(path, value)
            count += 1
            if count == 3:
                raise KeyboardInterrupt()
        with patch.object(installer, 'write', side_effect=interrupt):
            with self.assertRaises(KeyboardInterrupt):
                self.invoke()
        self.assertEqual(self.invoke(), 1)
        self.assertEqual(self.invoke('recover'), 0)
        self.assertFalse(self.drop().exists())
        self.assertEqual(self.invoke(), 0)


if __name__ == '__main__':
    unittest.main()
