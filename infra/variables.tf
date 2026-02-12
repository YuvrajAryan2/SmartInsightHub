variable "project_name" {
  type        = string
  default     = "smart-talent-insight-hub"
  description = "Base name for project resources"
}

variable "aws_region" {
  type        = string
  default     = "ca-central-1"
  description = "AWS region to deploy into (e.g. ca-central-1 for Canada Central)"
}

variable "feedback_table_name" {
  type        = string
  default     = "FeedbackSubmissions"
  description = "DynamoDB table name for feedback"
}

variable "export_bucket_name" {
  type        = string
  description = "S3 bucket for monthly JSON exports"
}

variable "bedrock_model_id" {
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
  description = "Amazon Bedrock model ID to use for analysis"
}

variable "api_stage_name" {
  type        = string
  default     = "prod"
  description = "API Gateway stage name"
}

