###############################################################################
# variables.tf — cap-project (Smart Talent Insight Hub)
# All defaults set to ca-central-1 (Canada Central)
###############################################################################

variable "project_name" {
  type        = string
  default     = "cap-project"
  description = "Base name prefix for all AWS resources"
}

variable "aws_region" {
  type        = string
  default     = "ca-central-1"
  description = "AWS region for all resources (Canada Central)"
}

variable "feedback_table_name" {
  type        = string
  default     = "cap-project-feedback"
  description = "DynamoDB table name for feedback records"
}

variable "export_bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name for monthly JSON exports (e.g. my-capstone-exports-1234)"

  validation {
    condition     = length(var.export_bucket_name) >= 3 && length(var.export_bucket_name) <= 63
    error_message = "S3 bucket name must be between 3 and 63 characters."
  }
}

variable "frontend_bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name for React frontend hosting (e.g. my-capstone-frontend-1234)"

  validation {
    condition     = length(var.frontend_bucket_name) >= 3 && length(var.frontend_bucket_name) <= 63
    error_message = "S3 bucket name must be between 3 and 63 characters."
  }
}

variable "bedrock_model_id" {
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
  description = "Amazon Bedrock model ID. Claude 3 Haiku is cheapest and fastest."
}

variable "ai_provider" {
  type        = string
  default     = "bedrock"
  description = "AI provider: 'bedrock' (Claude via Bedrock) or 'comprehend' (Amazon Comprehend fallback)"

  validation {
    condition     = contains(["bedrock", "comprehend"], var.ai_provider)
    error_message = "ai_provider must be 'bedrock' or 'comprehend'."
  }
}

variable "api_stage_name" {
  type        = string
  default     = "prod"
  description = "API Gateway deployment stage name"
}

variable "event_bus_name" {
  type        = string
  default     = "default"
  description = "EventBridge event bus name for async AI processing"
}

variable "alert_email" {
  type        = string
  default     = ""
  description = "Email address for CloudWatch alarm notifications via SNS (leave empty to skip)"
}

variable "github_repo" {
  type        = string
  default     = "YuvrajAryan2/capDemo"
  description = "GitHub repository in 'owner/repo' format for CI/CD pipeline"
}

variable "github_branch" {
  type        = string
  default     = "main"
  description = "GitHub branch to trigger CI/CD pipeline on"
}

###############################################################################
# Cognito (Auth) — No Amplify
###############################################################################

variable "cognito_user_pool_name" {
  type        = string
  default     = "cap-project-users"
  description = "Cognito User Pool name"
}

variable "cognito_hr_group_name" {
  type        = string
  default     = "hr"
  description = "Cognito group name for HR users"
}

