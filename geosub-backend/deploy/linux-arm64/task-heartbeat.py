#!/usr/bin/env python3
"""Optional completion heartbeats; no database dependency and no URL in output."""
import argparse
import fcntl
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path

VARIABLES = {
    "collector-jobs": "GEOSUB_COLLECTOR_HEARTBEAT_URL",
    "db-backup": "GEOSUB_BACKUP_HEARTBEAT_URL",
    "price-pipeline": "GEOSUB_PRICE_PIPELINE_HEARTBEAT_URL",
    "exchange-rate-sync": "GEOSUB_EXCHANGE_RATE_HEARTBEAT_URL",
}
PROOFS = {"db-backup": "remote-four-members-verified",
          "exchange-rate-sync": "all-quotes-succeeded"}
RUNTIME = Path("/run")


class HeartbeatError(Exception):
    pass


def warn(task, message):
    # Never interpolate exceptions: urllib/OSError can include secret URLs or paths.
    print("WARNING heartbeat " + task + ": " + message, file=sys.stderr)


def invocation(task):
    value = os.environ.get("INVOCATION_ID", "")
    if os.environ.get("GEOSUB_TASK_HEARTBEAT_TASK") != task or not re.fullmatch("[a-f0-9]{32}", value):
        raise HeartbeatError("missing invocation")
    return value


def runtime(task):
    folder = RUNTIME / ("geosub-heartbeat-" + task)
    st = folder.lstat()
    if not stat.S_ISDIR(st.st_mode) or st.st_uid != os.geteuid() or st.st_mode & 0o077:
        raise HeartbeatError("unsafe runtime directory")
    return folder


def record(task):
    """Called by the real success branch, before the main process exits."""
    if task not in PROOFS:
        raise HeartbeatError("no receipt protocol for task")
    value = {"schema": 1, "task": task, "invocation": invocation(task),
             "proof": PROOFS[task], "completed_at": time.time()}
    folder = runtime(task)
    fd, name = tempfile.mkstemp(prefix=".receipt-", dir=folder)
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(value, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, folder / "success.json")
    finally:
        Path(name).unlink(missing_ok=True)


def require_receipt(task, folder, run):
    file = folder / "success.json"
    fd = os.open(file, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd) as f:
        st = os.fstat(f.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_uid != os.geteuid() or st.st_mode & 0o077 or st.st_size > 2048:
            raise HeartbeatError("unsafe receipt")
        data = json.load(f)
    if (data.get("schema") != 1 or data.get("task") != task or data.get("invocation") != run
            or data.get("proof") != PROOFS[task]
            or not isinstance(data.get("completed_at"), (int, float))
            or not 0 <= time.time() - data["completed_at"] <= 3600):
        raise HeartbeatError("receipt does not prove this run")


def validate_url(url):
    if not re.fullmatch(r"https://sm\.hetrixtools\.net/hb/\?s=[A-Za-z0-9_-]{16,256}", url):
        raise HeartbeatError("invalid endpoint")
    return url


def claim(folder, run):
    fd = os.open(folder / "attempt", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600)
    with os.fdopen(fd, "r+") as f:
        st = os.fstat(f.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_uid != os.geteuid() or st.st_mode & 0o077 or st.st_size > 64:
            raise HeartbeatError("unsafe attempt record")
        fcntl.flock(f, fcntl.LOCK_EX)
        if f.read() == run:
            return False
        f.seek(0)
        f.truncate()
        f.write(run)
        f.flush()
        os.fsync(f.fileno())
    return True


def send(task):
    value = os.environ.get(VARIABLES[task], "")
    if not value:
        warn(task, "not configured; monitoring is not active")
        return
    url = validate_url(value)
    if sum(os.environ.get(key) == url for key in VARIABLES.values()) != 1:
        raise HeartbeatError("tasks must use distinct endpoints")
    run = invocation(task)
    folder = runtime(task)
    if task in PROOFS:
        require_receipt(task, folder, run)
    # Claim BEFORE the request: a transport timeout is unknown, never redispatch.
    if not claim(folder, run):
        warn(task, "already attempted for this invocation; not resending")
        return
    # Secret URL travels through stdin, never argv. Disable curlrc, proxies, redirects,
    # retries and response body/logging. Total process bound also covers DNS stalls.
    config = ('url = "' + url + '"\nuser-agent = "GeoSub-Task-Heartbeat/1.0"\n')
    result = subprocess.run(["curl", "--disable", "--silent", "--config", "-", "--proxy", "",
                             "--proto", "=https", "--connect-timeout", "5", "--max-time", "10",
                             "--retry", "0", "--output", "/dev/null", "--write-out", "%{http_code}"],
                            input=config, text=True, capture_output=True, timeout=12)
    if result.returncode or not re.fullmatch("2[0-9]{2}", result.stdout):
        raise HeartbeatError("HTTP request failed")
    print("Heartbeat accepted: " + task + " at " + time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("record", "send"))
    parser.add_argument("task", choices=VARIABLES)
    args = parser.parse_args()
    try:
        (record if args.action == "record" else send)(args.task)
    except Exception:
        warn(args.task, "completion proof or delivery failed; no successful heartbeat confirmed")
    # Observability failures must not rewrite an otherwise successful task result.
    return 0


if __name__ == "__main__":
    sys.exit(main())
