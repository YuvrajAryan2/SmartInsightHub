#!/bin/bash
###############################################################################
# dev.sh — Run frontend locally for development on Rocky Linux 8
#
# Usage:
#   chmod +x dev.sh
#   ./dev.sh
#
# Requires:
#   - terraform already applied (for the API URL)
#   - OR manually set VITE_API_BASE_URL in frontend/.env
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
INFRA_DIR="$SCRIPT_DIR/infra"

echo -e "${BOLD}${BLUE}cap-project — Local Dev Server${NC}"
echo ""

# Try to get API URL from Terraform output
if command -v terraform &>/dev/null && [ -f "$INFRA_DIR/terraform.tfvars" ]; then
    cd "$INFRA_DIR"
    API_URL=$(terraform output -raw api_base_url 2>/dev/null || echo "")
    cd "$SCRIPT_DIR"

    if [ -n "$API_URL" ]; then
        log "Got API URL from Terraform: $API_URL"
        echo "VITE_API_BASE_URL=$API_URL" > "$FRONTEND_DIR/.env"
    fi
fi

# Check .env exists
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    warn "frontend/.env not found."
    echo ""
    echo "  Create it manually:"
    echo "    echo 'VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.ca-central-1.amazonaws.com/prod' > frontend/.env"
    echo ""
    exit 1
fi

log ".env: $(cat $FRONTEND_DIR/.env)"

# Install deps if needed
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    info "Installing npm dependencies..."
    npm install --silent
fi

# Start dev server
info "Starting Vite dev server..."
echo ""
echo -e "  ${GREEN}Local:${NC}   http://localhost:5173"
echo -e "  ${GREEN}Network:${NC} http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

npm run dev -- --host 0.0.0.0
