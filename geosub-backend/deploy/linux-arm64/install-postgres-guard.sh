#!/usr/bin/env bash
# Independent database maintenance operation, not an application rolling deploy.
set -euo pipefail
umask 077
ACTION=${1:-}
STATE=${2:-}
EXPECTED=${3:-}
CONFIRM=${4:-}
[[ "$STATE" = /* && "$EXPECTED" =~ ^[0-9]+$ ]] || { echo 'Absolute state directory and verified cluster ID required'; exit 2; }
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
CONTAINER=${GEOSUB_GUARD_CONTAINER:-geosub-postgres}
check_cluster() {
  docker run --rm --network none --volumes-from "$CONTAINER":ro \
    --mount "type=bind,src=$STATE/guard.sh,dst=/guard.sh,readonly" \
    --mount "type=bind,src=$STATE/identity,dst=/run/geosub-postgres-system-id,readonly" \
    --entrypoint /bin/sh "$IMAGE" /guard.sh --check-only
}
wait_ready() {
  for ((i=0;i<60;i++)); do
    if [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER")" = healthy ]]; then return; fi
    sleep 1
  done
  echo 'Database health timeout; preserve state and inspect before rollback' >&2
  return 1
}
if [[ "$ACTION" = apply && "$CONFIRM" = INSTALL_EXISTING_CLUSTER_GUARD ]]; then
  [[ ! -e "$STATE" ]] || { echo 'State directory exists; refusing overwrite'; exit 1; }
  install -d -m 0700 "$STATE"
  docker inspect "$CONTAINER" > "$STATE/container-before.json"
  python3 - "$STATE" <<'PY'
import json, pathlib, sys
s=pathlib.Path(sys.argv[1]); c=json.loads((s/'container-before.json').read_text())[0]
l=c['Config']['Labels']; base=l['com.docker.compose.project.config_files']
if ',' in base: raise SystemExit('Existing multi-file Compose requires explicit review')
if c['Config'].get('Entrypoint') != ['docker-entrypoint.sh']: raise SystemExit('Unexpected existing entrypoint')
m=[x for x in c['Mounts'] if x['Destination']=='/var/lib/postgresql/data']
if len(m)!=1 or m[0]['Type']!='bind': raise SystemExit('Expected one PGDATA bind')
if any(x.startswith('PGDATA=') and x!='PGDATA=/var/lib/postgresql/data' for x in c['Config']['Env']): raise SystemExit('Unexpected PGDATA')
base=str(pathlib.Path(base).resolve()); overlay=str(pathlib.Path(base).with_name('docker-compose.override.yml'))
if pathlib.Path(overlay).exists(): raise SystemExit('Existing override must be reviewed, never overwritten')
meta=dict(base=base,overlay=overlay,image=c['Image'],data=m[0]['Source'],project=l['com.docker.compose.project'])
(s/'metadata.json').write_text(json.dumps(meta))
PY
  IMAGE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["image"])' "$STATE/metadata.json")
  BASE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["base"])' "$STATE/metadata.json")
  OVERLAY=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["overlay"])' "$STATE/metadata.json")
  install -m 0644 "$SCRIPT_DIR/postgres-existing-cluster-entrypoint.sh" "$STATE/guard.sh"
  printf '%s\n' "$EXPECTED" > "$STATE/identity"
  chmod 0444 "$STATE/identity"
  check_cluster
  docker compose -f "$BASE" config --format json > "$STATE/compose-before.json"
  python3 - "$STATE" <<'PY'
import json,pathlib,sys
s=pathlib.Path(sys.argv[1]); m=json.loads((s/'metadata.json').read_text())
def mount(src,dst): return dict(type='bind',source=src,target=dst,read_only=dst!='/var/lib/postgresql/data',bind=dict(create_host_path=False))
p=dict(image=m['image'],entrypoint=['/bin/sh','/usr/local/lib/geosub/guard.sh'],command=['postgres'],volumes=[mount(m['data'],'/var/lib/postgresql/data'),mount(str(s/'guard.sh'),'/usr/local/lib/geosub/guard.sh'),mount(str(s/'identity'),'/run/geosub-postgres-system-id')])
(s/'override.json').write_text(json.dumps(dict(services=dict(postgres=p))))
PY
  docker compose -f "$BASE" -f "$STATE/override.json" config --format json > "$STATE/compose-after.json"
  python3 - "$STATE" <<'PY'
import json,pathlib,sys
s=pathlib.Path(sys.argv[1]); a=json.loads((s/'compose-before.json').read_text()); b=json.loads((s/'compose-after.json').read_text())
c=json.loads((s/'container-before.json').read_text())[0]
e=dict(item.split('=',1) for item in c['Config']['Env'])
if any(e.get(k)!=str(v) for k,v in a['services']['postgres'].get('environment',{}).items()): raise SystemExit('Compose environment differs from running container; review required')
for key,value in a['services'].items():
 if key!='postgres' and b['services'][key]!=value: raise SystemExit('Unrelated service changed')
x=a['services']['postgres'].copy(); y=b['services']['postgres'].copy()
for key in ['image','entrypoint','command','volumes']: x.pop(key,None); y.pop(key,None)
if x!=y: raise SystemExit('Unapproved postgres configuration change')
v=[v for v in b['services']['postgres']['volumes'] if v['target']=='/var/lib/postgresql/data']
if len(v)!=1 or v[0]['bind']['create_host_path']!=False: raise SystemExit('Unsafe data mount')
PY
  # Persist as the default override, including the pinned existing image ID.
  install -m 0600 "$STATE/override.json" "$OVERLAY"
  date -u +%FT%TZ > "$STATE/prepared-at"
  docker compose -f "$BASE" -f "$OVERLAY" up -d --no-deps --pull never postgres
  wait_ready
  check_cluster
  date -u +%FT%TZ > "$STATE/applied-at"
  echo 'Existing-cluster guard installed; application/data checks still required'
elif [[ "$ACTION" = rollback && "$CONFIRM" = ROLLBACK_EXISTING_CLUSTER_GUARD ]]; then
  [[ -f "$STATE/prepared-at" ]] || { echo 'No prepared apply receipt'; exit 1; }
  [[ "$(cat "$STATE/identity")" = "$EXPECTED" ]] || exit 1
  IMAGE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["image"])' "$STATE/metadata.json")
  OVERLAY=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["overlay"])' "$STATE/metadata.json")
  check_cluster
  cmp "$STATE/override.json" "$OVERLAY" || { echo 'Override changed; refusing rollback'; exit 1; }
  python3 - "$STATE" <<'PY'
import json,pathlib,sys
s=pathlib.Path(sys.argv[1]); c=json.loads((s/'compose-before.json').read_text()); c['services']['postgres']['image']=json.loads((s/'metadata.json').read_text())['image']; (s/'rollback.json').write_text(json.dumps(c))
PY
  docker compose -f "$STATE/rollback.json" up -d --no-deps --pull never postgres
  wait_ready
  check_cluster
  mv "$OVERLAY" "$STATE/disabled-override.json"
  date -u +%FT%TZ > "$STATE/rolled-back-at"
else
  echo 'Usage: apply|rollback ABSOLUTE_STATE_DIR VERIFIED_CLUSTER_ID CONFIRM_TOKEN' >&2
  exit 2
fi
