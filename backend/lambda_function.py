import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

import boto3
from botocore.exceptions import BotoCoreError, ClientError

TABLE_NAME = os.environ.get("FEEDBACK_TABLE_NAME", "FeedbackSubmissions")
EXPORT_BUCKET = os.environ.get("EXPORT_BUCKET_NAME")
BEDROCK_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"
)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
bedrock = boto3.client("bedrock-runtime")
s3 = boto3.client("s3") if EXPORT_BUCKET else None


def _cors_headers() -> Dict[str, str]:
  return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
  }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
  """
  Root Lambda handler wired as a proxy integration for API Gateway.
  Routes based on HTTP method and path.
  """
  method = event.get("httpMethod", "")
  path = event.get("path", "")

  if method == "OPTIONS":
    return {
        "statusCode": 200,
        "headers": _cors_headers(),
        "body": ""
    }

  try:
    if path.endswith("/feedback") and method == "POST":
      return handle_post_feedback(event)
    if path.endswith("/insights") and method == "GET":
      return handle_get_insights(event)

    return {
        "statusCode": 404,
        "headers": _cors_headers(),
        "body": json.dumps({"message": "Not Found"}),
    }
  except Exception as exc:  # pylint: disable=broad-except
    # Basic error logging; CloudWatch will capture this.
    print(f"Error handling request: {exc}")
    return {
        "statusCode": 500,
        "headers": _cors_headers(),
        "body": json.dumps({"message": "Internal server error"}),
    }


def handle_post_feedback(event: Dict[str, Any]) -> Dict[str, Any]:
  body_raw = event.get("body") or "{}"
  try:
    body = json.loads(body_raw)
  except json.JSONDecodeError:
    return {
        "statusCode": 400,
        "headers": _cors_headers(),
        "body": json.dumps({"message": "Invalid JSON body"}),
    }

  name = (body.get("name") or "").strip()
  email = (body.get("email") or "").strip()
  message = (body.get("message") or "").strip()

  if not name or not email or not message:
    return {
        "statusCode": 400,
        "headers": _cors_headers(),
        "body": json.dumps({"message": "name, email and message are required"}),
    }

  feedback_id = str(uuid.uuid4())
  timestamp = datetime.now(timezone.utc).isoformat()

  item = {
      "feedbackId": feedback_id,
      "name": name,
      "email": email,
      "message": message,
      "sentiment": None,
      "topics": [],
      "summary": None,
      "timestamp": timestamp,
  }

  try:
    table.put_item(Item=item)
  except (BotoCoreError, ClientError) as exc:
    print(f"Failed to put item in DynamoDB: {exc}")
    return {
        "statusCode": 500,
        "headers": _cors_headers(),
        "body": json.dumps({"message": "Failed to store feedback"}),
    }

  # Call Bedrock to analyze the feedback
  try:
    ai_result = call_bedrock_analysis(message)
    sentiment = ai_result.get("sentiment")
    topics = ai_result.get("topics") or []
    summary = ai_result.get("summary")

    # Update DynamoDB record
    table.update_item(
        Key={"feedbackId": feedback_id},
        UpdateExpression=(
            "SET sentiment = :s, topics = :t, summary = :m"
        ),
        ExpressionAttributeValues={
            ":s": sentiment,
            ":t": topics,
            ":m": summary,
        },
    )

    # Optionally append to S3 monthly export
    if s3 and EXPORT_BUCKET:
      year_month = timestamp[:7]  # YYYY-MM
      key = f"exports/{year_month}/{feedback_id}.json"
      s3.put_object(
          Bucket=EXPORT_BUCKET,
          Key=key,
          Body=json.dumps({**item, **ai_result}),
          ContentType="application/json",
      )
  except Exception as exc:  # pylint: disable=broad-except
    # Log but don't fail the whole request; AI is best-effort
    print(f"Bedrock analysis failed: {exc}")

  return {
      "statusCode": 201,
      "headers": _cors_headers(),
      "body": json.dumps({"feedbackId": feedback_id}),
  }


def handle_get_insights(event: Dict[str, Any]) -> Dict[str, Any]:  # pylint: disable=unused-argument
  try:
    response = table.scan()
    items: List[Dict[str, Any]] = response.get("Items", [])

    # Handle pagination if needed
    while "LastEvaluatedKey" in response:
      response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
      items.extend(response.get("Items", []))

    total = len(items)
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    summaries: List[str] = []
    topics: List[str] = []

    for item in items:
      sentiment = (item.get("sentiment") or "").lower()
      if sentiment in sentiment_counts:
        sentiment_counts[sentiment] += 1

      if item.get("summary"):
        summaries.append(item["summary"])

      if isinstance(item.get("topics"), list):
        topics.extend([str(t) for t in item["topics"]])

    result = {
        "totalSubmissions": total,
        "sentimentCounts": sentiment_counts,
        "summaries": summaries,
        "topics": topics,
    }

    return {
        "statusCode": 200,
        "headers": _cors_headers(),
        "body": json.dumps(result),
    }
  except (BotoCoreError, ClientError) as exc:
    print(f"Failed to read insights: {exc}")
    return {
        "statusCode": 500,
        "headers": _cors_headers(),
        "body": json.dumps({"message": "Failed to load insights"}),
    }


def call_bedrock_analysis(message: str) -> Dict[str, Any]:
  """
  Calls Amazon Bedrock (Claude) to extract sentiment, topics and summary.
  Expects the model to return strict JSON.
  """
  prompt = f"""
You are an HR analytics assistant. Analyze the following employee feedback.

Return a JSON object with exactly these fields:
- sentiment: one of "positive", "negative", or "neutral"
- topics: an array of short topic strings (1-4 words each)
- summary: a single sentence summarizing the feedback

Respond with JSON only, no additional text.

Feedback:
\"\"\"{message}\"\"\"
""".strip()

  body = {
      "anthropic_version": "bedrock-2023-05-31",
      "max_tokens": 256,
      "temperature": 0,
      "messages": [
          {
              "role": "user",
              "content": [{"type": "text", "text": prompt}],
          }
      ],
  }

  response = bedrock.invoke_model(
      modelId=BEDROCK_MODEL_ID,
      body=json.dumps(body),
      contentType="application/json",
      accept="application/json",
  )

  response_body = json.loads(response["body"].read())
  # Claude responses under 'content' list with type=text
  text_chunks = [
      c.get("text", "")
      for c in response_body.get("content", [])
      if c.get("type") == "text"
  ]
  combined = "".join(text_chunks).strip()

  try:
    parsed = json.loads(combined)
  except json.JSONDecodeError:
    # Try to salvage JSON from within text
    start = combined.find("{")
    end = combined.rfind("}")
    if start != -1 and end != -1 and end > start:
      parsed = json.loads(combined[start : end + 1])
    else:
      raise

  # Basic normalization
  sentiment = str(parsed.get("sentiment", "neutral")).lower()
  if sentiment not in {"positive", "negative", "neutral"}:
    sentiment = "neutral"

  topics_raw = parsed.get("topics") or []
  if not isinstance(topics_raw, list):
    topics_raw = [str(topics_raw)]

  summary = str(parsed.get("summary", "")).strip()

  return {
      "sentiment": sentiment,
      "topics": topics_raw,
      "summary": summary,
  }

