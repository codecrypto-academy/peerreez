Hyperledger Explorer for this Fabric network

This folder contains example configuration to run Hyperledger Explorer against the local Fabric network in this repository.

Quick overview
- Explorer files:
  - `connection-profile.json` : Fabric network connection profile used by Explorer
  - `explorer-config.json` : Explorer `config.json` alternative placed at app/platform/fabric/config.json
  - `docker-compose-explorer.yaml` : docker-compose file that starts PostgreSQL and Explorer and mounts crypto materials

Prerequisites
- Docker and docker-compose installed
- The Fabric network running and Docker network `supply-chain` created (this repo's `docker/docker-compose.yaml` creates that network when you run deploy scripts)

Start Explorer (from `supply-chain-network/explorer`):

```bash
# from repository root
cd supply-chain-network/explorer
# create external network if not present (the main network compose uses name 'supply-chain')
if ! docker network ls --filter name=supply-chain -q >/dev/null; then
  docker network create supply-chain
fi

docker compose -f docker-compose-explorer.yaml up -d
```

Stop Explorer:

```bash
cd supply-chain-network/explorer
docker compose -f docker-compose-explorer.yaml down
```

Access UI: http://localhost:8080

Notes and adjustments
- The `connection-profile.json` references crypto material under `../crypto-config` relative to this folder; we mount `../crypto-config` as `/opt/explorer/crypto-config` in the container.
- If your peers or orderer use TLS (recommended), update the `url` values to `grpcs://...` and provide the correct `tlsCACerts` paths in the connection profile.
- Explorer expects admin credentials with access to query the channel. We mount the admin's certificate and private key from `crypto-config/.../users/Admin@...` into the container and reference them from `explorer-config.json`.

Optional: Connecting to remote Fabric (Kubernetes/Docker Swarm)
- For K8s: expose the peer/orderer and CA services via ClusterIP and create a connection profile using reachable hostnames. Provide TLS CA certs in the connection profile.
- For Swarm: same as Docker - ensure all services are reachable by name and mount or provide the crypto material to the Explorer container.

Compatibility
- This configuration targets Fabric 2.x networks and Explorer 1.x (the upstream Explorer project was historically compatible with Fabric v1.4 and v2.x; use the official image or build `hyperledger/blockchain-explorer` that supports Fabric v2+).
- If using Fabric 2.4/2.5 or later, ensure Explorer's versions of Fabric SDK and ledger APIs are compatible - you may need to build Explorer from source with updated dependencies.

Troubleshooting
- Check Explorer logs: `docker compose -f docker-compose-explorer.yaml logs -f explorer`
- Database issues: ensure `explorer-db` started and Explorer environment variables match DB settings.
- Network reachability: `docker exec -it explorer ping peer0.producer.supplychain.com` (inside container) to verify DNS.

If you'd like, I can:
- Generate a ready-to-run `Dockerfile` and build steps to build Explorer from source pinned to a specific release that matches Fabric version.
- Adjust the connection profile for TLS-enabled endpoints (switch to grpcs and correct CA cert paths) — tell me if your network uses TLS for peer/orderer endpoints.
