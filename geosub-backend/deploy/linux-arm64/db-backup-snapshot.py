#!/usr/bin/env python3
"""Create a dump and count manifest from one exported, read-only snapshot."""
import os
import re
import selectors
import subprocess
import sys
import tempfile
from pathlib import Path


def db_command(*args):
    transport = os.environ.get("GEOSUB_DB_TRANSPORT", "docker")
    if transport == "native":
        return list(args)
    if transport != "docker":
        raise RuntimeError("unsupported database transport")
    return ["docker", "exec", "-i",
            os.environ.get("GEOSUB_DB_CONTAINER", "geosub-postgres"), *args]


def create_snapshot(dump_file, counts_file):
    user = os.environ.get("GEOSUB_DB_USER", "geosub_admin")
    database = os.environ.get("GEOSUB_DB_NAME", "geosub_app")
    psql = db_command("psql", "-XqAt", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database)
    query = Path(__file__).with_name("db-restore-counts.sql").read_text()
    with tempfile.TemporaryFile() as errors:
        owner = subprocess.Popen(psql, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                 stderr=errors)
        try:
            owner.stdin.write(
                b"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n"
                b"SET idle_in_transaction_session_timeout = '25min';\n"
                b"SELECT pg_export_snapshot();\n")
            owner.stdin.flush()
            with selectors.DefaultSelector() as selector:
                selector.register(owner.stdout, selectors.EVENT_READ)
                if not selector.select(30):
                    raise RuntimeError("snapshot export timed out")
            snapshot = owner.stdout.readline().decode().strip()
            if not re.fullmatch(r"[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+", snapshot):
                raise RuntimeError("snapshot export failed")
            # The exporting transaction must remain open until both readers finish.
            with open(dump_file, "xb") as output:
                subprocess.run(db_command("pg_dump", "-U", user, "-d", database, "-Fc",
                                          "--snapshot=" + snapshot),
                               stdout=output, stderr=errors, check=True, timeout=1200)
            sql = ("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n"
                   "SET TRANSACTION SNAPSHOT '" + snapshot + "';\n" + query + "\nCOMMIT;\n")
            with open(counts_file, "xb") as output:
                subprocess.run([*psql, "-F", "\t", "-f", "-"], input=sql.encode(),
                               stdout=output, stderr=errors, check=True, timeout=120)
            owner.stdin.write(b"ROLLBACK;\n")
            owner.stdin.close()
            if owner.wait(timeout=30) != 0:
                raise RuntimeError("snapshot owner failed")
        finally:
            if owner.poll() is None:
                owner.terminate()
                try:
                    owner.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    owner.kill()
                    owner.wait()
            owner.stdout.close()
            if not owner.stdin.closed:
                owner.stdin.close()
    print("Backup snapshot readers completed")


if __name__ == "__main__":
    os.umask(0o077)
    try:
        if len(sys.argv) != 3:
            raise ValueError("expected dump and count output paths")
        create_snapshot(*sys.argv[1:])
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
        print("Backup snapshot failed; backup is incomplete", file=sys.stderr)
        sys.exit(1)
