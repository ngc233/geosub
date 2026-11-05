"""Real systemd + local TLS acceptance on a disposable GitHub runner ONLY."""
import hashlib
import json
import os
import secrets
import shutil
import ssl
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / 'geosub-backend/deploy/linux-arm64'
TASKS = ['collector-jobs', 'db-backup', 'price-pipeline', 'exchange-rate-sync']
VARIABLES = ['GEOSUB_COLLECTOR_HEARTBEAT_URL', 'GEOSUB_BACKUP_HEARTBEAT_URL',
             'GEOSUB_PRICE_PIPELINE_HEARTBEAT_URL', 'GEOSUB_EXCHANGE_RATE_HEARTBEAT_URL']


def run(args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, timeout=60, **kwargs)
    if result.returncode:
        # These tests use synthetic inputs only; installer errors are already redacted.
        raise RuntimeError(str(args[0]) + ' failed: ' + result.stderr[-2000:])
    return result


@unittest.skipUnless(os.environ.get('GEOSUB_RUN_HEARTBEAT_SYSTEMD') == '1', 'explicit disposable Linux runner required')
class RealSystemd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if (os.geteuid() != 0 or os.environ.get('GITHUB_ACTIONS') != 'true'
                or not Path('/run/systemd/system').is_dir()):
            raise RuntimeError('Requires disposable GitHub Linux runner with real systemd and root')
        # Never run where a real GeoSub installation could exist.
        if any(Path(p).exists() for p in ['/opt/geosub', '/etc/geosub', '/var/lib/geosub']):
            raise RuntimeError('GeoSub paths already exist; refusing test environment')
        cls.units = [Path('/etc/systemd/system/geosub-' + t + '.service') for t in TASKS]
        if any(p.exists() or p.with_name(p.name + '.d').exists() for p in cls.units):
            raise RuntimeError('GeoSub units already exist; refusing test environment')
        cls.temp = tempfile.TemporaryDirectory(prefix='geosub-heartbeat-systemd-')
        cls.folder = Path(cls.temp.name)
        cls.folder.chmod(0o755)
        cls.addClassCleanup(cls.temp.cleanup)
        cls.hosts = Path('/etc/hosts').read_bytes()
        cls.addClassCleanup(lambda: Path('/etc/hosts').write_bytes(cls.hosts))
        cls.addClassCleanup(cls.cleanup_install)
        # Hosted runners may make /opt runner-writable for tool installation. The real
        # installer correctly refuses that. Secure this disposable VM's fixture parent,
        # then restore its metadata; never relax the production ownership check.
        opt = Path('/opt')
        opt_stat = opt.stat()
        def restore_opt():
            os.chown(opt, opt_stat.st_uid, opt_stat.st_gid)
            opt.chmod(stat.S_IMODE(opt_stat.st_mode))
        cls.addClassCleanup(restore_opt)
        os.chown(opt, 0, 0)
        opt.chmod(stat.S_IMODE(opt_stat.st_mode) & ~0o022)
        cls.tokens = {t: secrets.token_hex(16) for t in TASKS}
        cls.received = []
        cls.http_status = 200
        cls.key = cls.folder / 'key.pem'
        cls.cert = cls.folder / 'cert.pem'
        run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
             '-subj', '/CN=sm.hetrixtools.net', '-addext', 'subjectAltName=DNS:sm.hetrixtools.net',
             '-keyout', str(cls.key), '-out', str(cls.cert)])
        cls.cert.chmod(0o644)
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                for task, token in cls.tokens.items():
                    if self.path == '/hb/?s=' + token:
                        cls.received.append(task)
                self.send_response(cls.http_status)
                if cls.http_status == 302:
                    self.send_header('Location', 'https://example.invalid/never-follow')
                self.end_headers()
            def log_message(self, *args):
                pass
        cls.server = ThreadingHTTPServer(('127.0.0.1', 443), Handler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cls.cert, cls.key)
        cls.server.socket = context.wrap_socket(cls.server.socket, server_side=True)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.addClassCleanup(cls.server.server_close)
        cls.addClassCleanup(cls.server.shutdown)
        with Path('/etc/hosts').open('ab') as f:
            f.write(b'\n127.0.0.1 sm.hetrixtools.net\n')
        cls.envfile = Path('/etc/geosub/task-heartbeats.env')
        cls.envfile.parent.mkdir()
        cls.envbytes = ''.join(v + '=https://sm.hetrixtools.net/hb/?s=' + cls.tokens[t] + '\n'
                               for t, v in zip(TASKS, VARIABLES)).encode()
        cls.envfile.write_bytes(cls.envbytes)
        cls.envfile.chmod(0o600)
        cls.modefile = cls.folder / 'mode'
        cls.modefile.write_text('success')
        cls.modefile.chmod(0o644)
        shutil.copyfile(DEPLOY / 'db-backup-remote.py', cls.folder / 'remote.py')
        shutil.copyfile(ROOT / 'geosub-backend/scripts/sync-exchange-rates.ps1', cls.folder / 'sync.ps1')
        cls.fxrunner = cls.folder / 'fx-runner.ps1'
        cls.fxrunner.write_text('''param([string]$Script, [string]$Mode)
function global:docker { process { if ($_ -match 'RETURNING id') { '00000000-0000-0000-0000-000000000001' }; $global:LASTEXITCODE=0 } }
function global:Invoke-RestMethod {
  if ($Mode -eq 'fx-error') { throw 'synthetic source failure' }
  $rates = if ($Mode -eq 'partial') { @{ EUR=0.9 } } else { @{ EUR=0.9; JPY=150 } }
  return [pscustomobject]@{ date='2026-11-05'; rates=[pscustomobject]$rates }
}
& $Script -Provider open-er-api -QuoteCurrencies @('EUR','JPY') -DbName synthetic -DbUser synthetic
''')
        cls.runner = cls.folder / 'task.py'
        cls.runner.write_text('''import importlib.util,os,pathlib,subprocess,sys,tempfile
from unittest import mock
folder=pathlib.Path(__file__).parent
task=sys.argv[1];mode=(folder/'mode').read_text()
if mode=='fail':sys.exit(1)
if mode=='legacy':sys.exit(0)
if task=='db-backup':
 s=importlib.util.spec_from_file_location('remote',folder/'remote.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
 os.environ['GEOSUB_BACKUP_REMOTE_URL']='' if mode=='unconfigured-remote' else 's3://synthetic/backups'
 count=0
 def put(*args):
  global count
  count+=1
  if mode=='marker-failure' and count==4:raise m.BackupError('synthetic final readback failure')
 with tempfile.TemporaryDirectory() as d:
  p=pathlib.Path(d);stem='geosub_test_20980101T000000Z'
  for name in m.parts(stem):(p/name).write_bytes(b'synthetic')
  with mock.patch.object(m,'verify',return_value={'sha256':'a'*64}),mock.patch.object(m,'Store',return_value=mock.Mock(prefix='backups',put_verified=put)):
   m.upload(p/(stem+'.dump'))
elif task=='exchange-rate-sync':
 sys.exit(subprocess.run(['pwsh','-NoProfile','-File',str(folder/'fx-runner.ps1'),'-Script',str(folder/'sync.ps1'),'-Mode',mode]).returncode)
''')
        for unit, task in zip(cls.units, TASKS):
            unit.write_text(cls.base_unit(task))
        # A prior managed file may have a non-default group. Uninstall must restore
        # the bytes, mode AND ownership, not silently recreate it as root:root.
        cls.original_dropin = cls.units[1].with_name(cls.units[1].name + '.d') / '50-geosub-heartbeat.conf'
        cls.original_dropin.parent.mkdir()
        cls.original_dropin.write_bytes(b'[Service]\nNice=9\n')
        cls.original_dropin.chmod(0o640)
        os.chown(cls.original_dropin, 0, 65534)
        run(['systemctl', 'daemon-reload'])
        cls.commit = run(['git', '-c', 'safe.directory=' + str(ROOT), '-C', str(ROOT), 'rev-parse', 'HEAD']).stdout.strip()
        cls.helper_hash = hashlib.sha256((DEPLOY / 'task-heartbeat.py').read_bytes()).hexdigest()
        cls.install_cmd = ['python3', str(DEPLOY / 'install-task-heartbeats.py'), 'install', '--source', str(ROOT),
                           '--commit', cls.commit, '--helper-sha256', cls.helper_hash]
        cls.installed = run(cls.install_cmd).stdout

    @classmethod
    def base_unit(cls, task, version='initial'):
        user = '' if task == 'db-backup' else 'User=nobody\nGroup=nogroup\n'
        return ('[Unit]\nDescription=Synthetic heartbeat ' + version + '\nStartLimitIntervalSec=0\n'
                '[Service]\nType=oneshot\n' + user + 'ExecStart=/usr/bin/python3 ' + str(cls.runner) + ' ' + task + '\n'
                'ExecStartPost=/bin/true\nEnvironment=CURL_CA_BUNDLE=' + str(cls.cert) + '\nTimeoutStartSec=30s\n')

    @classmethod
    def cleanup_install(cls):
        for unit in cls.units:
            subprocess.run(['systemctl', 'stop', unit.name], capture_output=True)
            unit.unlink(missing_ok=True)
            shutil.rmtree(unit.with_name(unit.name + '.d'), ignore_errors=True)
        for p in ['/opt/geosub', '/etc/geosub', '/var/lib/geosub']:
            shutil.rmtree(p, ignore_errors=True)
        subprocess.run(['systemctl', 'daemon-reload'], capture_output=True)

    def start(self, task, mode, expect_success=True):
        self.modefile.write_text(mode)
        unit = 'geosub-' + task + '.service'
        subprocess.run(['systemctl', 'reset-failed', unit], capture_output=True)
        result = subprocess.run(['systemctl', 'start', unit], capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode == 0, expect_success)
        time.sleep(0.05)

    def test_01_four_successes_then_four_failures(self):
        before = len(self.received)
        for task in TASKS:
            self.start(task, 'success')
        self.assertEqual(self.received[before:], TASKS)
        before = len(self.received)
        for task in TASKS:
            self.start(task, 'fail', False)
        self.assertEqual(len(self.received), before)
        print('PASS real systemd: four successful tasks -> four distinct local TLS GETs; exit 1 -> zero GETs')

    def test_02_missing_remote_partial_fx_and_old_scripts_never_ping(self):
        before = len(self.received)
        self.start('db-backup', 'unconfigured-remote')
        self.start('db-backup', 'marker-failure', False)
        self.start('exchange-rate-sync', 'partial')
        self.start('exchange-rate-sync', 'fx-error', False)
        for task in ['db-backup', 'exchange-rate-sync']:
            self.start(task, 'legacy')
        self.assertEqual(len(self.received), before)
        print('PASS real runtime branches: unconfigured R2, marker/readback failure, partial FX and retained old scripts -> no heartbeat')

    def test_03_base_unit_upgrade_rollback_keeps_hooks_and_existing_post_command(self):
        expected = {p: p.read_bytes() for p in Path('/etc/systemd/system').glob('geosub-*.service.d/50-geosub-heartbeat.conf')}
        self.assertEqual(len(expected), 4)
        for version in ['new-release', 'retained-rollback']:
            for unit, task in zip(self.units, TASKS):
                unit.write_text(self.base_unit(task, version))
            run(['systemctl', 'daemon-reload'])
            for unit in self.units:
                post = run(['systemctl', 'show', unit.name, '-p', 'ExecStartPost', '--value']).stdout
                self.assertIn('/bin/true', post)
                self.assertIn(self.commit, post)
            before = len(self.received)
            for task in TASKS:
                self.start(task, 'success')
            self.assertEqual(self.received[before:], TASKS)
            for p, data in expected.items():
                self.assertEqual(p.read_bytes(), data)
        print('PASS real systemd reload after base-unit replacement and rollback: all four drop-ins preserved and effective')

    def test_04_missing_urls_and_http_failure_do_not_change_task_result_or_leak(self):
        self.envfile.write_bytes(b'')
        before = len(self.received)
        for task in TASKS:
            self.start(task, 'success')
        self.assertEqual(len(self.received), before)
        self.envfile.write_bytes(self.envbytes)
        type(self).http_status = 500
        self.start('collector-jobs', 'success')
        type(self).http_status = 302
        self.start('collector-jobs', 'success')
        type(self).http_status = 200
        log = run(['journalctl', '--no-pager', '-o', 'cat', *[x for task in TASKS for x in ['-u', 'geosub-' + task + '.service']]]).stdout
        for token in self.tokens.values():
            self.assertNotIn(token, log)
        self.assertNotIn('https://sm.hetrixtools.net', log)
        print('PASS safe failure: missing config, HTTP 500/302 preserve business status; no secret URL/token in journal')

    def test_05_idempotent_install_uninstall_and_restore(self):
        before = len(self.received)
        result = run(self.install_cmd).stdout
        self.assertIn('already verified', result)
        self.assertEqual(len(self.received), before)
        run(['python3', str(DEPLOY / 'install-task-heartbeats.py'), 'uninstall'])
        self.assertEqual(self.envfile.read_bytes(), self.envbytes)
        self.assertEqual(self.original_dropin.read_bytes(), b'[Service]\nNice=9\n')
        self.assertEqual(stat.S_IMODE(self.original_dropin.stat().st_mode), 0o640)
        self.assertEqual(self.original_dropin.stat().st_gid, 65534)
        for unit in self.units:
            post = run(['systemctl', 'show', unit.name, '-p', 'ExecStartPost', '--value']).stdout
            self.assertNotIn('task-heartbeat.py', post)
            self.assertIn('/bin/true', post)
        print('PASS install/uninstall: no job dispatched, prior unit hooks retained, credential file untouched')


if __name__ == '__main__':
    unittest.main()
