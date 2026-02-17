#!/bin/bash
###############################################################################
# destroy.sh — Tear down all AWS infrastructure safely
#
# Usage:
#   chmod +x destroy.sh
#   ./destroy.sh
#
# WARNING: This deletes EVERYTHING — DynamoDB, Lambda, S3 buckets, etc.
# S3 buckets are emptied first so Terraform can delete them.
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
section() { echo -e "\n${BOLD}${RED}════════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${RED}  $1${NC}"; \
            echo -e "${BOLD}${RED}════════════════════════════════════════${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/infra"

section "⚠️  DESTROY ALL AWS RESOURCES"

echo ""
warn "This will PERMANENTLY DELETE all cap-project AWS resources:"
echo "  - Lambda function"
echo "  - DynamoDB table (ALL DATA LOST)"
echo "  - S3 buckets and their contents"
echo "  - API Gateway"
echo "  - CloudFront distribution"
echo "  - CodePipeline + CodeBuild"
echo "  - CloudWatch alarms"
echo "  - IAM roles and policies"
echo ""
read -rp "Type 'destroy' to confirm: " CONFIRM

if [ "$CONFIRM" != "destroy" ]; then
    echo "Aborted."
    exit 0
fi

cd "$INFRA_DIR"

# Empty S3 buckets first (Terraform can't delete non-empty buckets)
if [ -f terraform.tfvars ]; then
    EXPORT_BUCKET=$(grep export_bucket_name terraform.tfvars | awk -F'"' '{print $2}')
    FRONTEND_BUCKET=$(grep frontend_bucket_name terraform.tfvars | awk -F'"' '{print $2}')

    for BUCKET in "$EXPORT_BUCKET" "$FRONTEND_BUCKET"; do
        if [ -n "$BUCKET" ]; then
            info "Emptying S3 bucket: $BUCKET"
            aws s3 rm "s3://$BUCKET" --recursive --region ca-central-1 2>/dev/null || true
        fi
    done
fi

info "Running terraform destroy..."
terraform destroy \
    -var-file="terraform.tfvars" \
    -input=false \
    -auto-approve

log "All resources destroyed."
echo ""
echo -e "${GREEN}Done. Your AWS account has been cleaned up.${NC}"
