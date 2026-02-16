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
  Typography,
  MenuItem,
  Rating
} from "@mui/material";
import { submitFeedback } from "../api";

const FeedbackPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [rating, setRating] = useState<number | null>(3);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !strengths) {
      setError("Please fill out required fields.");
      return;
    }

    const fullMessage = `
Department: ${department}
Review Period: ${reviewPeriod}
Overall Rating: ${rating}/5

Strengths:
${strengths}

Areas for Improvement:
${improvements}
`;

    try {
      setLoading(true);
      await submitFeedback({ name, email, message: fullMessage });
      setSuccess("Review submitted successfully.");

      setName("");
      setEmail("");
      setDepartment("");
      setReviewPeriod("");
      setRating(3);
      setStrengths("");
      setImprovements("");
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
    <Box maxWidth={700} width="100%">
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
        Performance Review Submission
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
                label="Reviewer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />

              <TextField
                label="Reviewer Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />

              {/* Department Dropdown (Opaque Menu) */}
              <TextField
                select
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                fullWidth
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        backgroundColor: "#1e1b4b", // solid dark
                        color: "#fff"
                      }
                    }
                  }
                }}
              >
                {["Engineering", "HR", "Marketing", "Sales", "Operations"].map(
                  (option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  )
                )}
              </TextField>

              {/* Review Period Dropdown (Selectable) */}
              <TextField
                select
                label="Review Period"
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                fullWidth
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        backgroundColor: "#1e1b4b",
                        color: "#fff"
                      }
                    }
                  }
                }}
              >
                {[
                  "Q1 2026",
                  "Q2 2026",
                  "Q3 2026",
                  "Q4 2026",
                  "Annual 2025",
                  "Annual 2026"
                ].map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography gutterBottom>
                  Overall Performance Rating
                </Typography>
                <Rating
                  value={rating}
                  onChange={(event, newValue) => setRating(newValue)}
                />
              </Box>

              <TextField
                label="Key Strengths"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                required
              />

              <TextField
                label="Areas for Improvement"
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                multiline
                minRows={3}
                fullWidth
              />

              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1.2,
                    fontWeight: 600,
                    color: "#fff",
                    background: "#6d28d9",
                    "&:hover": {
                      background: "#5b21b6"
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Submit Review"
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