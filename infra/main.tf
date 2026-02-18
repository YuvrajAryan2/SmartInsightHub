###############################################################################
# Smart Talent Insight Hub — Full Infrastructure
# Region: ca-central-1 (Canada Central)
# Covers: Lambda, API Gateway, DynamoDB, S3, EventBridge,
#         CloudWatch Alarms, X-Ray, IAM, S3 Frontend + CloudFront
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

###############################################################################
# DATA SOURCES
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

###############################################################################
# COGNITO — AUTH (No Amplify)
###############################################################################

resource "aws_cognito_user_pool" "users" {
  name = var.cognito_user_pool_name

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.project_name}-spa"
  user_pool_id = aws_cognito_user_pool.users.id

  generate_secret     = false
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH"]

  prevent_user_existence_errors = "ENABLED"
  supported_identity_providers  = ["COGNITO"]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  allowed_oauth_flows_user_pool_client = false

  read_attributes  = ["email"]
  write_attributes = ["email"]
}

resource "aws_cognito_user_group" "hr" {
  name         = var.cognito_hr_group_name
  user_pool_id = aws_cognito_user_pool.users.id
  description  = "HR users who can access the Insights dashboard"
}

###############################################################################
# IAM — LAMBDA EXECUTION ROLE
###############################################################################

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "${var.project_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

data "aws_iam_policy_document" "lambda_policy" {
  statement {
    effect  = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Scan",
      "dynamodb:GetItem",
      "dynamodb:DescribeTable",
    ]
    resources = [aws_dynamodb_table.feedback_table.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel"]
    resources = ["*"]
  }

  statement {
    effect  = "Allow"
    actions = [
      "comprehend:DetectSentiment",
      "comprehend:DetectKeyPhrases",
    ]
    resources = ["*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.export_bucket.arn}/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["events:PutEvents"]
    resources = ["arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:event-bus/${var.event_bus_name}"]
  }

  statement {
    effect  = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"]
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name   = "${var.project_name}-lambda-policy"
  policy = data.aws_iam_policy_document.lambda_policy.json
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

###############################################################################
# DYNAMODB
###############################################################################

resource "aws_dynamodb_table" "feedback_table" {
  name         = var.feedback_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "feedbackId"

  attribute {
    name = "feedbackId"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  point_in_time_recovery {
    enabled = true
  }

  tags = local.common_tags
}

###############################################################################
# S3 — FEEDBACK JSON EXPORTS
###############################################################################

resource "aws_s3_bucket" "export_bucket" {
  bucket = var.export_bucket_name
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "export_bucket" {
  bucket = aws_s3_bucket.export_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "export_bucket" {
  bucket                  = aws_s3_bucket.export_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "export_bucket" {
  bucket = aws_s3_bucket.export_bucket.id
  rule {
    id     = "expire-old-exports"
    status = "Enabled"
    filter { prefix = "exports/" }
    expiration { days = 365 }
  }
}

###############################################################################
# S3 — FRONTEND STATIC HOSTING
###############################################################################

resource "aws_s3_bucket" "frontend_bucket" {
  bucket = var.frontend_bucket_name
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket" {
  bucket                  = aws_s3_bucket.frontend_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend_bucket.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" }
}

resource "aws_cloudfront_origin_access_control" "frontend_oac" {
  name                              = "${var.project_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.project_name} frontend"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend_oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

data "aws_iam_policy_document" "frontend_bucket_policy" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend_bucket.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = data.aws_iam_policy_document.frontend_bucket_policy.json
}

###############################################################################
# LAMBDA — PACKAGING
###############################################################################

resource "null_resource" "pip_install" {
  triggers = {
    requirements = filemd5("${path.module}/../backend/requirements.txt")
    handler      = filemd5("${path.module}/../backend/lambda_function.py")
  }

  provisioner "local-exec" {
    command = <<EOT
      mkdir -p ${path.module}/../backend/package && \
      pip3 install \
        -r ${path.module}/../backend/requirements.txt \
        -t ${path.module}/../backend/package \
        --upgrade \
        --quiet && \
      cp ${path.module}/../backend/lambda_function.py \
         ${path.module}/../backend/package/lambda_function.py
    EOT
  }
}

resource "null_resource" "mkdir_lambda_build" {
  provisioner "local-exec" {
    command = "mkdir -p ${path.module}/lambda_build"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/package"
  output_path = "${path.module}/lambda_build/lambda.zip"

  depends_on = [null_resource.pip_install, null_resource.mkdir_lambda_build]
}

###############################################################################
# LAMBDA — FUNCTION
###############################################################################

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-lambda"
  retention_in_days = 30
  tags              = local.common_tags
}

resource "aws_lambda_function" "feedback_api" {
  function_name = "${var.project_name}-lambda"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.12"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = 30
  memory_size = 256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      FEEDBACK_TABLE_NAME = aws_dynamodb_table.feedback_table.name
      EXPORT_BUCKET_NAME  = aws_s3_bucket.export_bucket.bucket
      BEDROCK_MODEL_ID    = var.bedrock_model_id
      AWS_REGION_OVERRIDE = var.aws_region
      AI_PROVIDER         = var.ai_provider
      EVENT_BUS_NAME      = var.event_bus_name
      MAX_MESSAGE_LEN     = "3000"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy_attachment.lambda_basic_execution,
  ]

  tags = local.common_tags
}

###############################################################################
# EVENTBRIDGE — ASYNC AI PROCESSING
###############################################################################

resource "aws_cloudwatch_event_rule" "feedback_submitted" {
  name           = "${var.project_name}-feedback-submitted"
  description    = "Triggers AI analysis Lambda when feedback is submitted"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source      = ["talent.feedback"]
    detail-type = ["FeedbackSubmitted"]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule           = aws_cloudwatch_event_rule.feedback_submitted.name
  event_bus_name = var.event_bus_name
  target_id      = "FeedbackLambdaTarget"
  arn            = aws_lambda_function.feedback_api.arn
}

resource "aws_lambda_permission" "eventbridge_invoke" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.feedback_api.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.feedback_submitted.arn
}

###############################################################################
# API GATEWAY
###############################################################################

resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api"
  description = "Smart Talent Insight Hub REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${var.project_name}-cognito-authorizer"
  rest_api_id   = aws_api_gateway_rest_api.api.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = [aws_cognito_user_pool.users.arn]

  identity_source = "method.request.header.Authorization"
}

resource "aws_api_gateway_resource" "feedback_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "feedback"
}

resource "aws_api_gateway_resource" "insights_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "insights"
}

resource "aws_api_gateway_method" "feedback_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.feedback_resource.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "feedback_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.feedback_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "insights_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.insights_resource.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "insights_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.insights_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "feedback_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.feedback_resource.id
  http_method             = aws_api_gateway_method.feedback_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.feedback_api.invoke_arn
}

resource "aws_api_gateway_integration" "feedback_options" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.feedback_resource.id
  http_method             = aws_api_gateway_method.feedback_options.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.feedback_api.invoke_arn
}

resource "aws_api_gateway_integration" "insights_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.insights_resource.id
  http_method             = aws_api_gateway_method.insights_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.feedback_api.invoke_arn
}

resource "aws_api_gateway_integration" "insights_options" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.insights_resource.id
  http_method             = aws_api_gateway_method.insights_options.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.feedback_api.invoke_arn
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.feedback_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeploy = sha1(jsonencode([
      aws_api_gateway_integration.feedback_post,
      aws_api_gateway_integration.feedback_options,
      aws_api_gateway_integration.insights_get,
      aws_api_gateway_integration.insights_options,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.feedback_post,
    aws_api_gateway_integration.feedback_options,
    aws_api_gateway_integration.insights_get,
    aws_api_gateway_integration.insights_options,
  ]
}

resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.project_name}"
  retention_in_days = 30
  tags              = local.common_tags
}

resource "aws_api_gateway_stage" "stage" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  deployment_id = aws_api_gateway_deployment.deployment.id
  stage_name    = var.api_stage_name

  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn

    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      caller           = "$context.identity.caller"
      user             = "$context.identity.user"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      resourcePath     = "$context.resourcePath"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = local.common_tags
}

resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.stage.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = true
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}

###############################################################################
# CLOUDWATCH ALARMS
###############################################################################

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  alarm_description   = "Lambda function error rate too high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.feedback_api.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${var.project_name}-lambda-throttles"
  alarm_description   = "Lambda throttling detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.feedback_api.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.project_name}-lambda-duration"
  alarm_description   = "Lambda P99 duration approaching timeout"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 25000
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.feedback_api.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

###############################################################################
# SNS — ALERT TOPIC
###############################################################################

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email_alert" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

###############################################################################
# LOCALS
###############################################################################

locals {
  common_tags = {
    Project     = var.project_name
    Environment = "production"
    ManagedBy   = "terraform"
    Region      = var.aws_region
  }
}

###############################################################################
# OUTPUTS
###############################################################################

output "api_base_url" {
  description = "API Gateway base URL — set this as VITE_API_BASE_URL in frontend"
  value       = aws_api_gateway_stage.stage.invoke_url
}

output "frontend_cloudfront_url" {
  description = "CloudFront URL for the React frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend deployment"
  value       = aws_s3_bucket.frontend_bucket.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.feedback_api.function_name
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.feedback_table.name
}

output "export_bucket_name" {
  value = aws_s3_bucket.export_bucket.bucket
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID (use as VITE_COGNITO_USER_POOL_ID)"
  value       = aws_cognito_user_pool.users.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito App Client ID for SPA (use as VITE_COGNITO_CLIENT_ID)"
  value       = aws_cognito_user_pool_client.spa.id
}
###############################################################################
# CODEPIPELINE — CI/CD (S3 Source, no GitHub connection needed)
###############################################################################

resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "${var.project_name}-pipeline-${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket                  = aws_s3_bucket.pipeline_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "codepipeline_role" {
  name = "${var.project_name}-codepipeline-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "codepipeline.amazonaws.com" }
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  role = aws_iam_role.codepipeline_role.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:*"]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*",
          aws_s3_bucket.frontend_bucket.arn,
          "${aws_s3_bucket.frontend_bucket.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "codebuild_role" {
  name = "${var.project_name}-codebuild-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role_policy" "codebuild_policy" {
  role = aws_iam_role.codebuild_role.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:*"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:*"]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*",
          aws_s3_bucket.frontend_bucket.arn,
          "${aws_s3_bucket.frontend_bucket.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = aws_lambda_function.feedback_api.arn
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_codebuild_project" "frontend" {
  name         = "${var.project_name}-frontend-build"
  service_role = aws_iam_role.codebuild_role.arn
  artifacts { type = "CODEPIPELINE" }
  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:7.0"
    type         = "LINUX_CONTAINER"
    environment_variable {
      name  = "FRONTEND_BUCKET"
      value = aws_s3_bucket.frontend_bucket.bucket
    }
    environment_variable {
      name  = "CLOUDFRONT_DISTRIBUTION_ID"
      value = aws_cloudfront_distribution.frontend.id
    }
    environment_variable {
      name  = "VITE_API_BASE_URL"
      value = aws_api_gateway_stage.stage.invoke_url
    }
  }
  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-frontend.yml"
  }
  tags = local.common_tags
}

resource "aws_codebuild_project" "backend" {
  name         = "${var.project_name}-backend-build"
  service_role = aws_iam_role.codebuild_role.arn
  artifacts { type = "CODEPIPELINE" }
  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:7.0"
    type         = "LINUX_CONTAINER"
    environment_variable {
      name  = "LAMBDA_FUNCTION_NAME"
      value = aws_lambda_function.feedback_api.function_name
    }
  }
  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-backend.yml"
  }
  tags = local.common_tags
}

resource "aws_codepipeline" "main" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.pipeline_artifacts.bucket
  }

  stage {
    name = "Source"
    action {
      name             = "S3_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "S3"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        S3Bucket             = aws_s3_bucket.pipeline_artifacts.bucket
        S3ObjectKey          = "source.zip"
        PollForSourceChanges = "true"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build_Frontend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["frontend_output"]
      configuration    = { ProjectName = aws_codebuild_project.frontend.name }
    }
    action {
      name             = "Build_Backend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["backend_output"]
      configuration    = { ProjectName = aws_codebuild_project.backend.name }
    }
  }

  tags = local.common_tags
}