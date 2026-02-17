#!/bin/bash
###############################################################################
# setup-rocky8.sh — Full Dev & Deployment Setup for Rocky Linux 8
# Project: cap-project (Smart Talent Insight Hub)
#
# Run this script as a regular user with sudo access:
#   chmod +x setup-rocky8.sh
#   ./setup-rocky8.sh
#
# What this installs:
#   - System dependencies (git, curl, unzip, gcc, etc.)
#   - Python 3.12
#   - Node.js 20 (via NodeSource)
#   - AWS CLI v2
#   - Terraform 1.7
#   - Verifies all tools work
###############################################################################

set -euo pipefail   # Exit on error, unset variable, pipe failure

# ── COLOURS ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'   # No colour

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${BOLD}${BLUE}════════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${BLUE}  $1${NC}"; \
            echo -e "${BOLD}${BLUE}════════════════════════════════════════${NC}"; }

###############################################################################
# SECTION 1: SYSTEM PACKAGES
###############################################################################
section "1/7  System Packages"

info "Updating system packages..."
sudo dnf update -y --quiet

info "Installing base dependencies..."
sudo dnf install -y \
    git \
    curl \
    wget \
    unzip \
    tar \
    gcc \
    gcc-c++ \
    make \
    openssl \
    openssl-devel \
    bzip2 \
    bzip2-devel \
    libffi-devel \
    zlib-devel \
    xz-devel \
    readline-devel \
    sqlite-devel \
    jq \
    vim \
    --quiet

log "System packages installed"

###############################################################################
# SECTION 2: PYTHON 3.12
###############################################################################
section "2/7  Python 3.12"

# Rocky Linux 8 ships Python 3.6 by default — we need 3.12
if command -v python3.12 &>/dev/null; then
    warn "Python 3.12 already installed: $(python3.12 --version)"
else
    info "Enabling CRB (CodeReady Builder) repo..."
    sudo dnf install -y epel-release --quiet
    sudo dnf config-manager --set-enabled powertools 2>/dev/null || \
    sudo dnf config-manager --set-enabled crb 2>/dev/null || true

    info "Installing Python 3.12 from source (this takes ~3 minutes)..."
    PYTHON_VERSION="3.12.3"
    cd /tmp
    wget -q "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz"
    tar xzf "Python-${PYTHON_VERSION}.tgz"
    cd "Python-${PYTHON_VERSION}"
    ./configure --enable-optimizations --quiet
    make -j"$(nproc)" --quiet
    sudo make altinstall --quiet
    cd ~
    rm -rf /tmp/Python-${PYTHON_VERSION}*
fi

# Make pip3.12 available
sudo ln -sf /usr/local/bin/python3.12 /usr/local/bin/python3.12
python3.12 -m ensurepip --upgrade 2>/dev/null || true
python3.12 -m pip install --upgrade pip --quiet

log "Python 3.12 ready: $(python3.12 --version)"

###############################################################################
# SECTION 3: NODE.JS 20 (via NodeSource)
###############################################################################
section "3/7  Node.js 20"

if command -v node &>/dev/null && [[ "$(node --version)" == v20* ]]; then
    warn "Node.js 20 already installed: $(node --version)"
else
    info "Adding NodeSource repo for Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - --quiet
    sudo dnf install -y nodejs --quiet
fi

log "Node.js ready: $(node --version)"
log "npm ready:     $(npm --version)"

###############################################################################
# SECTION 4: AWS CLI v2
###############################################################################
section "4/7  AWS CLI v2"

if command -v aws &>/dev/null; then
    warn "AWS CLI already installed: $(aws --version)"
else
    info "Downloading AWS CLI v2..."
    cd /tmp
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf /tmp/aws /tmp/awscliv2.zip
    cd ~
fi

log "AWS CLI ready: $(aws --version)"

###############################################################################
# SECTION 5: TERRAFORM 1.7
###############################################################################
section "5/7  Terraform"

if command -v terraform &>/dev/null; then
    warn "Terraform already installed: $(terraform version | head -1)"
else
    info "Adding HashiCorp repo..."
    sudo dnf install -y dnf-plugins-core --quiet
    sudo dnf config-manager --add-repo \
        https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
    sudo dnf install -y terraform --quiet
fi

log "Terraform ready: $(terraform version | head -1)"

###############################################################################
# SECTION 6: VERIFY ALL TOOLS
###############################################################################
section "6/7  Verification"

ALL_OK=true

check_tool() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" &>/dev/null; then
        log "$name: $(eval $cmd 2>&1 | head -1)"
    else
        error "$name NOT FOUND — installation may have failed"
        ALL_OK=false
    fi
}

check_tool "Python 3.12" "python3.12 --version"
check_tool "pip"         "python3.12 -m pip --version"
check_tool "Node.js"     "node --version"
check_tool "npm"         "npm --version"
check_tool "AWS CLI"     "aws --version"
check_tool "Terraform"   "terraform version"
check_tool "Git"         "git --version"
check_tool "jq"          "jq --version"

if [ "$ALL_OK" = true ]; then
    log "All tools verified successfully!"
else
    error "Some tools failed — check output above"
fi

###############################################################################
# SECTION 7: AWS CONFIGURE REMINDER
###############################################################################
section "7/7  AWS Configuration"

if aws sts get-caller-identity &>/dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    USER=$(aws sts get-caller-identity --query Arn --output text)
    log "AWS already configured!"
    log "Account: $ACCOUNT"
    log "Identity: $USER"
else
    warn "AWS CLI not configured yet."
    echo ""
    echo -e "${YELLOW}Run this now and enter your credentials:${NC}"
    echo ""
    echo "    aws configure"
    echo ""
    echo "  AWS Access Key ID:     [from IAM user]"
    echo "  AWS Secret Access Key: [from IAM user]"
    echo "  Default region:        ca-central-1"
    echo "  Default output format: json"
    echo ""
fi

###############################################################################
# DONE
###############################################################################
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   Setup complete! Ready to deploy.       ║${NC}"
echo -e "${GREEN}${BOLD}║   Run: ./deploy.sh                       ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
