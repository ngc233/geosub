#!/usr/bin/env python3
"""Operator-side release transport and bounded read-only probes (Python 3.10+)."""
import argparse
import base64
import concurrent.futures
import datetime
import ipaddress
import json
import os
from pathlib import Path
import platform
import re
import shlex
import subprocess
import tempfile
import time
from contextlib import contextmanager
from urllib.parse import urlsplit
import uuid


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


@contextmanager
def awake(seconds):
    child = None
    if platform.system() == 'Darwin':
        child = subprocess.Popen(['/usr/bin/caffeinate', '-i', '-w', str(os.getpid()), '-t', str(seconds)])
    try:
        yield
    finally:
        if child and child.poll() is None:
            child.terminate()
            child.wait(timeout=5)


def private_create(path, value):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as out:
        json.dump(value, out, indent=2)
        out.write('\n')


def validate_request(req):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,55}', req['id']):
        raise ValueError('Invalid request ID')
    if not re.fullmatch(r'[a-f0-9]{40}', req['controllerCommit']):
        raise ValueError('A full controller commit is required')
    root = req['releaseRoot']
    if not re.fullmatch(r'/[A-Za-z0-9_./-]+', root) or '..' in root.split('/') or root.endswith('/'):
        raise ValueError('Invalid release root')
    if req['kind'] not in ('web-upgrade', 'collector-upgrade', 'web-rollback', 'collector-rollback'):
        raise ValueError('Unknown release operation')
    if req['kind'].endswith('rollback') and not re.fullmatch(r'[0-9TZ-]+', req.get('attempt', '')):
        raise ValueError('Rollback requires an exact native attempt ID')
    if req['kind'] == 'collector-upgrade' and not re.fullmatch(r'[a-f0-9]{40}', req.get('candidateCommit', '')):
        raise ValueError('Collector upgrade requires a full candidate commit')


# Executed by systemd, never by the SSH session. Completion is durable even if
# the transient unit has been garbage-collected. The native controller owns all
# deployment locks, migration checks, health checks and rollback semantics.
RUNNER = r'''
import datetime,json,os,subprocess,sys
p=json.loads(sys.argv[1]);code=125
try:
 code=subprocess.run(p['argv'],env={**os.environ,'GEOSUB_RELEASE_DIR':p['root']}).returncode
finally:
 result={'state':'succeeded' if code==0 else 'failed','exitCode':code,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 tmp=p['completion']+'.pending'
 with open(tmp,'x') as f:json.dump(result,f)
 os.chmod(tmp,0o600);os.replace(tmp,p['completion'])
sys.exit(0 if code==0 else 1)
'''


def release_argv(req):
    controller = req['releaseRoot'] + '/controllers/' + req['controllerCommit']
    if req['kind'] == 'web-upgrade':
        return ['/bin/bash', controller + '/upgrade.sh']
    if req['kind'] == 'collector-upgrade':
        return ['/bin/bash', controller + '/collector-release.sh', 'upgrade', '--commit', req['candidateCommit']]
    script = '/rollback.sh' if req['kind'] == 'web-rollback' else '/collector-release.sh'
    return ['/bin/bash', controller + script] + ([] if req['kind'] == 'web-rollback' else ['rollback']) + ['--attempt', req['attempt'], '--confirm', req['attempt']]


def server_request(action, req):
    """Root-only, idempotent dispatch; status is strictly read-only."""
    validate_request(req)
    if os.geteuid() != 0:
        raise ValueError('Release transport requires root; no implicit sudo')
    root = Path(req['releaseRoot']).resolve()
    folder = root / 'operator-requests' / req['id']
    unit = 'geosub-op-' + req['id']
    if action == 'start' and not folder.exists():
        control = root / 'controllers' / req['controllerCommit']
        if (root / 'control').resolve() != control or not control.is_dir():
            raise ValueError('Install and verify the exact controller before dispatch')
        for path in (root, control, Path(release_argv(req)[1])):
            stat = path.stat()
            if stat.st_uid != 0 or stat.st_mode & 0o022:
                raise ValueError('Controller paths must be root-owned and not group/world writable')
        folder.parent.mkdir(mode=0o700, exist_ok=True)
        # mkdir is the reservation. If dispatch outcome is unknown, never launch
        # the same request again; inspect it with status instead.
        try:
            folder.mkdir(mode=0o700)
        except FileExistsError:
            return server_request('status', req)
        private_create(folder / 'request.json', req)
        payload = {'argv': release_argv(req), 'root': str(root), 'completion': str(folder / 'completion.json')}
        command = ['systemd-run', '--unit=' + unit, '--property=RuntimeMaxSec=20min',
                   '--property=CPUQuota=200%', '--property=MemoryMax=3500M',
                   '--property=IOWeight=20', '--property=Nice=10',
                   '/usr/bin/python3', '-c', RUNNER, json.dumps(payload)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        private_create(folder / 'dispatch.json', {'exitCode': result.returncode, 'at': utc()})
    if not (folder / 'request.json').exists():
        return {'state': 'unknown', 'id': req['id'], 'unit': unit, 'retryAllowed': False}
    if json.loads((folder / 'request.json').read_text()) != req:
        raise ValueError('Request ID belongs to different parameters')
    if (folder / 'completion.json').exists():
        return {**json.loads((folder / 'completion.json').read_text()), 'id': req['id'], 'unit': unit}
    result = subprocess.run(['systemctl', 'show', unit, '--property=ActiveState,SubState,Result,ExecMainStatus'], capture_output=True, text=True, timeout=10)
    props = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    # A missing completion is never successful, including systemd timeouts and
    # crashes between reservation and dispatch. No automatic redispatch.
    state = 'running' if props.get('ActiveState') in ('active', 'activating') else 'unknown'
    return {'state': state, 'id': req['id'], 'unit': unit, 'systemd': props, 'retryAllowed': False}


def ssh_request(args, action, req):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.@:-]*', args.host):
        raise ValueError('Invalid SSH host/alias')
    for file in (args.identity, args.known_hosts):
        if not Path(file).is_file():
            raise ValueError('SSH identity and pinned known_hosts files are required')
    # Send the repository tool itself to Python; no copy into a serving checkout.
    source = Path(__file__).read_text()
    payload = base64.b64encode(json.dumps(req).encode()).decode()
    remote = shlex.join(['python3', '-c', source, '_server', action, payload])
    command = ['ssh', '-i', args.identity, '-o', 'UserKnownHostsFile=' + args.known_hosts,
               '-o', 'StrictHostKeyChecking=yes', '-o', 'BatchMode=yes',
               '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=10',
               '-o', 'ServerAliveCountMax=2', args.host, remote]
    with awake(75):
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError('SSH failed; deployment state is UNKNOWN. Query this receipt with status; do not resend start.')
    return json.loads(result.stdout)


def failure_stage(data, exit_code):
    if exit_code == 0:
        return None if data.get('http_code') == 200 else 'http'
    if exit_code == 6:
        return 'dns'
    if not data.get('time_connect'):
        return 'connect'
    if not data.get('time_appconnect') and str(data.get('url_effective', '')).startswith('https:'):
        return 'tls'
    return 'body' if data.get('time_starttransfer') else 'first-byte'


def probe(site, path, observer, resolve=None):
    started, mono = time.time(), time.monotonic()
    sample = uuid.uuid4().hex
    row = {'type': 'sample', 'at': utc(), 'sampleId': sample, 'observer': observer, 'url': site + path}
    with tempfile.TemporaryDirectory(prefix='geosub-probe-') as temp:
        body, headers = Path(temp) / 'body', Path(temp) / 'headers'
        command = ['curl', '--silent', '--show-error', '--compressed', '--connect-timeout', '8',
                   '--max-time', '15', '--max-filesize', '2097152', '--output', str(body),
                   '--dump-header', str(headers), '--write-out', '%{json}',
                   '--user-agent', 'GeoSubProbe/' + sample]
        if resolve:
            command += ['--resolve', urlsplit(site).hostname + ':443:' + resolve]
        try:
            result = subprocess.run(command + [site + path], capture_output=True, text=True, timeout=20)
            data = json.loads(result.stdout or '{}')
            row['curlExit'] = result.returncode
            row['failedStage'] = failure_stage(data, result.returncode)
            keys = ('http_code', 'remote_ip', 'http_version', 'size_download', 'time_namelookup',
                    'time_connect', 'time_appconnect', 'time_starttransfer', 'time_total')
            row['metrics'] = {key: data.get(key) for key in keys}
            # Only public diagnostic headers; never log bodies, cookies or auth.
            allowed = {'cf-ray', 'cf-cache-status', 'x-geosub-release', 'content-encoding'}
            row['headers'] = {}
            if headers.exists():
                for line in headers.read_text(errors='replace').splitlines():
                    key, sep, value = line.partition(':')
                    if sep and key.lower() in allowed:
                        row['headers'][key.lower()] = value.strip()[:200]
            row['error'] = re.sub(r'://[^\s/@]+:[^\s/@]+@', '://[redacted]@', result.stderr.strip())[:500]
            row['ok'] = result.returncode == 0 and data.get('http_code') == 200
            if row['ok']:
                content = body.read_bytes()
                valid = json.loads(content).get('status') == 'ok' if path == '/api/health' else b'<html' in content.lower()
                if not valid:
                    row.update(ok=False, failedStage='content')
        except (subprocess.TimeoutExpired, OSError, ValueError) as exc:
            row.update(ok=False, failedStage='observer' if isinstance(exc, OSError) else 'response', error=type(exc).__name__)
    row.update(finishedAt=utc(), elapsedMs=round((time.monotonic() - mono) * 1000), wallMs=round((time.time() - started) * 1000))
    return row


def observe(args):
    parsed = urlsplit(args.site)
    if parsed.scheme not in ('https', 'http') or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
        raise ValueError('Site must be a public origin without credentials, path or query')
    if parsed.scheme != 'https' and parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise ValueError('Non-local probes require HTTPS')
    if not 15 <= args.duration <= 1800 or not 15 <= args.interval <= 300:
        raise ValueError('Duration 15..1800 seconds; interval 15..300 seconds')
    if args.resolve:
        ipaddress.ip_address(args.resolve)
        if parsed.scheme != 'https' or parsed.port not in (None, 443):
            raise ValueError('Origin resolve requires HTTPS port 443')
    site = args.site.rstrip('/')
    count = failures = 0
    with awake(args.duration + 60), os.fdopen(os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as out:
        def emit(row):
            out.write(json.dumps(row) + '\n')
            out.flush()
        emit({'type': 'start', 'at': utc(), 'observer': args.observer, 'site': site, 'duration': args.duration, 'interval': args.interval, 'platform': platform.system(), 'resolve': args.resolve, 'idleSleepGuard': platform.system() == 'Darwin'})
        end = time.monotonic() + args.duration
        previous = None
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            while time.monotonic() < end:
                cycle = time.time()
                gap = cycle - previous if previous else None
                previous = cycle
                tasks = [pool.submit(probe, site, path, args.observer, args.resolve) for path in ('/api/health', '/zh', '/en/ai-pricing/chatgpt/plus')]
                for task in tasks:
                    row = task.result()
                    row.update(cycleGapMs=round(gap * 1000) if gap is not None else None, observerGap=gap is not None and gap > args.interval + 25)
                    emit(row)
                    count += 1
                    failures += not row['ok']
                time.sleep(max(0, min(args.interval - (time.time() - cycle), end - time.monotonic())))
        summary = {'type': 'complete', 'at': utc(), 'samples': count, 'failures': failures}
        emit(summary)
    print(json.dumps(summary))
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('start', 'status'):
        p = sub.add_parser(name)
        p.add_argument('--receipt', required=True)
        p.add_argument('--identity', required=True)
        p.add_argument('--known-hosts', required=True)
        if name == 'start':
            p.add_argument('--host', required=True)
            p.add_argument('--controller-commit', required=True)
            p.add_argument('--kind', choices=['web-upgrade', 'collector-upgrade', 'web-rollback', 'collector-rollback'], required=True)
            p.add_argument('--candidate-commit')
            p.add_argument('--attempt')
            p.add_argument('--release-root', default='/opt/geosub/releases')
    p = sub.add_parser('observe')
    p.add_argument('--site', default='https://geosub.org')
    p.add_argument('--observer', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--duration', type=int, default=300)
    p.add_argument('--interval', type=int, default=30)
    p.add_argument('--resolve')
    p = sub.add_parser('_server', help=argparse.SUPPRESS)
    p.add_argument('action', choices=['start', 'status'])
    p.add_argument('payload')
    args = parser.parse_args()
    if args.command == 'observe':
        return observe(args)
    if args.command == '_server':
        print(json.dumps(server_request(args.action, json.loads(base64.b64decode(args.payload)))))
        return 0
    if args.command == 'start':
        req = {'id': uuid.uuid4().hex, 'host': args.host, 'controllerCommit': args.controller_commit,
               'kind': args.kind, 'candidateCommit': args.candidate_commit, 'attempt': args.attempt,
               'releaseRoot': args.release_root, 'createdAt': utc()}
        validate_request(req)
        private_create(args.receipt, req)
    else:
        req = json.loads(Path(args.receipt).read_text())
        validate_request(req)
        args.host = req['host']
    result = ssh_request(args, args.command, req)
    print(json.dumps(result))
    # 3 means submitted/running/unknown, NOT deployment success.
    return 0 if result['state'] == 'succeeded' else 1 if result['state'] == 'failed' else 3


if __name__ == '__main__':
    import sys
    try:
        sys.exit(main())
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
