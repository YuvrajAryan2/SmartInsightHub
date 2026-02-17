import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, CircularProgress, Collapse, Grid, Rating, Stack, Typography,
} from "@mui/material";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from "chart.js";
import { fetchInsights, InsightsResponse } from "../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const P = {
  purple: "#8b5cf6", pink: "#ec4899",
  surface: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.92)", muted: "rgba(255,255,255,0.40)", muted2: "rgba(255,255,255,0.12)",
  pos: "#a78bfa", neu: "#c084fc", neg: "#ec4899",
};
const GRAD = `linear-gradient(90deg, ${P.purple}, ${P.pink})`;

interface EmployeeReview {
  employeeName: string; department: string; rating: number;
  sentiment: string; summary: string; reviewPeriod: string; timestamp: string;
}
interface EnrichedInsights extends InsightsResponse { reviews?: EmployeeReview[]; }

const SENT: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  positive: { color: P.pos,    bg: "rgba(167,139,250,0.12)", label: "Positive", icon: "✦" },
  neutral:  { color: P.neu,    bg: "rgba(192,132,252,0.10)", label: "Neutral",  icon: "◈" },
  negative: { color: P.neg,    bg: "rgba(236,72,153,0.12)",  label: "Negative", icon: "▼" },
  mixed:    { color: "#d8b4fe",bg: "rgba(216,180,254,0.08)", label: "Mixed",    icon: "◐" },
};

function useCountUp(target: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let cur = 0; const step = target / 40;
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(t); } else setVal(Math.floor(cur));
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return val;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function StatCard({ label, value, delay }: { label: string; value: number; delay: string }) {
  const count = useCountUp(value);
  return (
    <Box sx={{
      background: P.surface, border: `1px solid ${P.border}`, borderRadius: "14px",
      p: "22px 20px 18px", backdropFilter: "blur(20px)",
      animation: `slideUp 0.5s ease ${delay} both`,
      transition: "transform 0.2s, box-shadow 0.2s",
      position: "relative", overflow: "hidden",
      "&:hover": { transform: "translateY(-4px)", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" },
      "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: GRAD },
    }}>
      <Typography sx={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1, fontFamily: "monospace", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {count}
      </Typography>
      <Typography sx={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: P.muted, mt: "6px", fontFamily: "monospace" }}>
        {label}
      </Typography>
    </Box>
  );
}

function Panel({ title, children, minH, delay = "0.1s" }: { title: string; children: React.ReactNode; minH?: number; delay?: string }) {
  return (
    <Box sx={{ background: P.surface, border: `1px solid ${P.border}`, backdropFilter: "blur(20px)", borderRadius: "18px", p: "24px", minHeight: minH, animation: `slideUp 0.5s ease ${delay} both` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "6px" }}>
        <Box sx={{ width: 3, height: 16, borderRadius: "2px", background: GRAD }} />
        <Typography sx={{ fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ height: "1px", background: P.border, mb: "20px" }} />
      {children}
    </Box>
  );
}

function EmployeeCard({ review, idx }: { review: EmployeeReview; idx: number }) {
  const [open, setOpen] = useState(false);
  const sent = SENT[review.sentiment?.toLowerCase()] || SENT.neutral;
  return (
    <Box sx={{
      border: `1px solid ${P.border}`, borderRadius: "14px", overflow: "hidden",
      animation: `slideUp 0.4s ease ${idx * 0.07}s both`,
      transition: "border-color 0.2s, box-shadow 0.2s",
      "&:hover": { borderColor: `${P.purple}55`, boxShadow: `0 4px 24px rgba(139,92,246,0.1)` },
    }}>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: "flex", alignItems: "center", gap: "14px", p: "14px 18px",
          cursor: "pointer",
          background: open ? "rgba(139,92,246,0.08)" : P.surface,
          transition: "background 0.2s",
          "&:hover": { background: "rgba(139,92,246,0.07)" },
        }}
      >
        <Box sx={{ width: 40, height: 40, borderRadius: "10px", flexShrink: 0, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
          {getInitials(review.employeeName || "?")}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "14px", color: P.text, fontFamily: "monospace" }}>
            {review.employeeName || "Unknown Employee"}
          </Typography>
          <Typography sx={{ fontSize: "11px", color: P.muted, mt: "1px", fontFamily: "monospace" }}>
            {[review.department, review.reviewPeriod].filter(Boolean).join(" · ") || "—"}
          </Typography>
        </Box>
        {review.rating > 0 && (
          <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <Rating value={review.rating} readOnly size="small"
              sx={{ "& .MuiRating-iconFilled": { color: P.purple }, "& .MuiRating-iconEmpty": { color: P.muted2 } }} />
            <Typography sx={{ fontSize: "10px", color: P.muted, fontFamily: "monospace" }}>{review.rating}/5</Typography>
          </Box>
        )}
        <Box sx={{ flexShrink: 0, border: `1px solid ${sent.color}40`, borderRadius: "999px", px: "10px", py: "4px", background: sent.bg, display: "flex", alignItems: "center", gap: "5px" }}>
          <Typography sx={{ fontSize: "10px", color: sent.color }}>{sent.icon}</Typography>
          <Typography sx={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: sent.color, fontFamily: "monospace", fontWeight: 600 }}>
            {sent.label}
          </Typography>
        </Box>
        <Typography sx={{ color: P.muted, fontSize: "14px", flexShrink: 0, transition: "transform 0.25s", transform: open ? "rotate(180deg)" : "rotate(0deg)", userSelect: "none" }}>
          ▾
        </Typography>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: "18px", pb: "18px", pt: "2px", borderTop: `1px solid ${P.border}`, background: "rgba(0,0,0,0.2)" }}>
          <Typography sx={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: P.muted, fontFamily: "monospace", mt: "14px", mb: "10px" }}>
            AI Summary
          </Typography>
          <Typography sx={{ fontSize: "13px", lineHeight: 1.8, color: P.text, fontFamily: "monospace", borderLeft: `3px solid ${sent.color}`, pl: "14px", py: "10px", pr: "14px", background: sent.bg, borderRadius: "0 8px 8px 0" }}>
            {review.summary || "No AI summary available for this review."}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

function TopicPill({ topic, count, max, idx }: { topic: string; count: number; max: number; idx: number }) {
  const color = idx % 2 === 0 ? P.purple : P.pink;
  const scale = 0.85 + (count / max) * 0.35;
  return (
    <Box sx={{
      border: `1px solid ${color}55`, borderRadius: "999px", px: "14px", py: "6px",
      fontSize: `${12 * scale}px`, color, letterSpacing: "0.04em", fontFamily: "monospace",
      transition: "transform 0.15s, box-shadow 0.15s, background 0.15s", cursor: "default",
      "&:hover": { transform: "scale(1.08)", background: `${color}15`, boxShadow: `0 0 14px ${color}40` },
    }}>
      {topic}
    </Box>
  );
}

const tooltipDefaults = {
  backgroundColor: "rgba(15,10,30,0.95)", borderColor: "rgba(139,92,246,0.3)", borderWidth: 1,
  titleColor: "rgba(255,255,255,0.92)", bodyColor: "rgba(255,255,255,0.45)", padding: 10, cornerRadius: 8,
};

const InsightsPage: React.FC = () => {
  const [data, setData]       = useState<EnrichedInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await fetchInsights() as EnrichedInsights);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load insights.");
      } finally { setLoading(false); }
    })();
  }, []);

  const total   = data?.totalSubmissions ?? 0;
  const sc      = data?.sentimentCounts  ?? { positive: 0, negative: 0, neutral: 0 };
  const topics  = data?.topics           ?? [];
  const reviews = data?.reviews          ?? [];

  const displayReviews: EmployeeReview[] = useMemo(() => {
    // Use reviews from backend if available (has employee data)
    if (reviews.length > 0) {
      return reviews.map(r => ({
        employeeName: r.employeeName || "Unknown Employee",
        department: r.department || "",
        rating: r.rating || 0,
        sentiment: r.sentiment || "neutral",
        summary: r.summary || "",
        reviewPeriod: r.reviewPeriod || "",
        timestamp: r.timestamp || "",
      }));
    }
    // Fallback: use recentSummaries if reviews not available
    if (data?.recentSummaries && data.recentSummaries.length > 0) {
      return data.recentSummaries.map((s, i) => ({
        employeeName: `Employee ${i + 1}`,
        department: "",
        rating: 0,
        sentiment: s.sentiment || "neutral",
        summary: s.summary || "",
        reviewPeriod: "",
        timestamp: s.timestamp || "",
      }));
    }
    // Last fallback: use simple summaries array
    return (data?.summaries ?? []).map((summary, i) => ({
      employeeName: `Employee ${i + 1}`,
      department: "",
      rating: 0,
      sentiment: "neutral",
      summary,
      reviewPeriod: "",
      timestamp: "",
    }));
  }, [reviews, data]);

  const filteredReviews = useMemo(() =>
    displayReviews.filter(r =>
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase())
    ), [displayReviews, search]);

  const topicFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    topics.forEach(t => { const k = t.toLowerCase(); freq[k] = (freq[k] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [topics]);
  const maxFreq = topicFreq[0]?.[1] || 1;

  const sentSlices = [
    { name: "Positive", value: sc.positive, color: P.pos },
    { name: "Neutral",  value: sc.neutral,  color: P.neu },
    { name: "Negative", value: sc.negative, color: P.neg },
  ];

  const doughnutData = { labels: sentSlices.map(s => s.name), datasets: [{ data: sentSlices.map(s => s.value), backgroundColor: sentSlices.map(s => s.color), borderWidth: 0, hoverOffset: 8 }] };
  const barData = { labels: sentSlices.map(s => s.name), datasets: [{ label: "Count", data: sentSlices.map(s => s.value), backgroundColor: sentSlices.map(s => s.color + "cc"), borderRadius: 8, borderSkipped: false as const }] };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { grid: { display: false }, ticks: { color: P.muted, font: { size: 11 } } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: P.muted, font: { size: 11 } }, beginAtZero: true },
    },
  };
  const donutOptions = { cutout: "72%", responsive: true, plugins: { legend: { display: false }, tooltip: tooltipDefaults } };

  const totCount = useCountUp(total);
  const posCount = useCountUp(sc.positive);
  const neuCount = useCountUp(sc.neutral);
  const negCount = useCountUp(sc.negative);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
      <Box sx={{ color: P.text }}>
        <Box sx={{ mb: "36px", animation: "slideUp 0.4s ease both" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "10px" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: P.purple, animation: "pulse 1.8s ease infinite" }} />
            <Typography sx={{ fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "monospace", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Live Dashboard
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: "8px", background: `linear-gradient(90deg, #fff 0%, ${P.purple} 50%, ${P.pink} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AI Insights Dashboard
          </Typography>
          <Typography sx={{ color: P.muted, fontSize: "13px", fontFamily: "monospace" }}>
            Monitor sentiment trends, recurring topics, and AI-generated employee summaries.
          </Typography>
        </Box>

        {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: P.purple }} /></Box>}
        {error   && <Alert severity="error" sx={{ mb: 3, background: "rgba(236,72,153,0.1)", color: P.pink, border: `1px solid ${P.pink}40`, fontFamily: "monospace" }}>{error}</Alert>}

        {data && !loading && (
          <Grid container spacing={2.5}>
            {[
              { label: "Total Reviews", value: totCount, delay: "0s"    },
              { label: "Positive",      value: posCount, delay: "0.07s" },
              { label: "Neutral",       value: neuCount, delay: "0.14s" },
              { label: "Negative",      value: negCount, delay: "0.21s" },
            ].map(c => (
              <Grid item xs={6} sm={3} key={c.label}><StatCard {...c} /></Grid>
            ))}

            <Grid item xs={12} md={4}>
              <Panel title="Sentiment Distribution">
                <Box sx={{ position: "relative", maxWidth: 200, mx: "auto", mb: 2 }}>
                  <Doughnut data={doughnutData} options={donutOptions} />
                  <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <Typography sx={{ fontFamily: "monospace", fontSize: "1.8rem", fontWeight: 800, lineHeight: 1, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total}</Typography>
                    <Typography sx={{ fontSize: "9px", color: P.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>total</Typography>
                  </Box>
                </Box>
                <Stack spacing={1.2}>
                  {sentSlices.map(s => (
                    <Box key={s.name} sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: "11px", color: P.muted, flex: 1, fontFamily: "monospace" }}>{s.name}</Typography>
                      <Box sx={{ flex: 2, height: 3, background: P.muted2, borderRadius: 2, overflow: "hidden" }}>
                        <Box sx={{ height: "100%", background: s.color, borderRadius: 2, width: `${total > 0 ? (s.value / total) * 100 : 0}%`, transition: "width 1s ease" }} />
                      </Box>
                      <Typography sx={{ fontSize: "11px", color: s.color, fontWeight: 700, width: 14, fontFamily: "monospace" }}>{s.value}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Panel>
            </Grid>

            <Grid item xs={12} md={8}>
              <Panel title="Sentiment Volume">
                <Box sx={{ height: 230 }}><Bar data={barData} options={barOptions as any} /></Box>
              </Panel>
            </Grid>

            <Grid item xs={12}>
              <Panel title="Topic Word Cloud" minH={100}>
                {topicFreq.length === 0
                  ? <Typography sx={{ color: P.muted, fontSize: "13px", fontFamily: "monospace" }}>No topics yet.</Typography>
                  : <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                      {topicFreq.map(([topic, count], i) => <TopicPill key={topic} topic={topic} count={count} max={maxFreq} idx={i} />)}
                    </Box>
                }
              </Panel>
            </Grid>

            <Grid item xs={12}>
              <Panel title={`Employee Reviews (${filteredReviews.length})`} delay="0.2s">
                <Box
                  component="input"
                  placeholder="Search by name or department…"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  sx={{
                    width: "100%", mb: "16px", display: "block",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px", p: "10px 16px",
                    color: P.text, fontSize: "13px", fontFamily: "monospace",
                    outline: "none", transition: "border-color 0.2s",
                    "&:focus": { borderColor: P.purple },
                  }}
                />
                {filteredReviews.length === 0
                  ? <Typography sx={{ color: P.muted, fontSize: "13px", fontFamily: "monospace" }}>
                      {displayReviews.length === 0 ? "No reviews yet — submit some feedback first." : "No results match your search."}
                    </Typography>
                  : <Stack spacing={1.5}>
                      {filteredReviews.map((r, i) => <EmployeeCard key={i} review={r} idx={i} />)}
                    </Stack>
                }
              </Panel>
            </Grid>
          </Grid>
        )}
      </Box>
    </>
  );
};

export default InsightsPage;
