import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { submitFeedback } from "../api";

const FeedbackPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !message) {
      setError("Please fill out all fields.");
      return;
    }

    try {
      setLoading(true);
      await submitFeedback({ name, email, message });
      setSuccess("Feedback submitted and being analyzed by AI.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to submit feedback. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={600} width="100%">
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 600,
          textAlign: "center",
          background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}
      >
        Employee Feedback
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        mb={3}
      >
        Share your thoughts. Our AI extracts sentiment, topics, and summaries
        to help HR make better decisions.
      </Typography>

      <Card
        sx={{
          backdropFilter: "blur(20px)",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
        }}
      >
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {success && <Alert severity="success">{success}</Alert>}
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: 2
                  }
                }}
              />

              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: 2
                  }
                }}
              />

              <TextField
                label="Feedback"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                fullWidth
                required
                multiline
                minRows={4}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: 2
                  }
                }}
              />

              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  disabled={loading}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.2,
                    textTransform: "none",
                    fontWeight: 600,
                    color: "#ffffff",  // 🔥 FORCE WHITE TEXT
                    background:
                      "linear-gradient(90deg, #6d28d9, #7c3aed)", // softer purple
                    boxShadow: "none", // remove neon glow
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background:
                        "linear-gradient(90deg, #5b21b6, #6d28d9)"
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Share Feedback"
                  )}
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FeedbackPage;