import axios from "axios";
import { getAccessToken, getStoredSession } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const session = getStoredSession();
  const token = session?.idToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = token;
  }
  return config;
});

export interface FeedbackPayload {
  name: string;
  email: string;
  message: string;
}

export interface InsightsResponse {
  totalSubmissions: number;
  thisMonth?: number;
  positivePercent?: number;
  topTopic?: string;
  sentimentCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
  summaries?: string[];  // Simple string array (backward compatibility)
  recentSummaries?: Array<{  // Detailed summaries
    summary: string;
    sentiment: string;
    topics: string[];
    timestamp: string;
  }>;
  reviews?: Array<{  // Employee reviews with full data
    employeeName: string;
    department: string;
    reviewPeriod: string;
    rating: number;
    sentiment: string;
    summary: string;
    topics: string[];
    timestamp: string;
  }>;
  topTopics?: Array<{topic: string; count: number}>;
  sentimentTrend?: Array<{
    month: string;
    positive: number;
    negative: number;
    neutral: number;
  }>;
  topics: string[];
}

export async function submitFeedback(payload: FeedbackPayload) {
  const res = await api.post(`/feedback`, payload);
  return res.data;
}

export async function fetchInsights(): Promise<InsightsResponse> {
  const res = await api.get(`/insights`);
  return res.data;
}

