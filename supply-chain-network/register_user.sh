#!/usr/bin/env bash
set -euo pipefail

# register_user.sh
# Crear una identidad de usuario firmada por la CA generada por cryptogen
# Uso: ./register_user.sh <OrgShortName> <Username>
# Ejemplo: ./register_user.sh Producer alice

print_usage() {
  cat <<EOF
Usage: $0 <OrgShortName> <Username>

Example:
  $0 Producer alice

Notes:
  - This script expects the network was generated with cryptogen and that
    the CA key and cert exist under:
      crypto-config/peerOrganizations/<org>.supplychain.com/ca/
    and will create the new user under:
      crypto-config/peerOrganizations/<org>.supplychain.com/users/<user>@<org>/msp
  - Requires: openssl
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  print_usage
  exit 0
fi

if [ "$#" -ne 2 ]; then
  echo "Error: se requieren 2 argumentos" >&2
  print_usage
  exit 2
fi

ORG_SHORT="$1"
USERNAME="$2"

# Normalizar nombres
ORG_LOWER="$(echo "$ORG_SHORT" | tr '[:upper:]' '[:lower:]')"
DOMAIN="${ORG_LOWER}.supplychain.com"
ORG_DIR="crypto-config/peerOrganizations/${DOMAIN}"

if [ ! -d "$ORG_DIR" ]; then
  echo "Error: no se encontró la organización en: $ORG_DIR" >&2
  exit 3
fi

CA_CERT="$ORG_DIR/ca/ca.${DOMAIN}-cert.pem"
CA_KEY="$ORG_DIR/ca/priv_sk"
TLSCA_CERT="$ORG_DIR/tlsca/tlsca.${DOMAIN}-cert.pem"

if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
  echo "Error: certificado de CA o clave privada no encontrados en $ORG_DIR/ca" >&2
  exit 4
fi

USER_FULL="${USERNAME}@${DOMAIN}"
USER_MSP_DIR="$ORG_DIR/users/${USER_FULL}/msp"

echo "Creando identidad para: $USER_FULL"
echo "Organización: $ORG_SHORT -> dominio $DOMAIN"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

KEY_PEM="$TMPDIR/priv_sk.pem"
CSR_PEM="$TMPDIR/${USERNAME}.csr"
CERT_PEM="$TMPDIR/${USERNAME}.cert.pem"

echo "Generando clave privada (P-256)..."
openssl ecparam -name prime256v1 -genkey -noout -out "$KEY_PEM"

echo "Generando CSR..."
# Incluir OU=client para que NodeOUs lo identifique como cliente
openssl req -new -key "$KEY_PEM" -subj "/CN=${USER_FULL}/O=${ORG_SHORT}/OU=client" -out "$CSR_PEM"

echo "Firmando CSR con la CA local..."
# Crear un archivo de extensiones temporales para el certificado de usuario
EXTFILE="$TMPDIR/extfile.cnf"
cat > "$EXTFILE" <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature
extendedKeyUsage=clientAuth,serverAuth
EOF

openssl x509 -req -in "$CSR_PEM" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial -out "$CERT_PEM" -days 365 -sha256 -extfile "$EXTFILE"

echo "Creando estructura MSP del usuario en: $USER_MSP_DIR"
mkdir -p "$USER_MSP_DIR/signcerts" "$USER_MSP_DIR/keystore" "$USER_MSP_DIR/cacerts" "$USER_MSP_DIR/tlscacerts"

echo "Instalando cert y clave..."
cp "$CERT_PEM" "$USER_MSP_DIR/signcerts/${USER_FULL}-cert.pem"
cp "$KEY_PEM" "$USER_MSP_DIR/keystore/priv_sk"
chmod 600 "$USER_MSP_DIR/keystore/priv_sk"

echo "Copiando CA cert a cacerts..."
cp "$CA_CERT" "$USER_MSP_DIR/cacerts/ca.${DOMAIN}-cert.pem"

if [ -f "$TLSCA_CERT" ]; then
  echo "Copiando TLS CA a tlscacerts..."
  cp "$TLSCA_CERT" "$USER_MSP_DIR/tlscacerts/tlsca.${DOMAIN}-cert.pem"
fi

# Copiar config.yaml desde Admin para mantener NodeOUs
if [ -f "$ORG_DIR/users/Admin@${DOMAIN}/msp/config.yaml" ]; then
  cp "$ORG_DIR/users/Admin@${DOMAIN}/msp/config.yaml" "$USER_MSP_DIR/config.yaml"
else
  cat > "$USER_MSP_DIR/config.yaml" <<'EOF'
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.${DOMAIN}-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.${DOMAIN}-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.${DOMAIN}-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca.${DOMAIN}-cert.pem
    OrganizationalUnitIdentifier: orderer
EOF
fi

echo "Identidad creada correctamente: $USER_MSP_DIR"
echo "-> signcerts: $(ls -1 "$USER_MSP_DIR/signcerts")"
echo "-> keystore: $(ls -1 "$USER_MSP_DIR/keystore")"

echo "Hecho. Si desea que esta identidad sea Admin, copie el cert a admincerts/ manualmente."

exit 0
