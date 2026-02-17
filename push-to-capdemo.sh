#!/bin/bash
###############################################################################
# push-to-capdemo.sh — Push project to YuvrajAryan2/capDemo on GitHub
#
# Run this ONCE to initialise the capDemo repo with all your project files.
#
# Usage:
#   chmod +x push-to-capdemo.sh
#   ./push-to-capdemo.sh
#
# After this, every git push to main triggers the CodePipeline CI/CD pipeline.
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
section() { echo -e "\n${BOLD}${BLUE}════════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${BLUE}  $1${NC}"; \
            echo -e "${BOLD}${BLUE}════════════════════════════════════════${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE="https://github.com/YuvrajAryan2/capDemo.git"

section "Pushing cap-project to capDemo repo"

cd "$SCRIPT_DIR"

# Check git is installed
if ! command -v git &>/dev/null; then
    echo "git not found. Run ./setup-rocky8.sh first."
    exit 1
fi

# Set up git if not already a repo
if [ ! -d ".git" ]; then
    info "Initialising git repository..."
    git init
    git branch -M main
fi

# Set remote
if git remote get-url origin &>/dev/null; then
    info "Updating remote origin to capDemo..."
    git remote set-url origin "$REMOTE"
else
    info "Adding remote origin: $REMOTE"
    git remote add origin "$REMOTE"
fi

log "Remote: $(git remote get-url origin)"

# Configure git identity if not set
if ! git config user.email &>/dev/null; then
    warn "Git identity not configured."
    read -rp "  Enter your GitHub email: " GIT_EMAIL
    read -rp "  Enter your name: " GIT_NAME
    git config user.email "$GIT_EMAIL"
    git config user.name  "$GIT_NAME"
fi

# Stage all files
info "Staging all files..."
git add .

# Check if there's anything to commit
if git diff --cached --quiet; then
    warn "Nothing new to commit — all files already up to date."
else
    info "Committing..."
    git commit -m "feat: initial cap-project deployment

- Lambda backend with Bedrock + Comprehend AI
- React + Vite frontend with MUI dashboard
- Full Terraform infra (Lambda, API Gateway, DynamoDB, S3, EventBridge,
  CloudFront, CodePipeline, CodeBuild, CloudWatch, X-Ray)
- CI/CD via CodePipeline → CodeBuild
- Rocky Linux 8 setup and deploy scripts
- All resources in ca-central-1 (Canada Central)"
fi

# Push
info "Pushing to GitHub (capDemo/main)..."
echo ""
warn "GitHub will ask for your credentials."
warn "Use your GitHub username + a Personal Access Token (NOT your password)."
warn "Create one at: https://github.com/settings/tokens → Generate new token (classic)"
warn "Required scopes: repo, admin:repo_hook"
echo ""

git push -u origin main

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   Code pushed to YuvrajAryan2/capDemo ✓              ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}                                                      ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Next steps:                                         ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  1. Run ./deploy.sh to deploy infra to AWS           ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  2. Authorise GitHub connection in AWS Console:      ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}     Developer Tools → Connections → cap-project-github${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  3. Every git push to main now auto-deploys!         ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}                                                      ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
