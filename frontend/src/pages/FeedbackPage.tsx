import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Rating,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { submitFeedback } from "../api";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const REVIEW_PERIODS = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];

const inputSx = {
  "& .MuiOutlinedInput-root": {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    fontFamily: "'DM Mono', monospace",
    fontSize: "14px",
    color: "rgba(255,255,255,0.9)",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(139,92,246,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#8b5cf6" },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.4)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "13px",
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#8b5cf6" },
  "& .MuiSelect-icon": { color: "rgba(255,255,255,0.4)" },
};

const menuProps = {
  PaperProps: {
    sx: {
      background: "#1a1030",
      border: "1px solid rgba(139,92,246,0.3)",
      borderRadius: "12px",
      "& .MuiMenuItem-root": {
        fontFamily: "'DM Mono', monospace",
        fontSize: "13px",
        color: "rgba(255,255,255,0.8)",
        "&:hover": { background: "rgba(139,92,246,0.15)" },
      },
    },
  },
};

const selectSx = {
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  fontFamily: "'DM Mono', monospace",
  fontSize: "13px",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(139,92,246,0.5)" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#8b5cf6" },
  "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.4)" },
};

function SectionLabel({ text }: { text: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Box sx={{ width: 3, height: 14, borderRadius: "2px", background: "linear-gradient(180deg, #8b5cf6, #ec4899)" }} />
      <Typography sx={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
        {text}
      </Typography>
    </Box>
  );
}

const FeedbackPage: React.FC = () => {
  const [form, setForm] = useState({
    reviewerName: "", reviewerEmail: "", employeeName: "",
    department: "", reviewPeriod: "", rating: 3, strengths: "", improvements: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.reviewerName || !form.reviewerEmail || !form.employeeName || !form.strengths) {
      setError("Please fill in all required fields.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const message = `Employee: ${form.employeeName}. Department: ${form.department || "N/A"}. Period: ${form.reviewPeriod || "N/A"}. Rating: ${form.rating}/5. Strengths: ${form.strengths}. Areas for improvement: ${form.improvements || "None specified."}`;
      await submitFeedback({
        name: form.reviewerName,
        email: form.reviewerEmail,
        employeeName: form.employeeName,
        department: form.department,
        reviewPeriod: form.reviewPeriod,
        rating: form.rating,
        message,
      });
      setSuccess(true);
      setForm({ reviewerName: "", reviewerEmail: "", employeeName: "", department: "", reviewPeriod: "", rating: 3, strengths: "", improvements: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');`}</style>
      <Box sx={{ maxWidth: 580, mx: "auto" }}>
        <Typography variant="h4" sx={{
          fontWeight: 800, mb: "8px", textAlign: "center",
          background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Performance Review Submission
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textAlign: "center", mb: "36px", fontFamily: "'DM Mono', monospace" }}>
          Submit a structured review for a team member
        </Typography>

        <Box sx={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px", p: { xs: "24px", md: "32px" },
          backdropFilter: "blur(20px)",
          display: "flex", flexDirection: "column", gap: "18px",
        }}>
          <SectionLabel text="Reviewer" />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <TextField label="Reviewer Name *" value={form.reviewerName} onChange={e => set("reviewerName", e.target.value)} fullWidth sx={inputSx} />
            <TextField label="Reviewer Email *" value={form.reviewerEmail} onChange={e => set("reviewerEmail", e.target.value)} fullWidth sx={inputSx} />
          </Box>

          <Box sx={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
          <SectionLabel text="Employee Being Reviewed" />

          <TextField
            label="Employee Name *" value={form.employeeName}
            onChange={e => set("employeeName", e.target.value)}
            fullWidth sx={inputSx} placeholder="Full name of the employee"
          />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Select
              value={form.department} onChange={e => set("department", e.target.value)}
              displayEmpty fullWidth MenuProps={menuProps}
              sx={{ ...selectSx, color: form.department ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}
              renderValue={v => v || <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Department</span>}
            >
              {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
            <Select
              value={form.reviewPeriod} onChange={e => set("reviewPeriod", e.target.value)}
              displayEmpty fullWidth MenuProps={menuProps}
              sx={{ ...selectSx, color: form.reviewPeriod ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}
              renderValue={v => v || <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Review Period</span>}
            >
              {REVIEW_PERIODS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </Box>

          <Box sx={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
          <SectionLabel text="Review" />

          <Box>
            <Typography sx={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", mb: "10px", fontFamily: "'DM Mono', monospace" }}>
              Overall Performance Rating
            </Typography>
            <Rating
              value={form.rating} onChange={(_, v) => set("rating", v || 1)}
              sx={{ "& .MuiRating-iconFilled": { color: "#8b5cf6" }, "& .MuiRating-iconEmpty": { color: "rgba(255,255,255,0.15)" } }}
            />
          </Box>

          <TextField label="Key Strengths *" value={form.strengths} onChange={e => set("strengths", e.target.value)} multiline rows={3} fullWidth sx={inputSx} placeholder="What does this employee do exceptionally well?" />
          <TextField label="Areas for Improvement" value={form.improvements} onChange={e => set("improvements", e.target.value)} multiline rows={3} fullWidth sx={inputSx} placeholder="What should this employee focus on developing?" />

          {error && (
            <Alert severity="error" sx={{ background: "rgba(236,72,153,0.1)", color: "#ec4899", border: "1px solid rgba(236,72,153,0.3)", borderRadius: "10px", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>
              {error}
            </Alert>
          )}

          <Button
            onClick={handleSubmit} disabled={loading} fullWidth
            sx={{
              mt: "4px", py: "14px", borderRadius: "12px",
              background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
              color: "#fff", fontWeight: 700, fontSize: "13px",
              letterSpacing: "0.08em", textTransform: "uppercase",
              fontFamily: "'DM Mono', monospace",
              transition: "opacity 0.2s, transform 0.2s",
              "&:hover": { opacity: 0.88, transform: "translateY(-1px)" },
              "&:disabled": { opacity: 0.5, background: "linear-gradient(90deg, #8b5cf6, #ec4899)" },
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Submit Review"}
          </Button>
        </Box>
      </Box>

      <Snackbar open={success} autoHideDuration={4000} onClose={() => setSuccess(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" sx={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)", borderRadius: "12px", fontFamily: "'DM Mono', monospace" }}>
          Review submitted successfully!
        </Alert>
      </Snackbar>
    </>
  );
};

export default FeedbackPage;
