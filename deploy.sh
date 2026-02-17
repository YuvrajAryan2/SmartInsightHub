#!/bin/bash
###############################################################################
# deploy.sh — Full Deployment Script for cap-project on Rocky Linux 8
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# What this does:
#   1. Checks all required tools are installed
#   2. Validates AWS credentials
#   3. Installs Python backend dependencies
#   4. Runs terraform init + plan + apply
#   5. Installs frontend npm dependencies
#   6. Builds the React frontend
#   7. Syncs frontend to S3
#   8. Invalidates CloudFront cache
#   9. Prints all deployed URLs
###############################################################################

set -euo pipefail

# ── COLOURS ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗] ERROR:${NC} $1"; exit 1; }
section() { echo -e "\n${BOLD}${BLUE}════════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${BLUE}  $1${NC}"; \
            echo -e "${BOLD}${BLUE}════════════════════════════════════════${NC}"; }

# Script directory (so it works from any location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/infra"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

###############################################################################
# STEP 1: PRE-FLIGHT CHECKS
###############################################################################
section "Step 1/8  Pre-flight Checks"

# Check required tools
for tool in python3.12 node npm aws terraform git; do
    if ! command -v "$tool" &>/dev/null; then
        error "$tool is not installed. Run ./setup-rocky8.sh first."
    fi
    log "$tool found: $(command -v $tool)"
done

# Check AWS credentials
info "Checking AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null; then
    error "AWS credentials not configured. Run: aws configure"
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="ca-central-1"
log "AWS Account: $ACCOUNT_ID"
log "AWS Region:  $AWS_REGION"

# Check terraform.tfvars exists
if [ ! -f "$INFRA_DIR/terraform.tfvars" ]; then
    warn "terraform.tfvars not found — creating from example..."
    cp "$INFRA_DIR/terraform.tfvars.example" "$INFRA_DIR/terraform.tfvars"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit infra/terraform.tfvars before continuing!${NC}"
    echo -e "${YELLOW}   Change the S3 bucket names to something globally unique.${NC}"
    echo ""
    echo "   Example:"
    echo "     export_bucket_name   = \"cap-project-exports-$(echo $ACCOUNT_ID | tail -c 5)\""
    echo "     frontend_bucket_name = \"cap-project-frontend-$(echo $ACCOUNT_ID | tail -c 5)\""
    echo ""
    read -rp "Press ENTER after you have edited terraform.tfvars to continue..."
fi

log "terraform.tfvars found"

###############################################################################
# STEP 2: PYTHON BACKEND DEPENDENCIES
###############################################################################
section "Step 2/8  Backend — Python Dependencies"

PACKAGE_DIR="$BACKEND_DIR/package"

info "Installing Python dependencies into backend/package/..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

python3.12 -m pip install \
    -r "$BACKEND_DIR/requirements.txt" \
    -t "$PACKAGE_DIR" \
    --upgrade \
    --quiet

info "Copying Lambda handler..."
cp "$BACKEND_DIR/lambda_function.py" "$PACKAGE_DIR/lambda_function.py"

log "Backend package ready ($(du -sh $PACKAGE_DIR | cut -f1))"

###############################################################################
# STEP 3: TERRAFORM INIT
###############################################################################
section "Step 3/8  Terraform — Init"

cd "$INFRA_DIR"

info "Initialising Terraform..."
terraform init -upgrade -input=false

log "Terraform initialised"

###############################################################################
# STEP 4: TERRAFORM PLAN
###############################################################################
section "Step 4/8  Terraform — Plan"

info "Running terraform plan..."
terraform plan \
    -var-file="terraform.tfvars" \
    -out="tfplan" \
    -input=false

echo ""
read -rp "Review the plan above. Press ENTER to apply, or Ctrl+C to cancel..."

###############################################################################
# STEP 5: TERRAFORM APPLY
###############################################################################
section "Step 5/8  Terraform — Apply"

info "Applying infrastructure..."
terraform apply \
    -input=false \
    "tfplan"

# Capture outputs
API_BASE_URL=$(terraform output -raw api_base_url)
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)
CLOUDFRONT_URL=$(terraform output -raw frontend_cloudfront_url)
LAMBDA_NAME=$(terraform output -raw lambda_function_name)

log "Infrastructure deployed!"
log "API URL:      $API_BASE_URL"
log "CF URL:       $CLOUDFRONT_URL"
log "Lambda:       $LAMBDA_NAME"

cd "$SCRIPT_DIR"

###############################################################################
# STEP 6: FRONTEND — NPM INSTALL
###############################################################################
section "Step 6/8  Frontend — npm install"

cd "$FRONTEND_DIR"

info "Installing Node.js dependencies..."
npm ci --silent

log "Node dependencies installed"

###############################################################################
# STEP 7: FRONTEND — BUILD
###############################################################################
section "Step 7/8  Frontend — Build"

info "Writing .env with API URL..."
echo "VITE_API_BASE_URL=$API_BASE_URL" > .env

info "Building React app..."
npm run build

BUILD_SIZE=$(du -sh dist | cut -f1)
log "Frontend built successfully ($BUILD_SIZE)"

###############################################################################
# STEP 8: DEPLOY FRONTEND TO S3 + CLOUDFRONT
###############################################################################
section "Step 8/8  Frontend — Deploy to S3 + CloudFront"

info "Syncing static assets to S3 (with long cache)..."
aws s3 sync dist/ "s3://$FRONTEND_BUCKET/" \
    --delete \
    --cache-control "max-age=31536000,public" \
    --exclude "index.html" \
    --region ca-central-1

info "Uploading index.html (no cache — for SPA routing)..."
aws s3 cp dist/index.html "s3://$FRONTEND_BUCKET/index.html" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --region ca-central-1

info "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

log "Cache invalidation started: $INVALIDATION_ID"

cd "$SCRIPT_DIR"

###############################################################################
# DEPLOYMENT SUMMARY
###############################################################################
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║              🎉  DEPLOYMENT COMPLETE!                        ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}                                                              ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Frontend:   ${BLUE}${CLOUDFRONT_URL}${NC}"
echo -e "${GREEN}${BOLD}║${NC}  API:        ${BLUE}${API_BASE_URL}${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Lambda:     ${BLUE}${LAMBDA_NAME}${NC}  (ca-central-1)"
echo -e "${GREEN}${BOLD}║${NC}                                                              ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Next steps:                                                 ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  1. Open the CloudFront URL above in your browser            ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  2. Submit a test feedback entry                             ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  3. Go to /insights to see AI analysis                       ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  4. Authorise GitHub in AWS Console for CI/CD:               ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}     Console → Developer Tools → Connections                  ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}                                                              ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
