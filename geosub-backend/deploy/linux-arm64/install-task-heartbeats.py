#!/usr/bin/env python3
"""Explicit, transactional installation of four completion drop-ins; never starts tasks."""
import argparse
import base64
import fcntl
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path

TASKS = ("collector-jobs", "db-backup", "price-pipeline", "exchange-rate-sync")
DEPLOY = "geosub-backend/deploy/linux-arm64/"
STATE = "var/lib/geosub/task-heartbeats"
ENV = "etc/geosub/task-heartbeats.env"


def digest(value):
    return hashlib.sha256(value).hexdigest()


class InstallError(Exception):
    pass


def checked_path(root, relative, parents=False):
    path = root / relative
    if path == root or not path.is_relative_to(root) or ".." in Path(relative).parts:
        raise InstallError("Unsafe installation path")
    for parent in list(path.parents)[::-1]:
        if parent == root or not parent.is_relative_to(root):
            continue
        if not parent.exists() and parents:
            parent.mkdir(mode=0o755)
        if parent.is_symlink() or not parent.is_dir():
            raise InstallError("Unsafe parent directory")
        st = parent.stat()
        if st.st_uid != os.geteuid() or st.st_mode & 0o022:
            raise InstallError("Parent directory must be owner-controlled")
    if path.is_symlink():
        raise InstallError("Refusing managed symlink")
    return path


def snapshot(path):
    if not path.exists():
        return None
    st = path.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_uid != os.geteuid() or st.st_mode & 0o022:
        raise InstallError("Managed file must be an owner-controlled regular file")
    return {"data": base64.b64encode(path.read_bytes()).decode(), "mode": stat.S_IMODE(st.st_mode),
            "uid": st.st_uid, "gid": st.st_gid}


def content(data, mode):
    return {"data": base64.b64encode(data).decode(), "mode": mode,
            "uid": os.geteuid(), "gid": os.getegid()}


def write(path, value):
    if value is None:
        path.unlink(missing_ok=True)
        return
    fd, temporary = tempfile.mkstemp(prefix=".heartbeat-install-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(base64.b64decode(value["data"], validate=True))
            os.fchown(f.fileno(), value["uid"], value["gid"])
            os.fchmod(f.fileno(), value["mode"])
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def json_value(value):
    return content((json.dumps(value, indent=2) + "\n").encode(), 0o600)


def dropin(task, commit):
    helper = "/opt/geosub/task-heartbeats/" + commit + "/task-heartbeat.py"
    return ("# Managed by install-task-heartbeats.py; no task schedule or ExecStart override.\n"
            "[Service]\nEnvironmentFile=-/etc/geosub/task-heartbeats.env\n"
            "Environment=GEOSUB_TASK_HEARTBEAT_TASK=" + task + "\n"
            "Environment=GEOSUB_TASK_HEARTBEAT_HELPER=" + helper + "\n"
            "RuntimeDirectory=geosub-heartbeat-" + task + "\nRuntimeDirectoryMode=0700\n"
            "ExecStartPost=-/usr/bin/python3 " + helper + " send " + task + "\n").encode()


def systemctl(args):
    result = subprocess.run(["systemctl", *args], capture_output=True, text=True)
    if result.returncode:
        raise InstallError("systemctl failed; inspect the named unit locally")
    return result.stdout.strip()


def preflight(root):
    for task in TASKS:
        unit = "geosub-" + task + ".service"
        path = checked_path(root, "etc/systemd/system/" + unit)
        if not path.is_file() or "Type=oneshot" not in path.read_text():
            raise InstallError("Expected existing oneshot service: " + unit)
        if root == Path("/"):
            values = dict(line.split("=", 1) for line in systemctl([
                "show", unit, "-p", "Type", "-p", "ActiveState", "-p", "LoadState"]).splitlines())
            if values.get("LoadState") != "loaded" or values.get("Type") != "oneshot":
                raise InstallError("Unexpected effective service type: " + unit)
            if values.get("ActiveState") not in ("inactive", "failed"):
                raise InstallError("Task busy; wait for normal completion: " + unit)
    env = checked_path(root, ENV, parents=True)
    if env.exists():
        st = env.stat()
        if not stat.S_ISREG(st.st_mode) or st.st_uid != os.geteuid() or stat.S_IMODE(st.st_mode) != 0o600:
            raise InstallError("Dedicated environment file must be owner-controlled mode 0600")
    # Never read, source, copy or print the credentials file.


def reload(root):
    if root == Path("/"):
        systemctl(["daemon-reload"])


def verify_effective(root, commit):
    if root != Path("/"):
        return
    helper = "/opt/geosub/task-heartbeats/" + commit + "/task-heartbeat.py"
    for task in TASKS:
        post = systemctl(["show", "geosub-" + task + ".service", "-p", "ExecStartPost", "--value"])
        if post.count(helper + " send " + task) != 1:
            raise InstallError("Effective completion hook is missing or duplicated: " + task)


def git_bytes(source, commit, file):
    r = subprocess.run(["git", "-c", "safe.directory=" + str(source), "-C", str(source),
                        "show", commit + ":" + file], capture_output=True)
    if r.returncode:
        raise InstallError("Exact reviewed source is unavailable locally; no fetch performed")
    return r.stdout


def recover(root, journal):
    data = json.loads(journal.read_text())
    # Validate every current file before restoring any. Unexpected edits are never clobbered.
    for name, before in data["before"].items():
        if snapshot(checked_path(root, name)) not in (before, data["after"][name]):
            raise InstallError("Managed files changed during installation; manual review required")
    for name, before in data["before"].items():
        write(checked_path(root, name), before)
    reload(root)
    journal.unlink()


def transact(root, after, journal, verify=lambda: None):
    before = {name: snapshot(checked_path(root, name, parents=True)) for name in after}
    data = {"before": before, "after": after}
    write(journal, json_value(data))
    try:
        for name, value in after.items():
            write(checked_path(root, name), value)
        for name, value in after.items():
            if snapshot(checked_path(root, name)) != value:
                raise InstallError("Installed bytes or permissions failed readback verification")
        reload(root)
        verify()
    except Exception:
        recover(root, journal)
        raise
    history = journal.parent / ("receipt-" + str(time.time_ns()) + ".json")
    os.replace(journal, history)


def install(root, source, commit, expected):
    if not re.fullmatch("[a-f0-9]{40}", commit or "") or not re.fullmatch("[a-f0-9]{64}", expected or ""):
        raise InstallError("Full reviewed commit and helper SHA-256 required")
    if git_bytes(source, commit, DEPLOY + "install-task-heartbeats.py") != Path(__file__).read_bytes():
        raise InstallError("Installer differs from reviewed commit")
    helper = git_bytes(source, commit, DEPLOY + "task-heartbeat.py")
    if digest(helper) != expected:
        raise InstallError("Helper hash differs from approved value")
    statefile = root / STATE / "installation.json"
    state = json.loads(statefile.read_text()) if statefile.exists() else {"originals": {}, "files": {}}
    for name, expected_file in state["files"].items():
        if snapshot(checked_path(root, name)) != expected_file:
            raise InstallError("Installed file has drifted; no overwrite performed")
    desired = {"opt/geosub/task-heartbeats/" + commit + "/task-heartbeat.py": content(helper, 0o444)}
    desired.update({"etc/systemd/system/geosub-" + task + ".service.d/50-geosub-heartbeat.conf":
                    content(dropin(task, commit), 0o644) for task in TASKS})
    if all(snapshot(checked_path(root, p, parents=True)) == v for p, v in desired.items()) and state.get("commit") == commit:
        verify_effective(root, commit)
        print("Heartbeat installation already verified: " + commit)
        return
    for name in desired:
        if name not in state["originals"]:
            state["originals"][name] = snapshot(checked_path(root, name, parents=True))
    state["files"].update(desired)
    state.update(commit=commit, helper_sha256=expected)
    desired[STATE + "/installation.json"] = json_value(state)
    transact(root, desired, root / STATE / "transaction.json", lambda: verify_effective(root, commit))
    print("Heartbeat installation verified: " + commit + " helper_sha256=" + expected)


def uninstall(root):
    statefile = root / STATE / "installation.json"
    if not statefile.exists():
        print("No heartbeat installation to remove")
        return
    state = json.loads(statefile.read_text())
    for name, expected in state["files"].items():
        if snapshot(checked_path(root, name)) != expected:
            raise InstallError("Installed file has drifted; uninstall refused")
    after = dict(state["originals"])
    after[STATE + "/installation.json"] = None
    transact(root, after, root / STATE / "transaction.json")
    print("Heartbeat drop-ins removed; original managed files restored; credentials untouched")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("install", "uninstall", "recover"))
    parser.add_argument("--root", type=Path, default=Path("/"), help="Offline staging root; no systemctl outside /")
    parser.add_argument("--source", type=Path, default=Path.cwd())
    parser.add_argument("--commit")
    parser.add_argument("--helper-sha256")
    args = parser.parse_args()
    root = args.root.absolute()
    try:
        if root.is_symlink() or not root.is_dir() or root != root.resolve():
            raise InstallError("Root must be a real absolute directory")
        if root == Path("/") and (sys.platform != "linux" or os.geteuid() != 0):
            raise InstallError("Production installation requires Linux root")
        preflight(root)
        folder = checked_path(root, STATE, parents=True)
        folder.mkdir(mode=0o700, exist_ok=True)
        if folder.stat().st_uid != os.geteuid() or folder.stat().st_mode & 0o077:
            raise InstallError("Installation state directory must be private")
        lock = checked_path(root, STATE + "/lock")
        with lock.open("a") as stream:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            for name in ("installation.json", "transaction.json"):
                snapshot(checked_path(root, STATE + "/" + name))
            journal = folder / "transaction.json"
            if args.action == "recover":
                if journal.exists():
                    recover(root, journal)
                print("Interrupted installation recovery verified")
            else:
                if journal.exists():
                    raise InstallError("Interrupted installation found; review journal and run recover")
                if args.action == "install":
                    install(root, args.source.resolve(), args.commit, args.helper_sha256)
                else:
                    uninstall(root)
    except InstallError as error:
        print("BLOCKED: " + str(error), file=sys.stderr)
        return 1
    except Exception:
        print("BLOCKED: installation failed; inspect private installation state before retrying", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
