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
    <Box maxWidth={600} mx="auto">
      <Typography variant="h4" gutterBottom>
        Employee Feedback
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Share your thoughts. Our AI will extract sentiment, topics, and
        summaries to help HR and managers make better decisions.
      </Typography>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {success && <Alert severity="success">{success}</Alert>}
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Feedback"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                fullWidth
                required
                multiline
                minRows={4}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={20} color="inherit" /> : undefined
                  }
                >
                  {loading ? "Submitting..." : "Submit Feedback"}
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

