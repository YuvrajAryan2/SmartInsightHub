import { useState } from 'react'
import {
  Box, Grid, Paper, Typography, Chip, CircularProgress,
  Alert, Tab, Tabs, Skeleton,
} from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useInsights, type InsightsData } from '../hooks/useInsights'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PeopleIcon from '@mui/icons-material/People'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler
)

// ── CHART OPTIONS ──────────────────────────────────────────────────────────────
const chartBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E2D45',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#8B9EC7',
      bodyColor: '#F0F4FF',
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#8B9EC7', font: { size: 12 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#8B9EC7', font: { size: 12 } },
    },
  },
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  delta: string
  gradient: string
}

function StatCard({ icon, label, value, delta, gradient }: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden',
        background: 'rgba(17,29,46,0.9)',
        border: '1px solid rgba(255,255,255,0.09)',
        '&::before': {
          content: '""', position: 'absolute',
          top: 0, left: 0, right: 0, height: '3px',
          background: gradient,
        },
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-3px)' },
      }}
    >
      <Box sx={{
        width: 36, height: 36, borderRadius: 2, mb: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.07)',
      }}>
        {icon}
      </Box>
      <Typography variant="caption" color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={800} sx={{ my: 0.5, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary"
        dangerouslySetInnerHTML={{ __html: delta }} />
    </Paper>
  )
}

// ── WORD CLOUD ────────────────────────────────────────────────────────────────
function WordCloud({ topics }: { topics: string[] }) {
  const counts: Record<string, number> = {}
  topics.forEach(t => { counts[t] = (counts[t] || 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20)
  const max = sorted[0]?.[1] || 1
  const palette = [
    { bg: 'rgba(37,99,235,0.2)',   color: '#93C5FD', border: 'rgba(37,99,235,0.3)' },
    { bg: 'rgba(6,182,212,0.2)',   color: '#67E8F9', border: 'rgba(6,182,212,0.3)' },
    { bg: 'rgba(16,185,129,0.2)',  color: '#6EE7B7', border: 'rgba(16,185,129,0.3)' },
    { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
    { bg: 'rgba(139,92,246,0.2)',  color: '#C4B5FD', border: 'rgba(139,92,246,0.3)' },
  ]
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, p: 1 }}>
      {sorted.map(([text, count], i) => {
        const size = 11 + Math.round((count / max) * 12)
        const c = palette[i % palette.length]
        return (
          <Chip key={text} label={text} title={`${text}: ${count} mentions`}
            size="small"
            sx={{
              fontSize: size, fontWeight: 600, height: 'auto', py: 0.5,
              background: c.bg, color: c.color,
              border: `1px solid ${c.border}`,
              '&:hover': { transform: 'scale(1.06)', opacity: 0.9 },
              transition: 'transform 0.15s',
            }}
          />
        )
      })}
      {sorted.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          No topics yet — submit some feedback first.
        </Typography>
      )}
    </Box>
  )
}

// ── SUMMARIES FEED ────────────────────────────────────────────────────────────
function SummaryFeed({ summaries }: { summaries: InsightsData['recentSummaries'] }) {
  const pillStyle = (s: string) => ({
    positive: { bg: 'rgba(16,185,129,0.2)', color: '#34D399', border: 'rgba(16,185,129,0.3)' },
    negative: { bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: 'rgba(239,68,68,0.25)' },
    neutral:  { bg: 'rgba(245,158,11,0.15)',color: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
  }[s] ?? { bg: 'rgba(255,255,255,0.1)', color: '#fff', border: 'rgba(255,255,255,0.2)' })

  if (summaries.length === 0) {
    return <Typography color="text.secondary" variant="body2">
      No summaries yet — submit feedback and wait for AI processing.
    </Typography>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[...summaries].reverse().map((s, i) => {
        const ps = pillStyle(s.sentiment)
        return (
          <Box key={i} sx={{
            p: 2, borderRadius: 2,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', gap: 1.5, alignItems: 'flex-start',
            '&:hover': { background: 'rgba(255,255,255,0.05)' },
            transition: 'background 0.15s',
          }}>
            <Chip label={s.sentiment} size="small"
              sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    background: ps.bg, color: ps.color,
                    border: `1px solid ${ps.border}`, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ color: '#C8D6F0', lineHeight: 1.6, mb: 0.8 }}>
                "{s.summary}"
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
                {s.topics.slice(0, 4).map(t => (
                  <Chip key={t} label={t} size="small"
                    sx={{ fontSize: 10, height: 20,
                          background: 'rgba(37,99,235,0.15)', color: '#93C5FD',
                          border: '1px solid rgba(37,99,235,0.25)' }} />
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {s.timestamp}
                </Typography>
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function InsightsDashboard() {
  const { data, loading, error } = useInsights(30_000)
  const [tab, setTab] = useState(0)

  if (loading) return (
    <Box sx={{ p: 4 }}>
      <Grid container spacing={2} mb={3}>
        {[1,2,3,4].map(i => <Grid item xs={12} sm={6} md={3} key={i}>
          <Skeleton variant="rounded" height={130} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
        </Grid>)}
      </Grid>
      <Grid container spacing={2}>
        {[1,2].map(i => <Grid item xs={12} md={6} key={i}>
          <Skeleton variant="rounded" height={260} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
        </Grid>)}
      </Grid>
    </Box>
  )

  if (error) return (
    <Alert severity="error" sx={{ m: 4 }}>
      Failed to load insights: {error}
    </Alert>
  )

  if (!data) return null

  // ── Chart datasets ─────────────────────────────────────────────────────────
  const sentimentBarData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [data.sentimentCounts.positive, data.sentimentCounts.neutral, data.sentimentCounts.negative],
      backgroundColor: ['rgba(16,185,129,0.75)', 'rgba(245,158,11,0.75)', 'rgba(239,68,68,0.75)'],
      borderColor:     ['#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 1, borderRadius: 6,
    }],
  }

  const topTopicsData = {
    labels: data.topTopics.map(t => t.topic),
    datasets: [{
      label: 'Mentions',
      data: data.topTopics.map(t => t.count),
      backgroundColor: 'rgba(37,99,235,0.7)',
      borderColor: '#2563EB',
      borderWidth: 1, borderRadius: 4,
    }],
  }

  const trendData = {
    labels: data.sentimentTrend.map(t => t.month),
    datasets: [
      {
        label: 'Positive %', data: data.sentimentTrend.map(t => t.positive),
        borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)',
        tension: 0.4, fill: true, pointRadius: 5,
      },
      {
        label: 'Neutral %', data: data.sentimentTrend.map(t => t.neutral),
        borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)',
        tension: 0.4, fill: false, pointRadius: 5,
      },
      {
        label: 'Negative %', data: data.sentimentTrend.map(t => t.negative),
        borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)',
        tension: 0.4, fill: false, pointRadius: 5,
      },
    ],
  }

  return (
    <Box>
      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon sx={{ color: '#93C5FD', fontSize: 20 }} />}
            label="Total Submissions" value={data.totalSubmissions}
            delta={`<span style="color:#34D399">+${data.thisMonth}</span> this month`}
            gradient="linear-gradient(90deg,#2563EB,#06B6D4)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUpIcon sx={{ color: '#6EE7B7', fontSize: 20 }} />}
            label="Positive Sentiment" value={`${data.positivePercent}%`}
            delta="Of all feedback received"
            gradient="linear-gradient(90deg,#10B981,#34D399)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<EmojiEventsIcon sx={{ color: '#FCD34D', fontSize: 20 }} />}
            label="Top Topic" value={data.topTopic}
            delta="Most mentioned theme"
            gradient="linear-gradient(90deg,#F59E0B,#FCD34D)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CalendarMonthIcon sx={{ color: '#67E8F9', fontSize: 20 }} />}
            label="This Month" value={data.thisMonth}
            delta="Submissions in current month"
            gradient="linear-gradient(90deg,#06B6D4,#3B82F6)"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { color: '#8B9EC7', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: '#93C5FD !important' },
          '& .MuiTabs-indicator': { background: '#2563EB' },
        }}
      >
        <Tab label="📊 Overview" />
        <Tab label="📈 Trends" />
        <Tab label="💬 AI Summaries" />
      </Tabs>

      {/* Overview Tab */}
      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={cardSx}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Sentiment Distribution</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                AI classification of all submitted feedback
              </Typography>
              <Box sx={{ height: 220 }}>
                <Bar data={sentimentBarData} options={chartBase as any} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={cardSx}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Top Skills & Topics</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Most frequently mentioned themes across all feedback
              </Typography>
              <Box sx={{ height: 220 }}>
                <Bar
                  data={topTopicsData}
                  options={{ ...chartBase, indexAxis: 'y', plugins: { ...chartBase.plugins, legend: { display: false } } } as any}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={cardSx}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Topic Word Cloud</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Sized by frequency of mention
              </Typography>
              <WordCloud topics={data.topics} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={cardSx}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Recent AI Summaries</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Generated by Amazon Bedrock · Claude 3 Haiku · Anonymised
              </Typography>
              <SummaryFeed summaries={data.recentSummaries.slice(-5)} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Trends Tab */}
      {tab === 1 && (
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Sentiment Trend — Last 6 Months</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={3}>
            Track whether team morale is improving over time. Rising positive % = healthy culture.
          </Typography>
          {data.sentimentTrend.length < 2 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Trend data requires feedback across multiple months. Keep submitting!
            </Alert>
          ) : (
            <Box sx={{ height: 340 }}>
              <Line
                data={trendData}
                options={{
                  ...chartBase,
                  plugins: {
                    ...chartBase.plugins,
                    legend: {
                      display: true,
                      labels: { color: '#8B9EC7', usePointStyle: true, pointStyleWidth: 12 },
                    },
                  },
                  scales: {
                    ...chartBase.scales,
                    y: { ...chartBase.scales.y, max: 100, ticks: { ...chartBase.scales.y.ticks, callback: (v: any) => `${v}%` } },
                  },
                } as any}
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Summaries Tab */}
      {tab === 2 && (
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>All AI Summaries</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Anonymised one-line summaries · Raw feedback text is never displayed
          </Typography>
          <SummaryFeed summaries={data.recentSummaries} />
        </Paper>
      )}
    </Box>
  )
}

const cardSx = {
  p: 3, borderRadius: 3, height: '100%',
  background: 'rgba(17,29,46,0.9)',
  border: '1px solid rgba(255,255,255,0.09)',
}
