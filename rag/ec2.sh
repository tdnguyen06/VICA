#!/usr/bin/env bash
# One-time setup on the EC2 instance (Ubuntu 22.04/24.04 or Amazon Linux 2023):
#   cd <repo>/rag/rag-conditional && cp .env.example .env && nano .env
#   sudo ./setup-ec2.sh
#
# Result: Docker + Compose + Buildx installed, Docker enabled at boot, and a systemd unit that
#   - on EC2 boot : runs `docker compose up -d` (builds the image the first time)
#   - on EC2 stop : runs `docker compose stop` (graceful Postgres shutdown, data kept)
set -euo pipefail

# Pinned plugin versions (checked against the GitHub releases on 2026-11-12). Bump deliberately.
COMPOSE_VERSION="v5.7.1"
BUILDX_VERSION="v0.39.0"
PLUGIN_DIR="/usr/local/lib/docker/cli-plugins"
SERVICE="rag-conditional"

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo"; exit 1; }

. /etc/os-release
case "${ID}" in
  ubuntu) DEFAULT_USER="ubuntu" ;;
  amzn)   [ "${VERSION_ID}" = "2023" ] || { echo "Only Amazon Linux 2023 is supported (found ${VERSION_ID})"; exit 1; }
          DEFAULT_USER="ec2-user" ;;
  *)      echo "Unsupported OS: ${ID}. Use Ubuntu or Amazon Linux 2023."; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64)  COMPOSE_ARCH="x86_64";  BUILDX_ARCH="amd64" ;;
  aarch64) COMPOSE_ARCH="aarch64"; BUILDX_ARCH="arm64" ;;
  *) echo "Unsupported CPU architecture: $(uname -m)"; exit 1 ;;
esac

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_USER="${SUDO_USER:-$DEFAULT_USER}"

[ -f "$APP_DIR/docker-compose.yml" ] || { echo "docker-compose.yml not found in $APP_DIR"; exit 1; }
[ -f "$APP_DIR/.env" ]               || { echo "Missing $APP_DIR/.env (cp .env.example .env, then fill it in)"; exit 1; }
# The Dockerfile builds from the repo root (context ../..): settings.gradle and buildSrc must exist
[ -f "$APP_DIR/../../settings.gradle" ] && [ -d "$APP_DIR/../../buildSrc" ] \
  || { echo "Repo root not found two levels above $APP_DIR. Clone the whole repo, not only the module."; exit 1; }

chmod 600 "$APP_DIR/.env"

# install_plugin <download-base-url> <asset-name> <destination>
# Downloads a release binary and verifies it against the release's checksums.txt.
install_plugin() {
  local base="$1" asset="$2" dest="$3" tmp line
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/${asset}" "${base}/${asset}"
  curl -fsSL -o "${tmp}/checksums.txt" "${base}/checksums.txt"
  line="$(awk -v a="*${asset}" '$2 == a' "${tmp}/checksums.txt")"
  [ -n "$line" ] || { echo "No checksum entry for ${asset}"; exit 1; }
  ( cd "$tmp" && echo "$line" | sha256sum -c - ) || { echo "Checksum mismatch for ${asset}, aborting"; exit 1; }
  mkdir -p "$(dirname "$dest")"
  install -m 0755 "${tmp}/${asset}" "$dest"
  rm -rf "$tmp"
}

echo ">> Installing Docker engine"
case "${ID}" in
  ubuntu) apt-get update && apt-get install -y docker.io curl ca-certificates ;;
  amzn)   dnf install -y docker ;;
esac
systemctl enable --now docker
usermod -aG docker "$RUN_USER"

# Compose and Buildx come from the official releases on both distros: Amazon Linux has no compose
# package, and the Dockerfile uses BuildKit features (--mount=type=cache) that need buildx.
if ! docker compose version >/dev/null 2>&1; then
  echo ">> Installing docker compose ${COMPOSE_VERSION}"
  install_plugin "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}" \
                 "docker-compose-linux-${COMPOSE_ARCH}" "${PLUGIN_DIR}/docker-compose"
fi
if ! docker buildx version >/dev/null 2>&1; then
  echo ">> Installing docker buildx ${BUILDX_VERSION}"
  install_plugin "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}" \
                 "buildx-${BUILDX_VERSION}.linux-${BUILDX_ARCH}" "${PLUGIN_DIR}/docker-buildx"
fi
docker compose version
docker buildx version

DOCKER_BIN="$(command -v docker)"
echo ">> Writing /etc/systemd/system/${SERVICE}.service"
cat > "/etc/systemd/system/${SERVICE}.service" <<UNIT
[Unit]
Description=RAG conditional stack (docker compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=${DOCKER_BIN} compose up -d
ExecStop=${DOCKER_BIN} compose stop
TimeoutStartSec=0
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "${SERVICE}.service"
systemctl start --no-block "${SERVICE}.service"

echo
echo "Done. The first start builds the image (several minutes). Follow it with:"
echo "  sudo journalctl -u ${SERVICE} -f      # compose up / build output"
echo "  cd ${APP_DIR} && sudo docker compose logs -f app"
echo "Log out and back in once so '${RUN_USER}' can run docker without sudo."