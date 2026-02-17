import { useState } from 'react'
import {
  Box, Button, TextField, Typography, Alert,
  CircularProgress, Paper, Chip, LinearProgress,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { submitFeedback } from '../hooks/useInsights'

const MAX_LEN = 3000

export default function FeedbackForm() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const charPct = Math.min((message.length / MAX_LEN) * 100, 100)
  const charColor = charPct > 90 ? 'error' : charPct > 70 ? 'warning' : 'primary'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await submitFeedback(name.trim(), email.trim(), message.trim())
      setSuccess(true)
      setName('')
      setEmail('')
      setMessage('')
      setTimeout(() => setSuccess(false), 6000)
    } catch (err: any) {
      setError(err.message ?? 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 620, mx: 'auto', mt: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Typography variant="h5" fontWeight={800} mb={0.5}>
          Submit Performance Feedback
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Your feedback is processed by AI and anonymised before being shown to HR.
        </Typography>

        {success && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            Feedback submitted! AI analysis is running in the background.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth required label="Your Name" value={name}
            onChange={e => setName(e.target.value)}
            inputProps={{ maxLength: 200 }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth required label="Email Address" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            inputProps={{ maxLength: 200 }}
            helperText="Email is masked before storage for privacy"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth required multiline rows={6}
            label="Performance Feedback" value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_LEN))}
            placeholder="Describe the employee's performance, strengths, and areas for growth..."
            sx={{ mb: 1 }}
          />

          {/* Character count progress */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <LinearProgress
              variant="determinate"
              value={charPct}
              color={charColor}
              sx={{ flex: 1, height: 4, borderRadius: 2 }}
            />
            <Typography variant="caption" color="text.secondary">
              {message.length} / {MAX_LEN}
            </Typography>
          </Box>

          {/* AI info chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {['Sentiment Analysis', 'Topic Extraction', 'AI Summary'].map(label => (
              <Chip key={label} label={label} size="small"
                sx={{ bgcolor: 'rgba(37,99,235,0.15)', color: '#93C5FD',
                      border: '1px solid rgba(37,99,235,0.3)', fontSize: 11 }} />
            ))}
          </Box>

          <Button
            type="submit" variant="contained" fullWidth size="large"
            disabled={loading || !name || !email || !message}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{
              py: 1.5, fontWeight: 700, fontSize: 15,
              background: 'linear-gradient(135deg, #2563EB, #06B6D4)',
              '&:hover': { background: 'linear-gradient(135deg, #1D4ED8, #0891B2)' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
