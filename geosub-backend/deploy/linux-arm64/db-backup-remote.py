#!/usr/bin/env python3
"""S3-compatible backup transport. Python stdlib + curl, no credential files."""
import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path


class BackupError(Exception):
    pass


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def config_line(key, value):
    # curl config escaping; a newline must never add a curl option.
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise BackupError("invalid transport setting")
    return key + ' = "' + value.replace("\\", "\\\\").replace('"', '\\"') + '"\n'


def parts(stem):
    if not re.fullmatch(r"[A-Za-z0-9_]+_[0-9]{8}T[0-9]{6}Z", stem):
        raise BackupError("invalid backup name")
    return [stem + ".dump", stem + ".counts.tsv", stem + ".dump.sha256", stem + ".txt"]


def verify(directory, stem):
    dump, counts, checksum, marker = [directory / name for name in parts(stem)]
    if any(not p.is_file() or p.is_symlink() or not p.stat().st_size
           for p in (dump, counts, checksum, marker)):
        raise BackupError("backup member missing or unsafe")
    if marker.stat().st_size > 65536 or checksum.stat().st_size > 4096:
        raise BackupError("backup metadata too large")
    # Single PUT only; fail before publication instead of silently requiring multipart.
    if dump.stat().st_size > 5_000_000_000:
        raise BackupError("backup exceeds supported single-upload size (5 GB)")
    fields = {}
    for line in marker.read_text().splitlines():
        key, separator, value = line.partition("=")
        if not separator or key in fields:
            raise BackupError("invalid completion metadata")
        fields[key] = value
    check = checksum.read_text().split()
    if (len(check) != 2 or not re.fullmatch(r"[a-f0-9]{64}", check[0])
            or Path(check[1]).name != dump.name
            or fields.get("format") != "pg_dump custom"
            or Path(fields.get("file", "")).name != dump.name
            or Path(fields.get("counts_file", "")).name != counts.name
            or fields.get("sha256") != check[0]
            or sha256(dump) != check[0]
            or sha256(counts) != fields.get("counts_sha256")):
        raise BackupError("backup checksum verification failed")
    return fields


class Store:
    def __init__(self):
        remote = urllib.parse.urlsplit(os.environ.get("GEOSUB_BACKUP_REMOTE_URL", ""))
        endpoint = urllib.parse.urlsplit(os.environ.get("GEOSUB_BACKUP_S3_ENDPOINT", ""))
        if (remote.scheme != "s3" or not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", remote.netloc)
                or remote.query or remote.fragment):
            raise BackupError("invalid remote backup URL")
        self.prefix = remote.path.strip("/")
        if not self.prefix or not re.fullmatch(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*", self.prefix):
            raise BackupError("a dedicated safe backup prefix is required")
        local = endpoint.scheme == "http" and endpoint.hostname in ("127.0.0.1", "::1")
        if (not endpoint.hostname or endpoint.username or endpoint.password or endpoint.query
                or endpoint.fragment or endpoint.path not in ("", "/")
                or not (endpoint.scheme == "https" or local)):
            raise BackupError("HTTPS endpoint required (loopback HTTP allowed for tests)")
        self.base = endpoint.geturl().rstrip("/") + "/" + remote.netloc
        self.region = os.environ.get("GEOSUB_BACKUP_S3_REGION") or "auto"
        if not re.fullmatch(r"[A-Za-z0-9-]+", self.region):
            raise BackupError("invalid region")
        access = os.environ.get("GEOSUB_BACKUP_S3_ACCESS_KEY_ID", "")
        secret = os.environ.get("GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY", "")
        if not access or not secret or ":" in access:
            raise BackupError("remote credentials missing")
        self.auth = config_line("user", access + ":" + secret)
        token = os.environ.get("GEOSUB_BACKUP_S3_SESSION_TOKEN")
        if token:
            self.auth += config_line("header", "x-amz-security-token: " + token)

    def request(self, method, key="", *, output, source=None, query=None):
        url = self.base + "/" + urllib.parse.quote(key, safe="/")
        if query:
            url += "?" + urllib.parse.urlencode(sorted(query.items()))
        config = self.auth + config_line("url", url)
        config += config_line("aws-sigv4", "aws:amz:" + self.region + ":s3")
        config += config_line("request", method)
        config += config_line("output", str(output))
        config += config_line("header", "x-amz-content-sha256: " +
                              (sha256(source) if source else hashlib.sha256(b"").hexdigest()))
        if source:
            config += config_line("upload-file", str(source))
            config += config_line("header", "If-None-Match: *")
        # No argv credentials, curlrc, redirects, verbose output or raw response/error logging.
        result = subprocess.run(
            ["curl", "-q", "--silent", "--config", "-", "--connect-timeout", "15",
             "--max-time", "600", "--write-out", "%{http_code}"],
            input=config.encode(), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=620)
        if result.returncode:
            raise BackupError("remote transport failed (curl exit " + str(result.returncode) + ")")
        if not re.fullmatch(rb"[0-9]{3}", result.stdout):
            raise BackupError("invalid remote response")
        status = int(result.stdout)
        if status not in (200, 201, 204, 404, 409, 412):
            raise BackupError("remote request failed (HTTP " + str(status) + ")")
        return status

    def get(self, key, output):
        status = self.request("GET", key, output=output)
        if status != 200:
            raise BackupError("remote backup member unavailable")
        return output

    def put_verified(self, key, source, temp):
        downloaded = temp / "readback"
        status = self.request("GET", key, output=downloaded)
        if status == 404:
            status = self.request("PUT", key, source=source, output=temp / "put-response")
            if status not in (200, 201, 204, 409, 412):
                raise BackupError("remote upload failed")
            # Includes ambiguous conditional conflicts; accept only identical bytes.
            self.get(key, downloaded)
        elif status != 200:
            raise BackupError("remote object cannot be inspected")
        if sha256(downloaded) != sha256(source):
            raise BackupError("remote readback mismatch")
        print("Remote member verified: " + Path(key).name)

    def completed_keys(self):
        keys = []
        continuation = None
        seen = set()
        with tempfile.TemporaryDirectory(prefix="geosub-list-") as name:
            path = Path(name) / "response"
            while True:
                query = {"list-type": "2", "prefix": self.prefix + "/", "max-keys": "1000"}
                if continuation:
                    query["continuation-token"] = continuation
                if self.request("GET", output=path, query=query) != 200:
                    raise BackupError("remote listing failed")
                root = ET.fromstring(path.read_bytes())
                for child in root.findall("{*}Contents"):
                    key = child.findtext("{*}Key", "")
                    relative = key.removeprefix(self.prefix + "/")
                    # Each immutable generation has a content hash in its directory.
                    match = re.fullmatch(
                        r"([A-Za-z0-9_]+_[0-9]{8}T[0-9]{6}Z)-([a-f0-9]{64})/\1\.txt", relative)
                    if match:
                        keys.append((match[1], key))
                if root.findtext("{*}IsTruncated") != "true":
                    return sorted(keys, key=lambda item: (item[0][-16:], item[0]), reverse=True)
                continuation = root.findtext("{*}NextContinuationToken")
                if not continuation or continuation in seen:
                    raise BackupError("invalid remote pagination")
                seen.add(continuation)


def upload(dump):
    if not os.environ.get("GEOSUB_BACKUP_REMOTE_URL"):
        print("WARNING: remote backup is not configured; local backup retained")
        return
    stem = dump.stem
    before = verify(dump.parent, stem)
    store = Store()
    generation = store.prefix + "/" + stem + "-" + before["sha256"] + "/"
    # Immutable local staging prevents changes between validation and marker publication.
    with tempfile.TemporaryDirectory(prefix="geosub-upload-") as name:
        temp = Path(name)
        stage = temp / "stage"
        stage.mkdir()
        for member in parts(stem):
            shutil.copyfile(dump.parent / member, stage / member)
        verify(stage, stem)
        for member in parts(stem):  # dump, counts, checksum, metadata (completion marker) LAST.
            store.put_verified(generation + member, stage / member, temp)
    print("Remote backup complete: " + stem)


def download_latest(destination):
    if destination.exists():
        raise BackupError("download destination already exists")
    store = Store()
    keys = store.completed_keys()
    if not keys:
        raise BackupError("no completed remote backup found")
    stem, marker = keys[0]
    directory = marker.rsplit("/", 1)[0]
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".geosub-download-", dir=destination.parent) as name:
        temp = Path(name)
        # Start with the completion marker, then download all its siblings.
        for member in reversed(parts(stem)):
            store.get(directory + "/" + member, temp / member)
        metadata = verify(temp, stem)
        if not directory.endswith("-" + metadata["sha256"]):
            raise BackupError("remote generation hash mismatch")
        # Fail closed on corrupt newest marked generation, never silently select older data.
        os.rename(temp, destination)
    print("Remote backup downloaded and verified: " + stem)
    return destination / (stem + ".dump")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("upload", "download-latest", "restore-latest"))
    parser.add_argument("path", type=Path)
    parser.add_argument("--database")
    args = parser.parse_args()
    if args.action == "upload":
        upload(args.path)
    elif args.action == "download-latest":
        download_latest(args.path)
    else:
        container = os.environ.get("GEOSUB_DB_CONTAINER", "")
        if (not re.fullmatch(r"geosub_restore_drill_[A-Za-z0-9_]+", container)
                or not re.fullmatch(r"geosub_restore_drill_[A-Za-z0-9_]+", args.database or "")):
            raise BackupError("restore requires an explicit isolated container and drill database")
        dump = download_latest(args.path)
        env = {**os.environ, "GEOSUB_ENV_FILE": "/dev/null"}
        subprocess.run(["bash", str(Path(__file__).with_name("db-restore-drill.sh")),
                        str(dump), args.database, "CREATE_RESTORE_DRILL_DATABASE"],
                       env=env, check=True)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        main()
    except BackupError as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, ET.ParseError, subprocess.SubprocessError):
        print("ERROR: remote backup operation failed", file=sys.stderr)
        sys.exit(1)
