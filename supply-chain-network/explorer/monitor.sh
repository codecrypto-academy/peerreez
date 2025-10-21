#!/usr/bin/env bash
## monitor.sh - idempotent launcher that ensures Postgres + Hyperledger Explorer
## are running, prepares the wallet/admin identity, triggers sync and prints
## network information using Explorer (and DB) after sync.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT_DIR/explorer-monitor.log"

# CLI: support running the full ordered sequence (cleanup -> deploy -> validate -> create_wallet_local -> monitor)
RUN_ALL=0
if [ "${1:-}" = "--run-all" ] || [ "${RUN_ALL:-}" = "1" ] || [ "${RUN_ALL_ENV:-}" = "1" ]; then
  RUN_ALL=1
fi

run_script() {
  local script="$1"
  local name="$2"
  if [ -f "$script" ]; then
    log "Running $name script: $script"
    (cd "$(dirname "$script")" && bash "$(basename "$script")") 2>&1 | tee -a "$LOG" || die "$name failed (see $LOG)"
  else
    die "$name script not found: $script"
  fi
}

run_all_sequence() {
  log "=== RUN_ALL: executing cleanup -> deploy -> validate -> create_wallet_local ==="
  run_script "$ROOT_DIR/cleanup.sh" "cleanup"
  run_script "$ROOT_DIR/deploy.sh" "deploy"
  run_script "$ROOT_DIR/validate.sh" "validate"
  run_script "$ROOT_DIR/explorer/create_wallet_local.sh" "create_wallet_local"
  log "=== RUN_ALL complete ==="
}

EXPLORER_IMG=${EXPLORER_IMG:-hyperledger/explorer:local}
EXPLORER_CONTAINER=${EXPLORER_CONTAINER:-explorer}
DB_CONTAINER=${DB_CONTAINER:-explorer-db}
NETWORK=${NETWORK:-supply-chain-network}
DB_PASS=${DB_PASS:-password}
DB_NAME=${DB_NAME:-explorerdb}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-explorer}
DB_DATA_DIR=${DB_DATA_DIR:-$HOME/explorer_db_data}
WALLET_DIR="$ROOT_DIR/explorer/wallet"
CRYPTO_DIR="$ROOT_DIR/crypto-config"
CONN_PROFILE="$ROOT_DIR/explorer/connection-profile.json"
EXPLORER_CONFIG="$ROOT_DIR/explorer/explorer-config.json"
SQL_FILE="$ROOT_DIR/explorer/explorerpg.sql"
PATCHED_PGSERVICE="$ROOT_DIR/explorer/PgService.patched.js"
AUTH_BYPASS="$ROOT_DIR/explorer/AuthCheck.patched.js"
CREATE_WALLET_SCRIPT="$ROOT_DIR/explorer/create_wallet_local.sh"
INSERT_USER_SQL="$ROOT_DIR/explorer/insert_user.sql"

log() { echo "$(date -u) - $*" | tee -a "$LOG"; }
die() { echo "$(date -u) - ERROR: $*" | tee -a "$LOG"; exit 1; }

echo "$(date -u) - START monitor" | tee -a "$LOG"

# Basic prechecks
log "Checking prerequisites..."
command -v docker >/dev/null || die "docker not found in PATH"
[ -d "$CRYPTO_DIR" ] || die "crypto-config not found at $CRYPTO_DIR"
[ -d "$WALLET_DIR" ] || { log "Creating wallet dir $WALLET_DIR"; mkdir -p "$WALLET_DIR"; }
[ -f "$CONN_PROFILE" ] || die "connection profile missing: $CONN_PROFILE"
[ -f "$EXPLORER_CONFIG" ] || die "explorer config missing: $EXPLORER_CONFIG"
[ -f "$SQL_FILE" ] || die "SQL schema missing: $SQL_FILE"

# If requested, run the full ordered sequence before starting Explorer orchestration.
if [ "$RUN_ALL" -eq 1 ]; then
  # If this is running in a non-interactive environment we proceed. If interactive, ask for confirmation.
  if [ -t 0 ]; then
    echo "You requested --run-all which will run cleanup/deploy/validate/create_wallet_local. Continue? [y/N] "
    read -r ans || true
    if [ "${ans,,}" != "y" ]; then
      log "User aborted run-all sequence"
    else
      run_all_sequence
    fi
  else
    # non-interactive (CI) - proceed
    run_all_sequence
  fi
fi

# Ensure network exists
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  log "Docker network $NETWORK not found, creating..."
  docker network create "$NETWORK" || true
fi

# Ensure the Postgres host data directory exists and is visible to the host user
ensure_db_dir_visibility() {
  local d="${DB_DATA_DIR:-$HOME/explorer_db_data}"
  # Allow opt-out for environments where this is undesired
  if [ "${SKIP_DB_PERM_FIX:-0}" = "1" ]; then
    log "SKIP_DB_PERM_FIX=1 set; skipping explorer_db_data permission fix"
    return 0
  fi
  if [ ! -d "$d" ]; then
    log "Creating Postgres data dir: $d"
    mkdir -p "$d" || die "Failed to create $d"
  fi
  # Make sure dir is owned by the current user so tools like Turbopack can traverse it
  log "Setting ownership and permissive read/execute for $d (host-visible)"
  # chown/cap may fail in some environments; best-effort
  chown -R "$(id -u):$(id -g)" "$d" 2>/dev/null || true
  # Make directories traversable and readable, files readable
  find "$d" -type d -exec chmod 755 {} + 2>/dev/null || true
  find "$d" -type f -exec chmod 644 {} + 2>/dev/null || true
  # Also ensure the top-level dir is at least executable for traversal
  chmod 755 "$d" 2>/dev/null || true
}

# Also ensure any repo-local explorer_db_data (if it exists) is host-visible
ensure_repo_db_dir_visibility() {
  local repo_d="$ROOT_DIR/../explorer_db_data"
  # Always ensure the repo-local path exists and is readable/traversable by the host user.
  # This prevents file-watchers (Turbopack/Next) from encountering permission denied errors
  # if some other process or older run left the directory missing or inaccessible.
  if [ "${SKIP_REPO_DB_FIX:-0}" = "1" ]; then
    log "SKIP_REPO_DB_FIX=1 set; skipping repo-local explorer_db_data fix"
    return 0
  fi
  if [ ! -e "$repo_d" ]; then
    log "Repo-local explorer_db_data not present at $repo_d — creating placeholder symlink to $DB_DATA_DIR"
    mkdir -p "$DB_DATA_DIR" 2>/dev/null || true
    ln -s "$DB_DATA_DIR" "$repo_d" 2>/dev/null || mkdir -p "$repo_d" || true
  else
    # If it's already a symlink, ensure it points to DB_DATA_DIR
    if [ -L "$repo_d" ]; then
      TARGET=$(readlink -f "$repo_d" 2>/dev/null || true)
      if [ "$TARGET" != "$(readlink -f "$DB_DATA_DIR" 2>/dev/null)" ]; then
        log "Repo-local explorer_db_data is a symlink to $TARGET; updating to point to $DB_DATA_DIR"
        rm -f "$repo_d" || true
        ln -s "$DB_DATA_DIR" "$repo_d" || true
      else
        log "Repo-local explorer_db_data already symlinked to $DB_DATA_DIR"
      fi
    else
      # It's a real directory. To avoid permission surprises, move it to a backup and symlink to DB_DATA_DIR.
      if [ "$(readlink -f "$repo_d")" = "$(readlink -f "$DB_DATA_DIR")" ]; then
        log "Repo-local and DB_DATA_DIR point to the same path; nothing to do"
      else
        TS=$(date +%s)
        BACKUP="${repo_d}.bak.${TS}"
        log "Repo-local explorer_db_data is a real directory; moving to $BACKUP and creating symlink to $DB_DATA_DIR (safe-guard)"
        mv "$repo_d" "$BACKUP" 2>/dev/null || { log "Failed to move $repo_d to $BACKUP; leaving as-is"; return 0; }
        mkdir -p "$DB_DATA_DIR" 2>/dev/null || true
        ln -s "$DB_DATA_DIR" "$repo_d" 2>/dev/null || mkdir -p "$repo_d" || true
        log "Moved original to $BACKUP; created symlink $repo_d -> $DB_DATA_DIR"
      fi
    fi
  fi
  # Ensure the target DB_DATA_DIR is owned/readable
  chown -R "$(id -u):$(id -g)" "$DB_DATA_DIR" 2>/dev/null || true
  find "$DB_DATA_DIR" -type d -exec chmod 755 {} + 2>/dev/null || true
  find "$DB_DATA_DIR" -type f -exec chmod 644 {} + 2>/dev/null || true
  chmod 755 "$DB_DATA_DIR" 2>/dev/null || true
}


# Start Postgres if not running
if ! docker ps --format '{{.Names}}' | grep -q "^$DB_CONTAINER\$"; then
  # Ensure the host data dir exists and is visible to host processes (avoid Turbopack EACCES)
  ensure_db_dir_visibility
  # If a repo-local explorer_db_data exists (created previously), make it visible too
  ensure_repo_db_dir_visibility
  log "Starting Postgres container ($DB_CONTAINER) on network $NETWORK"
  docker run -d --name "$DB_CONTAINER" --network "$NETWORK" \
    -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$DB_PASS" -e POSTGRES_DB="$DB_NAME" \
    -v "$DB_DATA_DIR":/var/lib/postgresql/data \
    postgres:12
else
  log "Postgres container $DB_CONTAINER already running"
fi

# Wait for Postgres to accept connections (timeout)
log "Waiting for Postgres to be ready (as $DB_USER)..."
SECS=0
until docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1" >/dev/null 2>&1; do
  sleep 1
  SECS=$((SECS+1))
  if [ $SECS -ge 120 ]; then
    die "Postgres did not become ready after ${SECS}s"
  fi
done
log "Postgres ready"

# Apply SQL schema (idempotent)
log "Applying Explorer SQL schema (placeholders will be substituted)"
TMP_SQL_HOST="/tmp/explorerpg.apply.sql"
sed -e "s/:user/$DB_USER/g" -e "s/:passwd/'$DB_PASS'/g" -e "s/:dbname/$DB_NAME/g" "$SQL_FILE" > "$TMP_SQL_HOST"
docker cp "$TMP_SQL_HOST" "$DB_CONTAINER":/tmp/explorerpg.apply.sql
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -f /tmp/explorerpg.apply.sql || log "Schema apply returned non-zero (may already exist)"
rm -f "$TMP_SQL_HOST" || true

# Ensure explorer wallet identity exists (create if helper present)
if [ ! -d "$WALLET_DIR/supply-chain-network" ] || ! ls "$WALLET_DIR/supply-chain-network" 2>/dev/null | grep -q exploreradmin; then
  log "Explorer admin identity missing in wallet; attempting to create via helper"
  if [ -x "$CREATE_WALLET_SCRIPT" ]; then
    (cd "$ROOT_DIR/explorer" && ./create_wallet_local.sh) || log "create_wallet_local.sh failed"
  else
    log "No create_wallet_local.sh present; ensure exploreradmin identity is available in $WALLET_DIR/supply-chain-network"
  fi
else
  log "Explorer wallet identity present"
fi

# If there is a producer_admin identity in wallet, copy it to exploreradmin.id (idempotent)
PRODUCER_ID_FILE="$WALLET_DIR/supply-chain-network/producer_admin.id"
EXPL_ID_FILE="$WALLET_DIR/supply-chain-network/exploreradmin.id"
if [ -f "$PRODUCER_ID_FILE" ]; then
  if ! cmp -s "$PRODUCER_ID_FILE" "$EXPL_ID_FILE" 2>/dev/null; then
    log "Copying producer admin identity to exploreradmin.id"
    cp "$PRODUCER_ID_FILE" "$EXPL_ID_FILE"
    chmod 644 "$EXPL_ID_FILE" || true
  else
    log "exploreradmin.id already matches producer_admin.id"
  fi
fi

# Fix wallet permissions for node user inside container (best-effort)
log "Fixing wallet ownership to uid 1000 (node user)"
docker run --rm -v "$WALLET_DIR":/opt/explorer/wallet alpine sh -c 'chown -R 1000:1000 /opt/explorer/wallet || true'

# Ensure Explorer image exists (optional build)
if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^$EXPLORER_IMG\$"; then
  log "Explorer image $EXPLORER_IMG not present locally — attempting to pull"
  if docker pull "$EXPLORER_IMG" >/dev/null 2>&1; then
    log "Pulled $EXPLORER_IMG"
  else
    # If requested tag is the local dev tag for upstream image, try pulling latest and tagging
    if [ "$EXPLORER_IMG" = "hyperledger/explorer:local" ]; then
      log "Failed to pull $EXPLORER_IMG; attempting to pull hyperledger/explorer:latest and tag as :local"
      if docker pull hyperledger/explorer:latest >/dev/null 2>&1; then
        docker tag hyperledger/explorer:latest hyperledger/explorer:local || true
        log "Tagged hyperledger/explorer:latest as hyperledger/explorer:local"
      else
        log "Failed to pull hyperledger/explorer:latest; explorer container start may fail"
      fi
    else
      log "Failed to pull $EXPLORER_IMG; explorer container start may fail"
    fi
  fi
else
  log "Explorer image $EXPLORER_IMG found"
fi

# Remove any existing container with the same name to avoid 'name in use' conflict
if docker ps -a --format '{{.Names}}' | grep -q "^$EXPLORER_CONTAINER\$"; then
  EXISTING_ID=$(docker ps -a --filter name="$EXPLORER_CONTAINER" --format '{{.ID}}' | head -n1)
  if [ -n "$EXISTING_ID" ]; then
    log "Removing existing container $EXPLORER_CONTAINER ($EXISTING_ID) to avoid conflicts"
    docker rm -f "$EXISTING_ID" || log "failed to remove existing explorer container"
  fi
fi

# Start Explorer container with retry and auto-fix behavior
log "Starting Explorer container ($EXPLORER_CONTAINER)"
PG_MOUNT_ARG=""
if [ -f "$PATCHED_PGSERVICE" ]; then
  log "Mounting patched PgService from $PATCHED_PGSERVICE"
  PG_MOUNT_ARG="-v $PATCHED_PGSERVICE:/opt/explorer/app/persistence/postgreSQL/PgService.js:ro"
fi
AUTH_MOUNT_ARG=""
if [ -f "$AUTH_BYPASS" ]; then
  log "Auth bypass file present at $AUTH_BYPASS (will be mounted)"
  AUTH_MOUNT_ARG="-v $AUTH_BYPASS:/opt/explorer/app/middleware/auth-check.js:ro"
fi

# Resolve dynamic keystore filenames: crypto keystore filenames change each deploy
# Create resolved copies of connection-profile and explorer-config that point to the
# actual keystore/private key filenames so Explorer can find them inside the container.
RESOLVED_CONN="$ROOT_DIR/explorer/connection-profile.resolved.json"
RESOLVED_CFG="$ROOT_DIR/explorer/explorer-config.resolved.json"
resolve_keystores() {
  # Start from originals
  cp -f "$CONN_PROFILE" "$RESOLVED_CONN"
  cp -f "$EXPLORER_CONFIG" "$RESOLVED_CFG"

  # Find all keystore directories under crypto-config (users/*/msp/keystore)
  find "$CRYPTO_DIR" -type d -path "*/users/*/msp/keystore" 2>/dev/null | while read -r KS_DIR; do
    # pick the first private key file in that keystore dir
    KEYFILE=$(ls -1 "$KS_DIR" 2>/dev/null | head -n1 || true)
    if [ -z "$KEYFILE" ]; then
      continue
    fi
    # build container path for this keystore dir: replace host crypto dir with /opt/explorer/crypto-config
    CONTAINER_KS_DIR="${KS_DIR/#$CRYPTO_DIR/\/opt\/explorer\/crypto-config}"
  # Use perl with \Q..\E to safely replace any filename after the container dir
  perl -0777 -pe "s/\Q${CONTAINER_KS_DIR}/\E[^\"']+/${CONTAINER_KS_DIR}\/$KEYFILE/g" -i "$RESOLVED_CONN" 2>/dev/null || true
  perl -0777 -pe "s/\Q${CONTAINER_KS_DIR}/\E[^\"']+/${CONTAINER_KS_DIR}\/$KEYFILE/g" -i "$RESOLVED_CFG" 2>/dev/null || true
    log "Resolved keystore for $CONTAINER_KS_DIR -> $KEYFILE"
  done
}

# create resolved files before starting the container
resolve_keystores || log "Keystore resolution had issues; continuing with original profiles"

# By default mount the resolved copies if they were created, else fall back to originals
MOUNT_CONN="$CONN_PROFILE"
MOUNT_CFG="$EXPLORER_CONFIG"
if [ -f "$RESOLVED_CONN" ]; then
  MOUNT_CONN="$RESOLVED_CONN"
fi
if [ -f "$RESOLVED_CFG" ]; then
  MOUNT_CFG="$RESOLVED_CFG"
fi
START_ATTEMPTS=${START_ATTEMPTS:-3}
START_SLEEP=${START_SLEEP:-6}
ATTEMPT=0
while [ $ATTEMPT -lt $START_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT+1))
  log "Explorer start attempt $ATTEMPT/$START_ATTEMPTS"
  docker run -d --name "$EXPLORER_CONTAINER" --network "$NETWORK" -p 8080:8080 \
    -v "$WALLET_DIR":/opt/explorer/wallet:rw \
    -v "$CRYPTO_DIR":/opt/explorer/crypto-config:ro \
    -v "$MOUNT_CONN":/opt/explorer/connection-profile/connection-profile.json:ro \
    -v "$MOUNT_CFG":/opt/explorer/app/platform/fabric/config.json:ro \
    $PG_MOUNT_ARG $AUTH_MOUNT_ARG \
    -e DATABASE_HOST="$DB_CONTAINER" -e DATABASE_DATABASE="$DB_NAME" -e DATABASE_NAME="$DB_NAME" \
    -e DATABASE_USERNAME="$DB_USER" -e DATABASE_PASSWD="$DB_PASS" -e DATABASE_PORT="$DB_PORT" \
    "$EXPLORER_IMG" >/tmp/explorer_start_id 2>/tmp/explorer_start_err || true
  CID=$(cat /tmp/explorer_start_id 2>/dev/null || true)
  sleep 2
  # If container started and is running, break
  if [ -n "$CID" ] && docker ps --format '{{.ID}}' | grep -q "^${CID:0:12}"; then
    log "Explorer container started (cid=${CID})"
    rm -f /tmp/explorer_start_id /tmp/explorer_start_err || true
    break
  fi
  # capture logs to help debugging
  log "Explorer failed to start on attempt $ATTEMPT; collecting debug logs"
  if [ -f /root/.npm/_logs/*-debug.log ]; then
    ls -1 /root/.npm/_logs/*-debug.log 2>/dev/null || true
  fi
  # try to remediate: copy producer_admin into exploreradmin (if present)
  if [ -f "$PRODUCER_ID_FILE" ]; then
    log "Attempting auto-fix: copying $PRODUCER_ID_FILE -> $EXPL_ID_FILE and retry"
    cp -f "$PRODUCER_ID_FILE" "$EXPL_ID_FILE" || true
    chmod 644 "$EXPL_ID_FILE" || true
  fi
  # remove any partially created container then sleep before retry
  if docker ps -a --format '{{.Names}}' | grep -q "^$EXPLORER_CONTAINER\$"; then
    log "Removing failed/partial container $EXPLORER_CONTAINER"
    docker rm -f "$EXPLORER_CONTAINER" >/dev/null 2>&1 || true
  fi
  sleep $START_SLEEP
done

if ! docker ps --format '{{.Names}}' | grep -q "^$EXPLORER_CONTAINER\$"; then
  die "Explorer container failed to start after $START_ATTEMPTS attempts; check logs"
fi

# Ensure explorer is attached to the network
if ! docker inspect "$EXPLORER_CONTAINER" >/dev/null 2>&1; then
  die "Explorer container not found after start"
fi
if ! docker network inspect "$NETWORK" | grep -q "\"$EXPLORER_CONTAINER\""; then
  log "Connecting $EXPLORER_CONTAINER to network $NETWORK"
  docker network connect "$NETWORK" "$EXPLORER_CONTAINER" || true
fi

# Start sync process inside Explorer and wait for discovery
log "Triggering Explorer sync and waiting for discovery (timeout 180s)"
docker exec -d "$EXPLORER_CONTAINER" sh -c '/opt/explorer/syncstart.sh || true'

FOUND=0
MAX_SECS=180
SLEEP=3
TRIES=$((MAX_SECS / SLEEP))
for i in $(seq 1 $TRIES); do
  sleep $SLEEP
  docker exec "$EXPLORER_CONTAINER" sh -c 'if [ -f /opt/explorer/logs/sync/sync.log ]; then tail -n 500 /opt/explorer/logs/sync/sync.log; else tail -n 500 /opt/explorer/logs/app/app.log; fi' >/tmp/explorer_sync_check.log 2>/dev/null || true
  if grep -q -E "queryChannels|Genesis Block|Discovery|Succeeded to send discovery request" /tmp/explorer_sync_check.log; then
    FOUND=1
    log "Discovery messages observed (iteration $i)"
    break
  fi
  log "Waiting for discovery... (attempt $i/$TRIES)"
done

if [ "$FOUND" -ne 1 ]; then
  log "Discovery not observed after ${MAX_SECS}s. Dumping last lines for debugging"
  tail -n 200 /tmp/explorer_sync_check.log | sed 's/^/[SYNC] /' | tee -a "$LOG" || true
  docker exec "$EXPLORER_CONTAINER" sh -c 'tail -n 200 /opt/explorer/logs/app/app.log' 2>/dev/null | sed 's/^/[APP] /' | tee -a "$LOG" || true
  # try one more sync trigger before failing
  log "Re-triggering syncstart.sh and waiting a short while"
  docker exec -d "$EXPLORER_CONTAINER" sh -c '/opt/explorer/syncstart.sh || true'
  sleep 8
  docker exec "$EXPLORER_CONTAINER" sh -c 'if [ -f /opt/explorer/logs/sync/sync.log ]; then tail -n 200 /opt/explorer/logs/sync/sync.log; else tail -n 200 /opt/explorer/logs/app/app.log; fi' >/tmp/explorer_sync_check.log 2>/dev/null || true
  if grep -q -E "queryChannels|Genesis Block|Discovery" /tmp/explorer_sync_check.log; then
    FOUND=1
    log "Discovery observed after retrigger"
  else
    log "Discovery failed after retries; continuing to collect info (may need manual debugging)"
  fi
fi

log "Discovery phase complete (found=${FOUND})"

# 9) Smoke tests: HTTP and DB checks
log "Running smoke tests..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "000")
BLOCKS_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM blocks;" | tr -d '[:space:]' || echo "0")
TX_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM transactions;" | tr -d '[:space:]' || echo "0")
log "http=$HTTP_CODE blocks=$BLOCKS_COUNT txs=$TX_COUNT"

# 10) Show Explorer network info via REST (best-effort, several endpoints attempted)
show_http() {
  local url="$1"
  # Perform request but silently ignore 401 responses to avoid noisy logs
  HTTP_BODY_TMP="/tmp/explorer_http_$(basename $(echo $url | sed 's/[^a-zA-Z0-9]/_/g')).out"
  CODE=$(curl -sS --max-time 10 -w "%{http_code}" -o "$HTTP_BODY_TMP" "$url" 2>/dev/null || echo "000")
  if [ "$CODE" = "401" ]; then
    # skip logging 401 responses
    return 0
  fi
  log "HTTP GET $url"
  log "  -> status=$CODE"
  if [ -s "$HTTP_BODY_TMP" ]; then
    log "  -> body (first 400 chars):"
    head -c 400 "$HTTP_BODY_TMP" | sed 's/^/    /'
  fi
}

if [ "$HTTP_CODE" = "200" ]; then
  # Common Explorer endpoints (may vary by version) - attempt each
  show_http "http://localhost:8080/api/channels"
  show_http "http://localhost:8080/api/channels/supply-chain-channel/blocks?limit=10"
  show_http "http://localhost:8080/api/blocks?limit=10"
  show_http "http://localhost:8080/api/transactions?limit=10"
else
  log "Explorer UI not reachable (http=$HTTP_CODE) — will show DB-based info instead"
fi

# Ensure admin UI user exists (insert_user.sql is idempotent)
if [ -f "$INSERT_USER_SQL" ]; then
  USER_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM users WHERE username='localadmin' LIMIT 1;" | tr -d '[:space:]' || echo "")
  if [ -z "$USER_EXISTS" ]; then
    log "Inserting admin UI user via $INSERT_USER_SQL"
    docker cp "$INSERT_USER_SQL" "$DB_CONTAINER":/tmp/insert_user.sql
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/insert_user.sql || log "insert_user.sql returned non-zero"
  else
    log "Admin UI user already present"
  fi
else
  log "No insert_user.sql present; skipping admin user creation"
fi

# 11) Attempt login and optionally create token injector
TMP_LOGIN_JSON_HOST="/tmp/explorer_login.json"
curl -sS -X POST http://localhost:8080/auth/login -H 'Content-Type: application/json' -d '{"user":"localadmin","password":"explorerpw","network":"supply-chain-network"}' -o "$TMP_LOGIN_JSON_HOST" || true
TOKEN=$(jq -r .token "$TMP_LOGIN_JSON_HOST" 2>/dev/null || true)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  log "Obtained auth token for localadmin"
  INJECT_HTML_DIR="$ROOT_DIR/explorer"
  INJECT_HTML_FILE="$INJECT_HTML_DIR/token_inject.html"
  mkdir -p "$INJECT_HTML_DIR"
  cat > "$INJECT_HTML_FILE" <<HTML
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Explorer auto-login</title></head>
  <body>
    <p>Auto login to Hyperledger Explorer. Redirecting...</p>
    <script>
      try { localStorage.setItem('token', '${TOKEN}'); localStorage.setItem('network','supply-chain-network'); } catch(e) {}
      window.location = 'http://localhost:8080/';
    </script>
  </body>
</html>
HTML
  chmod 644 "$INJECT_HTML_FILE" || true
  if command -v python3 >/dev/null 2>&1; then
    (cd "$INJECT_HTML_DIR" && nohup python3 -m http.server 8090 >/dev/null 2>&1 &) || true
    log "Token injector available at http://localhost:8090/token_inject.html"
  else
    log "Token injector created at $INJECT_HTML_FILE"
  fi
else
  log "No token obtained from /auth/login; UI may require manual login or auth bypass"
fi

log "Monitor finished"
exit 0
