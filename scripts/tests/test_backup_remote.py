"""Local PostgreSQL + Moto S3 behavior checks; generated credentials only."""
import hashlib
import hmac
import importlib.util
import os
import secrets
import shlex
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "geosub-backend/deploy/linux-arm64"
spec = importlib.util.spec_from_file_location("backup_remote", DEPLOY / "db-backup-remote.py")
remote = importlib.util.module_from_spec(spec)
spec.loader.exec_module(remote)
S3_SIMULATOR = "motoserver/moto:5.1.16"


def run(args, **kwargs):
    return subprocess.run(args, text=True, capture_output=True, check=True, **kwargs)


class TransportGuards(unittest.TestCase):
    def test_curl_sends_valid_sigv4_for_paginated_request(self):
        # Independently verify curl's wire signature; Moto does not enforce authentication.
        access, secret = "test" + secrets.token_hex(8), secrets.token_hex(24)
        received = {}
        class Capture(BaseHTTPRequestHandler):
            def do_GET(self):
                received.update(path=self.path, headers=self.headers)
                self.send_response(200)
                self.end_headers()
            def log_message(self, *args):
                pass
        server = ThreadingHTTPServer(("127.0.0.1", 0), Capture)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        env = {"GEOSUB_BACKUP_REMOTE_URL": "s3://backup-test/backups",
               "GEOSUB_BACKUP_S3_ENDPOINT": "http://127.0.0.1:" + str(server.server_port),
               "GEOSUB_BACKUP_S3_ACCESS_KEY_ID": access,
               "GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY": secret}
        with mock.patch.dict(os.environ, env, clear=True), tempfile.TemporaryDirectory() as directory:
            remote.Store().request("GET", output=Path(directory) / "body",
                                   query={"list-type": "2", "continuation-token": "page+2"})
        headers = received["headers"]
        algorithm, attributes = headers["Authorization"].split(" ", 1)
        fields = dict(item.split("=", 1) for item in attributes.split(", "))
        credential, scope = fields["Credential"].split("/", 1)
        self.assertTrue(credential == access)
        signed = fields["SignedHeaders"]
        canonical_headers = "".join(key + ":" + " ".join(headers[key].split()) + "\n"
                                    for key in signed.split(";"))
        url = urllib.parse.urlsplit(received["path"])
        canonical = "\n".join(["GET", url.path, url.query, canonical_headers, signed,
                               hashlib.sha256(b"").hexdigest()])
        string_to_sign = "\n".join([algorithm, headers["X-Amz-Date"], scope,
                                    hashlib.sha256(canonical.encode()).hexdigest()])
        key = ("AWS4" + secret).encode()
        for value in scope.split("/"):
            key = hmac.new(key, value.encode(), hashlib.sha256).digest()
        expected = hmac.new(key, string_to_sign.encode(), hashlib.sha256).hexdigest()
        self.assertTrue(hmac.compare_digest(fields["Signature"], expected))

    def test_config_cannot_inject_options(self):
        with self.assertRaises(remote.BackupError):
            remote.config_line("user", "key\nverbose")
        self.assertEqual(remote.config_line("user", 'x"\\y'), 'user = "x\\"\\\\y"\n')

    def test_missing_remote_preserves_local_flow(self):
        with mock.patch.dict(os.environ, {"GEOSUB_BACKUP_REMOTE_URL": ""}):
            remote.upload(Path("/does-not-need-to-exist.dump"))

    def test_credentials_use_stdin_not_argv_or_credential_files(self):
        access, secret = "test" + secrets.token_hex(8), secrets.token_hex(24)
        env = {"GEOSUB_BACKUP_REMOTE_URL": "s3://backup-test/backups",
               "GEOSUB_BACKUP_S3_ENDPOINT": "http://127.0.0.1:12345",
               "GEOSUB_BACKUP_S3_ACCESS_KEY_ID": access,
               "GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY": secret}
        with mock.patch.dict(os.environ, env, clear=True), mock.patch.object(remote.subprocess, "run") as curl:
            curl.return_value = subprocess.CompletedProcess([], 0, b"200")
            remote.Store().request("GET", output=Path("/unused"))
            argv = curl.call_args.args[0]
            self.assertEqual(argv[:4], ["curl", "-q", "--silent", "--config"])
            self.assertNotIn(secret, " ".join(argv))
            self.assertNotIn(access, " ".join(argv))
            self.assertIn((access + ":" + secret).encode(), curl.call_args.kwargs["input"])
            self.assertNotIn("--location", argv)
        with mock.patch.dict(os.environ, {**env, "GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY": ""}, clear=True):
            with self.assertRaises(remote.BackupError):
                remote.Store()

    def test_restore_rejects_production_without_network(self):
        env = {**os.environ, "GEOSUB_DB_CONTAINER": "geosub-postgres"}
        result = subprocess.run([sys.executable, str(DEPLOY / "db-backup-remote.py"),
                                 "restore-latest", "/unused", "--database", "geosub_app"],
                                env=env, text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("isolated", result.stderr)

    def test_pagination_only_selects_complete_markers(self):
        stem = "geosub_app_20260101T000000Z"
        key = "backups/" + stem + "-" + "a" * 64 + "/" + stem + ".txt"
        pages = [
            '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
            '<Contents><Key>backups/incomplete.dump</Key></Contents>'
            '<IsTruncated>true</IsTruncated><NextContinuationToken>page+2</NextContinuationToken></ListBucketResult>',
            '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
            '<Contents><Key>' + key + '</Key></Contents><IsTruncated>false</IsTruncated></ListBucketResult>']
        store = object.__new__(remote.Store)
        store.prefix = "backups"
        calls = []
        def request(method, *, output, query):
            calls.append(query.copy())
            output.write_text(pages[len(calls) - 1])
            return 200
        store.request = request
        self.assertEqual(store.completed_keys(), [(stem, key)])
        self.assertEqual(calls[1]["continuation-token"], "page+2")


@unittest.skipUnless(os.environ.get("GEOSUB_RUN_BACKUP_INTEGRATION") == "1",
                     "set GEOSUB_RUN_BACKUP_INTEGRATION=1 for local containers")
class BackupIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="geosub-t10-")
        cls.base = Path(cls.temp.name)
        tag = secrets.token_hex(5)
        cls.pg = "geosub_restore_drill_" + tag
        cls.s3 = "geosub_test_s3_" + tag
        cls.addClassCleanup(cls.temp.cleanup)
        # Register cleanup before creating either resource.
        cls.addClassCleanup(lambda: subprocess.run(["docker", "rm", "-fv", cls.pg, cls.s3],
                                                   capture_output=True))
        cls.env = {**os.environ, "POSTGRES_PASSWORD": secrets.token_hex(24),
                   "TEST_ACCESS_KEY": "test" + secrets.token_hex(8),
                   "TEST_SECRET_KEY": secrets.token_hex(24),
                   "GEOSUB_ENV_FILE": "/dev/null", "GEOSUB_DB_CONTAINER": cls.pg,
                   "GEOSUB_DB_USER": "test", "GEOSUB_DB_NAME": "geosub_test",
                   "GEOSUB_DB_TRANSPORT": "docker", "GEOSUB_BACKUP_MIRROR_DIR": ""}
        run(["docker", "run", "-d", "--name", cls.pg, "--tmpfs", "/var/lib/postgresql/data", "-e", "POSTGRES_PASSWORD",
             "-e", "POSTGRES_USER=test", "-e", "POSTGRES_DB=geosub_test", "postgres:16-alpine"], env=cls.env)
        run(["docker", "run", "-d", "--name", cls.s3, "-p", "127.0.0.1::5000",
             S3_SIMULATOR], env=cls.env)
        port = run(["docker", "port", cls.s3, "5000/tcp"]).stdout.strip().rsplit(":", 1)[1]
        endpoint = "http://127.0.0.1:" + port
        for attempt in range(60):
            ready = subprocess.run(["docker", "exec", cls.pg, "psql", "-h", "127.0.0.1",
                                    "-U", "test", "-d", "geosub_test", "-XAtqc", "SELECT 1"],
                                   capture_output=True)
            http = subprocess.run(["curl", "-q", "-fsS", "--max-time", "2",
                                   endpoint + "/moto-api/"], capture_output=True)
            if ready.returncode == http.returncode == 0:
                break
            if run(["docker", "inspect", "-f", "{{.State.Status}}", cls.pg]).stdout.strip() == "exited":
                raise RuntimeError("test PostgreSQL exited")
            time.sleep(1)
        else:
            raise RuntimeError("test services not ready")
        for file in sorted((ROOT / "geosub-backend/sql/schema").glob("*.sql")):
            cls.sql(file.read_text())
        cls.sql("""
INSERT INTO countries(code,name_zh,name_en,currency) VALUES('US','测试','Test','USD');
INSERT INTO products(slug,name,category,status) VALUES('t10-test','Synthetic','ai','published');
INSERT INTO plans(product_id,slug,name,status) SELECT id,'test','Test','published' FROM products;
INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,status)
SELECT p.id,l.id,c.id,1,'USD',1,'published' FROM products p JOIN plans l ON l.product_id=p.id CROSS JOIN countries c;
INSERT INTO exchange_rates(base_currency,quote_currency,rate,rate_date) VALUES('USD','USD',1,current_date);
""")
        cls.env.update(GEOSUB_BACKUP_S3_ENDPOINT=endpoint, GEOSUB_BACKUP_S3_REGION="us-east-1",
                       GEOSUB_BACKUP_S3_ACCESS_KEY_ID=cls.env["TEST_ACCESS_KEY"],
                       GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY=cls.env["TEST_SECRET_KEY"],
                       GEOSUB_BACKUP_REMOTE_URL="s3://backup-test/backups")
        with mock.patch.dict(os.environ, cls.env):
            store = remote.Store()
            if store.request("PUT", output=cls.base / "bucket-response") not in (200, 201):
                raise RuntimeError("test bucket creation failed")

    @classmethod
    def sql(cls, text):
        return run(["docker", "exec", "-i", cls.pg, "psql", "-U", "test", "-d",
                    "geosub_test", "-XqAt", "-v", "ON_ERROR_STOP=1"], input=text).stdout.strip()

    def backup(self, name, extra=None):
        directory = self.base / name
        env = {**self.env, "GEOSUB_BACKUP_DIR": str(directory), **(extra or {})}
        return subprocess.Popen(["bash", str(DEPLOY / "db-backup.sh")], env=env,
                                text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def assert_clean_logs(self, output):
        for name in ("TEST_ACCESS_KEY", "TEST_SECRET_KEY", "POSTGRES_PASSWORD"):
            self.assertNotIn(self.env[name], output)

    def test_complete_cycle_concurrent_writes_and_faults(self):
        # Block pg_dump's initial table lock after snapshot export, then commit a new event.
        holder = subprocess.Popen(["docker", "exec", "-i", self.pg, "psql", "-U", "test",
                                   "-d", "geosub_test", "-XqAt", "-v", "ON_ERROR_STOP=1"],
                                  stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: holder.poll() is None and holder.terminate())
        holder.stdin.write("BEGIN; LOCK TABLE products IN ACCESS EXCLUSIVE MODE; SELECT 'locked';\n")
        holder.stdin.flush()
        self.assertEqual(holder.stdout.readline().strip(), "locked")
        before = int(self.sql("SELECT count(*) FROM event_logs"))
        backup = self.backup("good")
        try:
            for attempt in range(100):
                blocked = self.sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='pg_dump' AND wait_event_type='Lock'")
                if blocked == "1":
                    break
                time.sleep(0.1)
            else:
                self.fail("dump never reached locked snapshot")
            self.sql("INSERT INTO event_logs(event_key) VALUES('t10-concurrent')")
        finally:
            holder.stdin.write("ROLLBACK;\n")
            holder.stdin.close()
            holder.wait(timeout=15)
            holder.stdout.close()
            holder.stderr.close()
        stdout, stderr = backup.communicate(timeout=180)
        self.assertEqual(backup.returncode, 0, stdout + stderr)
        self.assert_clean_logs(stdout + stderr)
        dump = next((self.base / "good").glob("*.dump"))
        verified_order = [line.split(": ", 1)[1] for line in stdout.splitlines()
                          if line.startswith("Remote member verified: ")]
        self.assertEqual(verified_order, remote.parts(dump.stem))
        counts = dump.with_suffix(".counts.tsv").read_text()
        self.assertIn("event_logs\t" + str(before) + "\n", counts)
        self.assertEqual(int(self.sql("SELECT count(*) FROM event_logs")), before + 1)
        with mock.patch.dict(os.environ, self.env):
            store = remote.Store()
            self.assertEqual(len(store.completed_keys()), 1)
            # Retry uses readback, never overwrites the completed generation.
            remote.upload(dump)
            incomplete = "backups/geosub_test_20990101T000000Z-" + "0" * 64
            store.put_verified(incomplete + "/geosub_test_20990101T000000Z.dump", dump, self.base)
            self.assertEqual(len(store.completed_keys()), 1)
        result = run([sys.executable, str(DEPLOY / "db-backup-remote.py"), "restore-latest",
                      str(self.base / "downloaded"), "--database", "geosub_restore_drill_result"], env=self.env)
        self.assertIn("Key-table counts match", result.stdout)
        restored = run(["docker", "exec", self.pg, "psql", "-U", "test", "-d",
                        "geosub_restore_drill_result", "-XAtqc", "SELECT count(*) FROM event_logs"]).stdout.strip()
        self.assertEqual(int(restored), before)
        self.assert_clean_logs(result.stdout + result.stderr)
        print("Snapshot proof (synthetic event_logs): manifest=" + str(before)
              + ", restored=" + restored + ", source_after_commit=" + str(before + 1))
        print("Restore proof: checksum, schema, foreign keys, views/functions and all 10 key-table counts passed")
        # Force the final metadata upload to fail after dump/counts/checksum reached S3.
        no_marker = self.base / "marker-failure"
        shutil.copytree(self.base / "good", no_marker)
        new_stem = "geosub_test_20980101T000000Z"
        old_stem = dump.stem
        for old in list(no_marker.iterdir()):
            renamed = old.with_name(old.name.replace(old_stem, new_stem))
            old.rename(renamed)
            if renamed.suffix in (".txt", ".sha256"):
                renamed.write_text(renamed.read_text().replace(old_stem, new_stem))
        real_request = remote.Store.request
        def refuse_marker(store, method, key="", **kwargs):
            if method == "PUT" and key.endswith(new_stem + ".txt"):
                raise remote.BackupError("simulated completion upload failure")
            return real_request(store, method, key, **kwargs)
        with mock.patch.dict(os.environ, self.env):
            with mock.patch.object(remote.Store, "request", refuse_marker):
                with self.assertRaises(remote.BackupError):
                    remote.upload(no_marker / (new_stem + ".dump"))
            self.assertEqual(len(remote.Store().completed_keys()), 1)
        # HTTP error response contains test credentials; log must show only safe error code.
        test_secret = self.env["TEST_SECRET_KEY"]
        class Failure(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(self.server.failure_status)
                self.end_headers()
                self.wfile.write(test_secret.encode())
            def log_message(self, *args):
                pass
        server = ThreadingHTTPServer(("127.0.0.1", 0), Failure)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            server.failure_status = 403
            denied_env = {**self.env, "GEOSUB_BACKUP_S3_ENDPOINT": "http://127.0.0.1:" + str(server.server_port)}
            denied = subprocess.run([sys.executable, str(DEPLOY / "db-backup-remote.py"),
                                     "download-latest", str(self.base / "denied")],
                                    env=denied_env, text=True, capture_output=True)
            self.assertNotEqual(denied.returncode, 0)
            self.assertIn("HTTP 403", denied.stderr)
            self.assertFalse((self.base / "denied").exists())
            self.assert_clean_logs(denied.stdout + denied.stderr)
            server.failure_status = 500
            failed = self.backup("upload-failure", {"GEOSUB_BACKUP_S3_ENDPOINT": "http://127.0.0.1:" + str(server.server_port)})
            out, err = failed.communicate(timeout=180)
            self.assertNotEqual(failed.returncode, 0)
            self.assertIn("HTTP 500", err)
            self.assert_clean_logs(out + err)
            self.assertEqual(len(list((self.base / "upload-failure").glob("*.dump"))), 1)
        finally:
            server.shutdown()
            server.server_close()
        # Corrupt a completed generation in the un-locked simulator; download must refuse it.
        with mock.patch.dict(os.environ, self.env):
            store = remote.Store()
            stem, marker = store.completed_keys()[0]
            key = marker.rsplit("/", 1)[0] + "/" + stem + ".dump"
            store.request("DELETE", key, output=self.base / "deleted")
            corrupt = self.base / "corrupt"
            corrupt.write_bytes(b"not the archived dump")
            store.request("PUT", key, source=corrupt, output=self.base / "corrupted")
            with self.assertRaises(remote.BackupError):
                remote.download_latest(self.base / "corrupt-download")
            self.assertFalse((self.base / "corrupt-download").exists())
        print("PASS end-to-end: concurrent snapshot, ordered completion, retry, isolated restore, credentials, HTTP failure, corruption")

    def test_snapshot_reader_failure_does_not_publish(self):
        # Dump succeeds, but the shared-snapshot count reader cannot find its required table.
        self.sql("ALTER TABLE event_logs RENAME TO missing_event_logs")
        try:
            failed = self.backup("snapshot-failure")
            out, err = failed.communicate(timeout=180)
            self.assertNotEqual(failed.returncode, 0)
            self.assertIn("snapshot failed", err)
            self.assert_clean_logs(out + err)
            self.assertEqual(list((self.base / "snapshot-failure").iterdir()), [])
            self.assertEqual(self.sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'"), "0")
        finally:
            self.sql("ALTER TABLE missing_event_logs RENAME TO event_logs")

    def test_local_backup_without_remote_still_verifies(self):
        backup = self.backup("local-only", {"GEOSUB_BACKUP_REMOTE_URL": ""})
        out, err = backup.communicate(timeout=180)
        self.assertEqual(backup.returncode, 0, out + err)
        self.assertIn("remote backup is not configured", out)
        self.assert_clean_logs(out + err)
        dump = next((self.base / "local-only").glob("*.dump"))
        remote.verify(dump.parent, dump.stem)

    def test_main_environment_remote_assignments_cannot_block_local_backup(self):
        keys = ["GEOSUB_BACKUP_REMOTE_URL", "GEOSUB_BACKUP_S3_ENDPOINT",
                "GEOSUB_BACKUP_S3_REGION", "GEOSUB_BACKUP_S3_ACCESS_KEY_ID",
                "GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY", "GEOSUB_BACKUP_S3_SESSION_TOKEN"]
        valid = {key: self.env.get(key, "") for key in keys}
        valid["GEOSUB_BACKUP_REMOTE_URL"] = "s3://backup-test/environment-regression"
        invalid = {key: "invalid\n\"\\" + secrets.token_hex(16) for key in keys}
        empty = dict.fromkeys(keys, "")
        cases = [
            # systemd injects values that the shell then sources again.
            ("duplicated", valid, valid, 0, "Remote backup complete"),
            ("empty", empty, empty, 0, "remote backup is not configured"),
            # File-only values must not replace the calling process configuration.
            ("file-only-invalid", empty, invalid, 0, "remote backup is not configured"),
            ("file-overrides-invalid", valid, invalid, 0, "Remote backup complete"),
            # Invalid inherited settings fail only in the upload stage.
            ("inherited-invalid", invalid, invalid, 1, "invalid remote backup URL"),
        ]
        for name, inherited, sourced, expected_code, message in cases:
            with self.subTest(name=name):
                inherited, sourced = dict(inherited), dict(sourced)
                for settings in (inherited, sourced):
                    if settings["GEOSUB_BACKUP_REMOTE_URL"] == valid["GEOSUB_BACKUP_REMOTE_URL"]:
                        settings["GEOSUB_BACKUP_REMOTE_URL"] += "-" + name
                env_file = self.base / (name + ".env")
                env_file.write_text("".join(key + "=" + shlex.quote(value) + "\n"
                                            for key, value in sourced.items()))
                backup = self.backup(name, {**inherited, "GEOSUB_ENV_FILE": str(env_file)})
                out, err = backup.communicate(timeout=180)
                self.assertEqual(backup.returncode, expected_code, out + err)
                self.assertIn(message, out + err)
                self.assertNotIn("readonly variable", out + err)
                self.assert_clean_logs(out + err)
                for value in invalid.values():
                    self.assertNotIn(value, out + err)
                dump = next((self.base / name).glob("*.dump"))
                remote.verify(dump.parent, dump.stem)
                self.assertEqual(len(list((self.base / name).iterdir())), 4)


if __name__ == "__main__":
    unittest.main(verbosity=2)
