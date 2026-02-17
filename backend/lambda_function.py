"""
Smart Talent Insight Hub — Lambda Handler
Handles:
  POST /feedback  — validate, store in DynamoDB, trigger async AI via EventBridge
  GET  /insights  — aggregate analytics from DynamoDB
  POST /analyse   — internal trigger from EventBridge → calls Bedrock/Comprehend

All resources in ca-central-1 (Canada Central).
"""

import json
import os
import re
import uuid
import traceback
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

# ── ENV CONFIG ────────────────────────────────────────────────────────────────
TABLE_NAME       = os.environ.get("FEEDBACK_TABLE_NAME", "FeedbackSubmissions")
EXPORT_BUCKET    = os.environ.get("EXPORT_BUCKET_NAME", "")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
AWS_REGION       = os.environ.get("AWS_REGION", "ca-central-1")
AI_PROVIDER      = os.environ.get("AI_PROVIDER", "bedrock").strip().lower()
EVENT_BUS_NAME   = os.environ.get("EVENT_BUS_NAME", "default")
MAX_MESSAGE_LEN  = int(os.environ.get("MAX_MESSAGE_LEN", "3000"))

# ── AWS CLIENTS ───────────────────────────────────────────────────────────────
dynamodb   = boto3.resource("dynamodb", region_name=AWS_REGION)
table      = dynamodb.Table(TABLE_NAME)
bedrock    = boto3.client("bedrock-runtime", region_name=AWS_REGION)
comprehend = boto3.client("comprehend", region_name=AWS_REGION)
events     = boto3.client("events", region_name=AWS_REGION)
s3         = boto3.client("s3", region_name=AWS_REGION) if EXPORT_BUCKET else None

# ─────────────────────────────────────────────────────────────────────────────
# CORS HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _cors() -> Dict[str, str]:
    return {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }


def _resp(status: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status,
        "headers":    _cors(),
        "body":       json.dumps(body, default=str),
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN HANDLER
# ─────────────────────────────────────────────────────────────────────────────

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    # ── EventBridge async trigger ─────────────────────────────────────────────
    if "detail" in event and event.get("source") == "talent.feedback":
        return handle_async_analysis(event["detail"])

    method = event.get("httpMethod", "")
    path   = event.get("path", "")

    # ── CORS preflight ────────────────────────────────────────────────────────
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": _cors(), "body": ""}

    try:
        if path.endswith("/feedback") and method == "POST":
            return handle_post_feedback(event)

        if path.endswith("/insights") and method == "GET":
            return handle_get_insights()

        return _resp(404, {"message": "Not Found"})

    except (BotoCoreError, ClientError) as exc:
        print("AWS ERROR:", str(exc))
        traceback.print_exc()
        return _resp(502, {"message": "AWS service error. Please try again."})

    except Exception as exc:
        print("UNHANDLED ERROR:", str(exc))
        traceback.print_exc()
        return _resp(500, {"message": "Internal server error."})


# ─────────────────────────────────────────────────────────────────────────────
# POST /feedback
# ─────────────────────────────────────────────────────────────────────────────

def handle_post_feedback(event: Dict[str, Any]) -> Dict[str, Any]:
    # ── Parse body ────────────────────────────────────────────────────────────
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"message": "Invalid JSON body."})

    name    = (body.get("name")    or "").strip()[:200]
    email   = (body.get("email")   or "").strip()[:200]
    message = (body.get("message") or "").strip()[:MAX_MESSAGE_LEN]

    # ── Validate ──────────────────────────────────────────────────────────────
    if not name or not email or not message:
        return _resp(400, {"message": "name, email and message are required."})

    if not _valid_email(email):
        return _resp(400, {"message": "Invalid email address."})

    # ── Build record ──────────────────────────────────────────────────────────
    feedback_id = str(uuid.uuid4())
    timestamp   = datetime.now(timezone.utc).isoformat()
    masked_email = _mask_email(email)

    item = {
        "feedbackId":  feedback_id,
        "name":        name,
        "email":       masked_email,          # PII masked at rest
        "message":     message,
        "sentiment":   None,
        "topics":      [],
        "summary":     None,
        "timestamp":   timestamp,
        "aiProcessed": False,
        "aiProvider":  AI_PROVIDER,
    }

    # ── Save to DynamoDB ──────────────────────────────────────────────────────
    table.put_item(Item=item)
    print(f"[FEEDBACK SAVED] feedbackId={feedback_id}")

    # ── Fire EventBridge for async AI processing ──────────────────────────────
    _fire_eventbridge(feedback_id, message, timestamp)

    # ── Return immediately (<1s) ──────────────────────────────────────────────
    return _resp(201, {
        "feedbackId": feedback_id,
        "message":    "Feedback received. AI analysis in progress.",
    })


# ─────────────────────────────────────────────────────────────────────────────
# ASYNC: EventBridge → Lambda (AI analysis)
# ─────────────────────────────────────────────────────────────────────────────

def handle_async_analysis(detail: Dict[str, Any]) -> Dict[str, Any]:
    feedback_id = detail.get("feedbackId")
    message     = detail.get("message", "")
    timestamp   = detail.get("timestamp", "")

    print(f"[ASYNC AI] Processing feedbackId={feedback_id}, provider={AI_PROVIDER}")

    try:
        ai_result = call_ai_analysis(message)
        print(f"[ASYNC AI] Result: {json.dumps(ai_result)}")

        # ── Update DynamoDB with AI results ───────────────────────────────────
        table.update_item(
            Key={"feedbackId": feedback_id},
            UpdateExpression=(
                "SET sentiment = :s, topics = :t, summary = :m, "
                "aiProcessed = :p, aiProvider = :ap"
            ),
            ExpressionAttributeValues={
                ":s":  ai_result["sentiment"],
                ":t":  ai_result["topics"],
                ":m":  ai_result["summary"],
                ":p":  True,
                ":ap": AI_PROVIDER,
            },
        )

        # ── Export to S3 ──────────────────────────────────────────────────────
        if s3 and EXPORT_BUCKET:
            year_month = timestamp[:7]
            key = f"exports/{year_month}/{feedback_id}.json"
            s3.put_object(
                Bucket=EXPORT_BUCKET,
                Key=key,
                Body=json.dumps({
                    "feedbackId": feedback_id,
                    "timestamp":  timestamp,
                    **ai_result,
                }),
                ContentType="application/json",
            )
            print(f"[S3 EXPORT] s3://{EXPORT_BUCKET}/{key}")

    except Exception as exc:
        print(f"[ASYNC AI ERROR] feedbackId={feedback_id}: {exc}")
        traceback.print_exc()
        # Mark as failed so we can retry if needed
        table.update_item(
            Key={"feedbackId": feedback_id},
            UpdateExpression="SET aiProcessed = :p, aiError = :e",
            ExpressionAttributeValues={":p": False, ":e": str(exc)[:500]},
        )

    return {"statusCode": 200, "body": "processed"}


# ─────────────────────────────────────────────────────────────────────────────
# GET /insights
# ─────────────────────────────────────────────────────────────────────────────

def handle_get_insights() -> Dict[str, Any]:
    # ── Scan with pagination ──────────────────────────────────────────────────
    items: List[Dict[str, Any]] = []
    response = table.scan()
    items.extend(response.get("Items", []))
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))

    total = len(items)

    # ── Aggregate sentiment counts ────────────────────────────────────────────
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    summaries: List[Dict[str, Any]] = []
    all_topics: List[str] = []
    monthly_sentiment: Dict[str, Dict[str, int]] = {}

    now = datetime.now(timezone.utc)
    current_month_key = now.strftime("%Y-%m")
    this_month = 0

    for item in items:
        sentiment = (item.get("sentiment") or "neutral").lower()
        if sentiment not in sentiment_counts:
            sentiment = "neutral"
        sentiment_counts[sentiment] += 1

        # Monthly trend aggregation
        ts = item.get("timestamp", "")
        month_key = ts[:7] if ts else "unknown"

        if month_key == current_month_key:
            this_month += 1

        if month_key not in monthly_sentiment:
            monthly_sentiment[month_key] = {"positive": 0, "negative": 0, "neutral": 0}
        if sentiment in monthly_sentiment[month_key]:
            monthly_sentiment[month_key][sentiment] += 1

        # Summaries (only AI-processed ones)
        if item.get("summary") and item.get("aiProcessed"):
            summaries.append({
                "summary":   item["summary"],
                "sentiment": sentiment,
                "topics":    item.get("topics", []),
                "timestamp": ts[:10] if ts else "",
            })

        # Topics
        if isinstance(item.get("topics"), list):
            all_topics.extend(item["topics"])

    # ── Top topics by count ───────────────────────────────────────────────────
    topic_counter = Counter(all_topics)
    top_topics = [
        {"topic": t, "count": c}
        for t, c in topic_counter.most_common(10)
    ]

    # ── Sentiment trend (last 6 months, sorted) ───────────────────────────────
    sentiment_trend = []
    sorted_months = sorted(monthly_sentiment.keys())[-6:]
    for month in sorted_months:
        month_total = sum(monthly_sentiment[month].values()) or 1
        pos = monthly_sentiment[month].get("positive", 0)
        neg = monthly_sentiment[month].get("negative", 0)
        neu = monthly_sentiment[month].get("neutral", 0)
        label = _format_month_label(month)
        sentiment_trend.append({
            "month":    label,
            "positive": round((pos / month_total) * 100),
            "negative": round((neg / month_total) * 100),
            "neutral":  round((neu / month_total) * 100),
        })

    # ── Positive percentage ───────────────────────────────────────────────────
    positive_percent = (
        round((sentiment_counts["positive"] / total) * 100) if total > 0 else 0
    )

    # ── Top topic label ───────────────────────────────────────────────────────
    top_topic = top_topics[0]["topic"] if top_topics else "N/A"

    return _resp(200, {
        "totalSubmissions": total,
        "thisMonth":        this_month,
        "positivePercent":  positive_percent,
        "topTopic":         top_topic,
        "sentimentCounts":  sentiment_counts,
        "topTopics":        top_topics,
        "sentimentTrend":   sentiment_trend,
        "recentSummaries":  summaries[-20:],    # last 20 only
        "topics":           all_topics,         # raw flat list for word cloud
    })


# ─────────────────────────────────────────────────────────────────────────────
# AI ANALYSIS DISPATCHER
# ─────────────────────────────────────────────────────────────────────────────

def call_ai_analysis(message: str) -> Dict[str, Any]:
    if AI_PROVIDER == "comprehend":
        return call_comprehend_analysis(message)
    return call_bedrock_analysis(message)


# ─────────────────────────────────────────────────────────────────────────────
# BEDROCK (Claude 3 Haiku)
# ─────────────────────────────────────────────────────────────────────────────

def call_bedrock_analysis(message: str) -> Dict[str, Any]:
    prompt = (
        f"Analyze this employee performance feedback and respond ONLY with valid JSON. "
        f"No preamble, no markdown, no explanation.\n\n"
        f"Required JSON format:\n"
        f'{{"sentiment": "positive|negative|neutral", '
        f'"topics": ["topic1", "topic2"], '
        f'"summary": "one sentence summary"}}\n\n'
        f'Feedback: """{message}"""'
    )

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens":        300,
        "temperature":       0,
        "messages": [
            {"role": "user", "content": [{"type": "text", "text": prompt}]}
        ],
    }

    print(f"[BEDROCK REQUEST] model={BEDROCK_MODEL_ID}")
    response = bedrock.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )

    response_body = json.loads(response["body"].read())
    print(f"[BEDROCK RESPONSE] {json.dumps(response_body)}")

    text_chunks = [
        c.get("text", "")
        for c in response_body.get("content", [])
        if c.get("type") == "text"
    ]
    raw = "".join(text_chunks).strip()

    # ── Safe JSON extraction (handles markdown fences) ────────────────────────
    return _safe_parse_ai_response(raw)


# ─────────────────────────────────────────────────────────────────────────────
# COMPREHEND FALLBACK
# ─────────────────────────────────────────────────────────────────────────────

def call_comprehend_analysis(message: str) -> Dict[str, Any]:
    text = message.strip()[:4500]   # Comprehend limit

    # Sentiment
    sentiment_resp = comprehend.detect_sentiment(Text=text, LanguageCode="en")
    sentiment_raw  = sentiment_resp.get("Sentiment", "NEUTRAL")
    sentiment_map  = {"POSITIVE": "positive", "NEGATIVE": "negative",
                      "NEUTRAL": "neutral", "MIXED": "neutral"}
    sentiment = sentiment_map.get(sentiment_raw, "neutral")

    # Key phrases as topics
    kp_resp = comprehend.detect_key_phrases(Text=text, LanguageCode="en")
    topics  = [
        p["Text"] for p in kp_resp.get("KeyPhrases", [])
        if p.get("Score", 0) > 0.85 and p.get("Text")
    ][:10]

    summary = (
        f"Feedback classified as {sentiment}. Key themes: {', '.join(topics[:5])}."
        if topics else f"Feedback classified as {sentiment}."
    )

    return {"sentiment": sentiment, "topics": topics, "summary": summary}


# ─────────────────────────────────────────────────────────────────────────────
# EVENTBRIDGE HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _fire_eventbridge(feedback_id: str, message: str, timestamp: str) -> None:
    try:
        events.put_events(Entries=[{
            "Source":       "talent.feedback",
            "DetailType":   "FeedbackSubmitted",
            "EventBusName": EVENT_BUS_NAME,
            "Detail": json.dumps({
                "feedbackId": feedback_id,
                "message":    message,
                "timestamp":  timestamp,
            }),
        }])
        print(f"[EVENTBRIDGE] Event fired for feedbackId={feedback_id}")
    except Exception as exc:
        # EventBridge failure must NOT block the user response
        print(f"[EVENTBRIDGE ERROR] {exc}")
        # Fallback: call AI synchronously so data is still processed
        _sync_fallback_analysis(feedback_id, message, timestamp)


def _sync_fallback_analysis(feedback_id: str, message: str, timestamp: str) -> None:
    """Called only if EventBridge fails — keeps app working."""
    print(f"[SYNC FALLBACK] Running AI for feedbackId={feedback_id}")
    handle_async_analysis({
        "feedbackId": feedback_id,
        "message":    message,
        "timestamp":  timestamp,
    })


# ─────────────────────────────────────────────────────────────────────────────
# UTILITY HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _safe_parse_ai_response(raw: str) -> Dict[str, Any]:
    """Safely extract JSON from AI response, even if wrapped in markdown."""
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()

    # Try direct parse first
    try:
        parsed = json.loads(cleaned)
        return {
            "sentiment": str(parsed.get("sentiment", "neutral")).lower(),
            "topics":    [str(t) for t in parsed.get("topics", [])],
            "summary":   str(parsed.get("summary", ""))[:500],
        }
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object with regex
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            return {
                "sentiment": str(parsed.get("sentiment", "neutral")).lower(),
                "topics":    [str(t) for t in parsed.get("topics", [])],
                "summary":   str(parsed.get("summary", ""))[:500],
            }
        except json.JSONDecodeError:
            pass

    # Final fallback — return safe defaults
    print(f"[AI PARSE FAILED] Raw response: {raw[:200]}")
    return {"sentiment": "neutral", "topics": [], "summary": raw[:200]}


def _valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


def _mask_email(email: str) -> str:
    """Mask email for PII compliance: john.doe@gmail.com → j***.***@gmail.com"""
    try:
        local, domain = email.split("@", 1)
        masked_local = local[0] + "***"
        return f"{masked_local}@{domain}"
    except ValueError:
        return "***@***"


def _format_month_label(month_key: str) -> str:
    """Convert '2025-11' → 'Nov 25'"""
    try:
        dt = datetime.strptime(month_key, "%Y-%m")
        return dt.strftime("%b %y")
    except ValueError:
        return month_key
