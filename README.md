## Smart Talent Insight Hub (GenAI + AWS)

This project is a **full-stack, cloud-native HR analytics application** that collects employee feedback, runs **Generative AI analysis via Amazon Bedrock**, and displays **insights dashboards** for HR and managers.

It is built with:

- **Frontend**: React + Vite, Material UI, Chart.js
- **Backend**: AWS Lambda (Python), Amazon API Gateway, DynamoDB, S3, Amazon Bedrock
- **Infra as Code**: Terraform

---

### 1. Prerequisites (Do this once)

- **AWS account** with permissions to create:
  - Lambda, API Gateway, DynamoDB, S3, IAM, CloudWatch, Bedrock
- **Enable Amazon Bedrock** in your region (recommended: `us-east-1`) and enable access to:
  - **Claude 3 Haiku** (or update model ID in code)
- **Locally install**:
  - Node.js (v18+)
  - npm (bundled with Node)
  - Python 3.12 (or compatible Lambda runtime)
  - Terraform (v1.6+)
  - AWS CLI v2 and run:

```bash
aws configure
```

Configure it with an IAM user/role that has rights to create the above AWS resources.

---

### 2. Project Structure

```text
CAPSTONE_PROJECT/
  package.json          # Root workspace
  frontend/             # React SPA (Feedback form + Insights dashboard)
  backend/              # Lambda function code (Python + Bedrock + DynamoDB)
    lambda_function.py
    requirements.txt
  infra/                # Terraform for AWS resources
    main.tf
    variables.tf
  README.md             # This file
```

---

### 3. Deploy Backend Infrastructure with Terraform

All AWS resources (Lambda, DynamoDB, API Gateway, S3, IAM, CloudWatch) are defined in `infra/`.

#### 3.1. Set Terraform variables

Edit `infra/variables.tf` if needed, or override via CLI:

- **`aws_region`**: default `us-east-1`
- **`export_bucket_name`**: must be globally unique (e.g. `my-capstone-feedback-exports-1234`)
- **`bedrock_model_id`**: default `anthropic.claude-3-haiku-20240307-v1:0`

> **Required**: Set `export_bucket_name` via CLI or a `terraform.tfvars` file.

Example `infra/terraform.tfvars`:

```hcl
aws_region        = "us-east-1"
export_bucket_name = "my-capstone-feedback-exports-1234"
```

#### 3.2. Initialize and deploy

From the project root:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

When prompted, type `yes`.

Terraform will:

- Create **DynamoDB** table `FeedbackSubmissions`
- Create **S3** export bucket
- Package the **backend** folder into a zip and deploy a **Lambda** function
- Create **API Gateway** REST endpoints:
  - `POST /feedback`
  - `GET /insights`
- Wire IAM permissions for DynamoDB, S3, Bedrock, and CloudWatch
- Create a basic **Lambda error CloudWatch alarm**

After `terraform apply` completes, note the output:

- **`api_base_url`** – base URL for the API (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

---

### 4. Configure Frontend to Talk to API Gateway

From the project root:

```bash
cd frontend
```

Create a `.env` file:

```bash
echo VITE_API_BASE_URL="https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod" > .env
```

Replace with the **`api_base_url`** from Terraform output (no trailing slash).

Install dependencies and run the frontend locally:

```bash
npm install
npm run dev
```

This starts the app at `http://localhost:5173`:

- **Feedback Form page** (root `/`):
  - Fields: name, email, feedback
  - On submit: calls `POST /feedback` on API Gateway
- **Insights Dashboard page** (`/insights`):
  - Calls `GET /insights`
  - Shows:
    - Total submissions
    - Sentiment distribution (Chart.js bar chart)
    - Topic “word cloud” (tag cloud scaled by frequency)
    - List of AI summaries

---

### 5. Backend Lambda & Bedrock (What it does)

The Lambda handler is in `backend/lambda_function.py`.

- **POST `/feedback`**:
  - Validates JSON body: `name`, `email`, `message`
  - Stores raw feedback into DynamoDB table `FeedbackSubmissions`
  - Calls **Amazon Bedrock (Claude)** with a prompt to return:

    ```json
    {
      "sentiment": "positive | negative | neutral",
      "topics": ["string"],
      "summary": "one sentence summary"
    }
    ```

  - Parses the JSON response, updates the same DynamoDB record
  - Optionally writes a JSON file to S3 under `exports/YYYY-MM/<feedbackId>.json`

- **GET `/insights`**:
  - Scans the DynamoDB table
  - Aggregates:
    - `totalSubmissions`
    - `sentimentCounts` (positive / negative / neutral)
    - `summaries` (list of AI summaries)
    - `topics` (flattened list of topics)
  - Returns this payload to the frontend.

> **Important**: For Bedrock to work, your IAM role attached to Lambda must have `bedrock:InvokeModel` on the configured model, and Bedrock must be enabled in the account/region. The Terraform policy already includes `bedrock:InvokeModel` on `"*"`.

---

### 6. Sample Data & Testing

1. **Open the frontend** at `http://localhost:5173`.
2. Submit several feedback entries with different moods:
   - Very happy feedback → should show **positive** sentiment.
   - Complaints → should show **negative**.
   - Neutral statements → **neutral**.
3. Go to the **Insights** page:
   - Verify **Total Submissions** matches how many you submitted.
   - Check that the **Sentiment Distribution** bar chart updates.
   - See topics rendered as a weighted tag cloud.
   - See AI-generated **Summaries** list.

You can also call the APIs directly with `curl` or Postman using the `api_base_url`.

---

### 7. Optional: Frontend Deployment to AWS

This repo does **not** include full CloudFront/S3 hosting Terraform for the SPA (to keep infra focused on backend), but you can easily host the built frontend in S3:

1. Build the frontend:

   ```bash
   cd frontend
   npm run build
   ```

2. Create a separate S3 bucket for static hosting (e.g. `my-capstone-frontend-1234`).
3. Upload the `dist/` folder contents to that bucket.
4. Optionally put CloudFront in front of it for HTTPS and better caching.

Make sure your `VITE_API_BASE_URL` is baked into the build before uploading (`npm run build` re-reads `.env`).

---

### 8. CI/CD (High-Level Setup)

The PRD calls for a **GitHub → CodeBuild → CodePipeline → Lambda deploy** flow.

This project is structured so you can easily:

- Push this repo to **GitHub**
- Create an **AWS CodeBuild** project that:
  - Installs Python dependencies for the backend
  - Runs `terraform plan` / `terraform apply` for infra changes
  - Optionally runs frontend tests/build
- Create an **AWS CodePipeline** pipeline triggered from GitHub to run the CodeBuild project and deploy Lambda updates automatically.

> For a full production CI/CD pipeline, you’ll typically separate the Terraform state into S3 + DynamoDB lock table and add approval steps for production deploys. Those details are beyond this capstone but the code structure here is compatible with such a setup.

---

### 9. Monitoring & Observability

- **CloudWatch Logs**:
  - Lambda logs are automatically sent to CloudWatch via the IAM policy.
  - Use the AWS Console → CloudWatch → Logs → Log Groups → find your Lambda log group.
- **CloudWatch Alarm**:
  - Alarm on Lambda errors > 1 in 5 minutes.
  - You can wire this alarm to **SNS** or email notifications later if desired.

---

### 10. Cost Considerations

- **DynamoDB** uses on-demand (PAY_PER_REQUEST) billing to stay cost-efficient.
- **Bedrock**:
  - Using Claude 3 Haiku as a light-weight model for cheaper inference.
  - Lambda calls Bedrock once per feedback submission.
- **Lambda & API Gateway**:
  - Serverless, pay-per-use pricing.
- **S3 exports**:
  - Only small JSON objects per submission, stored in a single bucket.

You can further optimize costs by:

- Limiting maximum input size on feedback.
- Sampling which submissions are sent to Bedrock.
- Turning off non-essential resources in non-production stages.

---

### 11. Quick Start Summary

- **Step 1**: Configure AWS CLI and ensure Bedrock is enabled.
- **Step 2**: `cd infra && terraform init && terraform apply` (set `export_bucket_name`).
- **Step 3**: Copy `api_base_url` into `frontend/.env` as `VITE_API_BASE_URL`.
- **Step 4**: `cd frontend && npm install && npm run dev`.
- **Step 5**: Submit feedback and watch insights update in real time.

