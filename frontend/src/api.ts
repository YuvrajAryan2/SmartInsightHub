import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface FeedbackPayload {
  name: string;
  email: string;
  message: string;
}

export interface InsightsResponse {
  totalSubmissions: number;
  sentimentCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
  summaries: string[];
  topics: string[];
}

export async function submitFeedback(payload: FeedbackPayload) {
  const res = await axios.post(`${API_BASE_URL}/feedback`, payload);
  return res.data;
}

export async function fetchInsights(): Promise<InsightsResponse> {
  const res = await axios.get(`${API_BASE_URL}/insights`);
  return res.data;
}

