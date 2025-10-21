#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRYPTO_DIR="$ROOT_DIR/crypto-config"
WALLET_DIR="$ROOT_DIR/explorer/wallet/supply-chain-network"

mkdir -p "$WALLET_DIR"
echo "Creating filesystem wallet identities under $WALLET_DIR"
found=0

for orgdir in "$CRYPTO_DIR"/peerOrganizations/*; do
  [ -d "$orgdir" ] || continue
  domain=$(basename "$orgdir")
  admin_msp_dir="$orgdir/users/Admin@$domain/msp"
  if [ ! -d "$admin_msp_dir" ]; then
    echo "No admin msp dir for $domain, skipping"
    continue
  fi

  signcert=$(ls "$admin_msp_dir"/signcerts/*.pem 2>/dev/null | head -n1 || true)
  keyfile=$(ls "$admin_msp_dir"/keystore/* 2>/dev/null | head -n1 || true)
  if [ -z "$signcert" ] || [ -z "$keyfile" ]; then
    echo "Missing cert or key for $domain, skipping"
    continue
  fi

  # Derive a reasonable MSP id from domain: producer.supplychain.com -> ProducerMSP
  prefix="${domain%%.*}"
  mspId="${prefix^}MSP"

  out_file="$WALLET_DIR/${prefix}_admin.id"

  if command -v jq >/dev/null 2>&1; then
    cert_text=$(sed 's/\r//g' "$signcert")
    key_text=$(sed 's/\r//g' "$keyfile")
    jq -n --arg cert "$cert_text" --arg key "$key_text" --arg msp "$mspId" \
      '{credentials:{certificate:$cert,privateKey:$key},mspId:$msp,type:"X.509",version:1}' > "$out_file"
  else
    # Fallback to python for safe JSON escaping
    python3 - <<PY > "$out_file"
import json
cert=open(${signcert!r}).read()
key=open(${keyfile!r}).read()
obj={
  "credentials": {"certificate": cert, "privateKey": key},
  "mspId": ${mspId!r},
  "type": "X.509",
  "version": 1
}
print(json.dumps(obj))
PY
  fi

  chmod 644 "$out_file"
  echo "Wrote wallet identity: $out_file (mspId=$mspId)"
  found=1
done

if [ "$found" -eq 0 ]; then
  echo "No admin identities created - no Admin cert/key pairs found under $CRYPTO_DIR/peerOrganizations/*/users/Admin@*/msp"
  exit 1
fi

echo "Wallet generation complete."
