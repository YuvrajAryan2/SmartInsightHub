# Deployment Guide - Smart Talent Insight Hub

## ✅ Project Status: **READY TO DEPLOY**

This project is **fully configured** and will work seamlessly **IF** you complete the prerequisites below.

---

## 📋 Prerequisites Checklist

Before deploying, ensure:

- [ ] **AWS Account** with admin/appropriate permissions
- [ ] **Bedrock enabled** in `ca-central-1` region (see AWS Console steps below)
- [ ] **Claude 3 Haiku model access** enabled in Bedrock
- [ ] **AWS CLI v2** installed and configured with valid credentials
- [ ] **Terraform v1.6+** installed
- [ ] **Python 3.12+** installed (for local testing, Lambda uses Python 3.12 runtime)
- [ ] **Node.js v18+** and **npm** installed (for frontend)
- [ ] **Git** installed (if cloning from repo)

---

## 🖥️ ROCKY LINUX TERMINAL STEPS

### Step 1: Install Prerequisites

```bash
# Update system
sudo dnf update -y

# Install Python 3.12+ (if not already installed)
sudo dnf install python3.12 python3-pip -y

# Install Node.js 18+ (using NodeSource repository)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify installations
python3 --version  # Should show 3.12+
node --version     # Should show v18+ or v20+
npm --version

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version

# Install Terraform
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo dnf install -y terraform
terraform --version  # Should show v1.6+

# Install Git (if not already installed)
sudo dnf install -y git
```

### Step 2: Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Enter when prompted:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: ca-central-1
# Default output format: json

# Verify credentials work
aws sts get-caller-identity
```

### Step 3: Clone/Download Project

```bash
# If using Git:
git clone <your-repo-url>
cd CAPSTONE_PROJECT

# OR if you already have the project:
cd /path/to/CAPSTONE_PROJECT
```

### Step 4: Update Terraform Variables (if needed)

```bash
# Edit terraform.tfvars if you need to change bucket name
cd infra
nano terraform.tfvars  # or use vi/vim

# Current values:
# aws_region = "ca-central-1"
# export_bucket_name = "capstone-feedback-exports-1234567890"
# 
# IMPORTANT: Change export_bucket_name to something unique (S3 bucket names are globally unique)
```

### Step 5: Deploy Backend Infrastructure

```bash
# Navigate to infra directory
cd infra

# Initialize Terraform
terraform init

# Review what will be created (optional but recommended)
terraform plan

# Deploy infrastructure
terraform apply

# When prompted, type: yes

# ⚠️ IMPORTANT: After deployment completes, note the output:
# api_base_url = "https://xxxxx.execute-api.ca-central-1.amazonaws.com/prod"
# Copy this URL - you'll need it for the frontend!
```

### Step 6: Configure Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Create/update .env file with the API URL from Step 5
echo 'VITE_API_BASE_URL="https://YOUR_API_ID.execute-api.ca-central-1.amazonaws.com/prod"' > .env

# Replace YOUR_API_ID with the actual API ID from terraform output
# Example:
# echo 'VITE_API_BASE_URL="https://abc123xyz.execute-api.ca-central-1.amazonaws.com/prod"' > .env

# Install frontend dependencies
npm install

# Start development server
npm run dev

# The app will be available at: http://localhost:5173
```

### Step 7: Test the Application

```bash
# In your browser, open:
# http://localhost:5173

# Test flow:
# 1. Submit feedback on the home page
# 2. Navigate to /insights to see the dashboard
# 3. Verify sentiment, topics, and summaries appear
```

### Step 8: (Optional) Build Frontend for Production

```bash
cd frontend
npm run build

# The built files will be in frontend/dist/
# You can deploy these to S3/CloudFront if needed
```

---

## 🌐 AWS CONSOLE STEPS

### Step 1: Enable Amazon Bedrock in ca-central-1

1. **Log in to AWS Console**
   - Go to: https://console.aws.amazon.com
   - Select region: **Canada (Central) - ca-central-1** (top right)

2. **Navigate to Bedrock**
   - Search for "Bedrock" in the services search bar
   - Click **Amazon Bedrock**

3. **Enable Bedrock (if not already enabled)**
   - If you see a "Get started" or "Enable Bedrock" button, click it
   - Accept any terms/agreements

4. **Request Model Access**
   - Go to **Model access** (left sidebar)
   - Find **Claude 3 Haiku** (or search for "anthropic")
   - Click **Request model access**
   - Select **Claude 3 Haiku** (or the model you're using)
   - Click **Request**
   - ⚠️ **Wait for approval** (usually instant, but can take a few minutes)

5. **Verify Model Access**
   - Go to **Model access** again
   - Confirm **Claude 3 Haiku** shows as **Access granted**
   - Note the model ID: `anthropic.claude-3-haiku-20240307-v1:0` (or latest version)

### Step 2: Verify IAM Permissions

1. **Navigate to IAM**
   - Search for "IAM" in services
   - Go to **Roles** (left sidebar)

2. **Check Lambda Role**
   - Search for role: `smart-talent-insight-hub-lambda-role`
   - Click on the role
   - Go to **Permissions** tab
   - Verify it has:
     - `bedrock:InvokeModel` permission
     - DynamoDB permissions
     - S3 permissions
     - CloudWatch Logs permissions

   > **Note**: Terraform creates this automatically, but verify if deployment fails

### Step 3: Verify Resources Created

After running `terraform apply`, verify these resources exist:

1. **DynamoDB Table**
   - Go to **DynamoDB** service
   - Check for table: `FeedbackSubmissions`
   - Verify it's in `ca-central-1` region

2. **S3 Bucket**
   - Go to **S3** service
   - Check for bucket: `capstone-feedback-exports-1234567890` (or your custom name)
   - Verify it's in `ca-central-1` region

3. **Lambda Function**
   - Go to **Lambda** service
   - Check for function: `smart-talent-insight-hub-lambda`
   - Verify:
     - Runtime: Python 3.12
     - Handler: `lambda_function.lambda_handler`
     - Environment variables are set correctly

4. **API Gateway**
   - Go to **API Gateway** service
   - Find your REST API
   - Verify endpoints:
     - `POST /feedback`
     - `GET /insights`
   - Check the **Invoke URL** matches what Terraform output showed

5. **CloudWatch Logs**
   - Go to **CloudWatch** → **Log groups**
   - Find: `/aws/lambda/smart-talent-insight-hub-lambda`
   - This is where Lambda logs will appear

### Step 4: Test Bedrock Access (Optional)

1. **Go to Bedrock Playground**
   - Navigate to **Amazon Bedrock** → **Playgrounds** → **Text**
   - Select **Claude 3 Haiku**
   - Try a test prompt to verify access works

2. **Or Test via Lambda**
   - Go to **Lambda** → Your function
   - Click **Test** tab
   - Create a test event:
     ```json
     {
       "httpMethod": "POST",
       "path": "/feedback",
       "body": "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"message\":\"This is a test feedback message.\"}"
     }
     ```
   - Click **Test**
   - Check CloudWatch logs for any errors

---

## 🔍 Troubleshooting

### Issue: "Bedrock access denied" or "Model not accessible"

**Solution:**
- Ensure Bedrock is enabled in `ca-central-1`
- Ensure Claude 3 Haiku model access is granted
- Wait a few minutes after requesting access
- Check Lambda IAM role has `bedrock:InvokeModel` permission

### Issue: "S3 bucket name already exists"

**Solution:**
- S3 bucket names are globally unique
- Edit `infra/terraform.tfvars` and change `export_bucket_name` to something unique
- Re-run `terraform apply`

### Issue: "API Gateway CORS errors"

**Solution:**
- Lambda already includes CORS headers
- Verify API Gateway has CORS enabled (Terraform should handle this)
- Check browser console for specific CORS errors

### Issue: "Frontend can't connect to API"

**Solution:**
- Verify `.env` file has correct `VITE_API_BASE_URL`
- Ensure no trailing slash in URL
- Restart frontend dev server after changing `.env`
- Check API Gateway is deployed and stage is active

### Issue: "Terraform apply fails with credentials error"

**Solution:**
- Run `aws configure` again
- Verify credentials with: `aws sts get-caller-identity`
- Ensure IAM user/role has permissions to create: Lambda, API Gateway, DynamoDB, S3, IAM, CloudWatch

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Terraform apply completed successfully
- [ ] API Gateway URL is accessible (test with `curl`)
- [ ] Frontend loads at `http://localhost:5173`
- [ ] Can submit feedback form
- [ ] Insights page shows data
- [ ] Bedrock analysis works (check CloudWatch logs)
- [ ] DynamoDB table has entries
- [ ] S3 exports bucket exists (optional exports)

---

## 📝 Quick Reference Commands

```bash
# Deploy backend
cd infra && terraform apply

# View Terraform outputs (API URL)
cd infra && terraform output

# Destroy infrastructure (if needed)
cd infra && terraform destroy

# View Lambda logs
aws logs tail /aws/lambda/smart-talent-insight-hub-lambda --follow

# Test API endpoint
curl -X POST https://YOUR_API_URL/prod/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Great work!"}'
```

---

## 🎯 Project Architecture Summary

```
Frontend (React/Vite)
    ↓ HTTP POST/GET
API Gateway (REST API)
    ↓ Proxy Integration
Lambda Function (Python)
    ↓ Invokes
Amazon Bedrock (Claude 3 Haiku)
    ↓ Returns Analysis
Lambda Function
    ↓ Stores
DynamoDB (Feedback + Analysis)
    ↓ Optional Export
S3 Bucket (Monthly Exports)
```

---

## 📞 Support

If you encounter issues:
1. Check CloudWatch Logs for Lambda errors
2. Verify all prerequisites are met
3. Ensure Bedrock is enabled and model access is granted
4. Check Terraform outputs for correct API URL
5. Verify AWS credentials have sufficient permissions

---

**Last Updated:** Based on current project configuration (Bedrock in ca-central-1)
