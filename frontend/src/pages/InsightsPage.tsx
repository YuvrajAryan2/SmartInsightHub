import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography
} from "@mui/material";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { fetchInsights, InsightsResponse } from "../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const InsightsPage: React.FC = () => {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchInsights();
        setData(res);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load insights. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sentimentChartData = useMemo(() => {
    if (!data) return null;
    const counts = data.sentimentCounts;
    return {
      labels: ["Positive", "Negative", "Neutral"],
      datasets: [
        {
          label: "Sentiment Count",
          data: [counts.positive, counts.negative, counts.neutral],
          backgroundColor: ["#4caf50", "#f44336", "#ff9800"]
        }
      ]
    };
  }, [data]);

  const topicFrequencies = useMemo(() => {
    if (!data) return {};
    const freq: Record<string, number> = {};
    data.topics.forEach((topic) => {
      const key = topic.toLowerCase();
      freq[key] = (freq[key] || 0) + 1;
    });
    return freq;
  }, [data]);

  const maxTopicFreq = useMemo(() => {
    const values = Object.values(topicFrequencies);
    return values.length ? Math.max(...values) : 1;
  }, [topicFrequencies]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Insights Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Monitor sentiment trends, recurring topics, and AI-generated summaries
        from employee feedback.
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {data && !loading && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Submissions</Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {data.totalSubmissions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sentiment Distribution
                </Typography>
                {sentimentChartData && (
                  <Box sx={{ height: 260 }}>
                    <Bar
                      data={sentimentChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ minHeight: 260 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Topic Word Cloud
                </Typography>
                {Object.keys(topicFrequencies).length === 0 ? (
                  <Typography color="text.secondary">
                    No topics detected yet.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1
                    }}
                  >
                    {Object.entries(topicFrequencies).map(
                      ([topic, count]) => {
                        const weight = 0.6 + (count / maxTopicFreq) * 0.8;
                        return (
                          <Chip
                            key={topic}
                            label={topic}
                            sx={{
                              fontSize: `${0.75 * weight}rem`,
                              px: 1,
                              py: 0.5
                            }}
                            color="secondary"
                            variant="outlined"
                          />
                        );
                      }
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ minHeight: 260 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AI Summaries
                </Typography>
                {data.summaries.length === 0 ? (
                  <Typography color="text.secondary">
                    No summaries available yet.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ maxHeight: 220, overflow: "auto" }}>
                    {data.summaries.map((summary, idx) => (
                      <Typography
                        key={idx}
                        variant="body2"
                        sx={{ borderLeft: "3px solid #1976d2", pl: 1 }}
                      >
                        {summary}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default InsightsPage;

