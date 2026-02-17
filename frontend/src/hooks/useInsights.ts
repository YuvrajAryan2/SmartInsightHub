import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || ''

export interface TopicCount  { topic: string; count: number }
export interface TrendPoint  { month: string; positive: number; negative: number; neutral: number }
export interface Summary     { summary: string; sentiment: string; topics: string[]; timestamp: string }

export interface InsightsData {
  totalSubmissions : number
  thisMonth        : number
  positivePercent  : number
  topTopic         : string
  sentimentCounts  : { positive: number; negative: number; neutral: number }
  topTopics        : TopicCount[]
  sentimentTrend   : TrendPoint[]
  recentSummaries  : Summary[]
  topics           : string[]
}

export function useInsights(pollMs = 30_000) {
  const [data,    setData]    = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API}/insights`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, pollMs)
    return () => clearInterval(id)
  }, [fetch_, pollMs])

  return { data, loading, error, refetch: fetch_ }
}

export async function submitFeedback(name: string, email: string, message: string) {
  const res = await fetch(`${API}/feedback`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, message }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Error ${res.status}`)
  }
  return res.json()
}
