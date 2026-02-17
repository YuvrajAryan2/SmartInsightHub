import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar,
         Toolbar, Typography, Button, Container } from '@mui/material'
import InsightsIcon from '@mui/icons-material/Insights'
import FeedbackIcon from '@mui/icons-material/Feedback'
import FeedbackForm from './components/FeedbackForm'
import InsightsDashboard from './components/InsightsDashboard'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#2563EB' },
    secondary: { main: '#06B6D4' },
    background: { default: '#0D1B2A', paper: '#111D2E' },
    text: { primary: '#F0F4FF', secondary: '#8B9EC7' },
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
            '&.Mui-focused fieldset': { borderColor: '#2563EB' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{
          minHeight: '100vh',
          background: `
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(37,99,235,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 90% 10%, rgba(6,182,212,0.10) 0%, transparent 55%),
            #0D1B2A
          `,
        }}>
          {/* Navigation */}
          <AppBar position="static" elevation={0}
            sx={{ background: 'rgba(13,27,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)' }}>
            <Toolbar sx={{ gap: 1 }}>
              {/* Logo */}
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg,#2563EB,#06B6D4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mr: 1.5, fontSize: 18, boxShadow: '0 0 20px rgba(37,99,235,0.5)',
              }}>
                🧠
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1, letterSpacing: -0.5 }}>
                Talent Insight Hub
              </Typography>

              {/* Nav links */}
              <Button
                component={NavLink} to="/"
                startIcon={<FeedbackIcon />}
                sx={navBtnSx}
              >
                Submit Feedback
              </Button>
              <Button
                component={NavLink} to="/insights"
                startIcon={<InsightsIcon />}
                sx={navBtnSx}
              >
                HR Dashboard
              </Button>
            </Toolbar>
          </AppBar>

          {/* Page content */}
          <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
            {/* Page header */}
            <Routes>
              <Route path="/" element={
                <>
                  <Typography variant="h4" mb={0.5}>Performance Feedback</Typography>
                  <Typography color="text.secondary" mb={4}>
                    Submit peer or self-assessment feedback. AI analysis runs automatically.
                  </Typography>
                  <FeedbackForm />
                </>
              } />
              <Route path="/insights" element={
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                    <Box>
                      <Typography variant="h4" mb={0.5}>HR Analytics Dashboard</Typography>
                      <Typography color="text.secondary">
                        AI-powered insights from all submitted performance feedback · Auto-refreshes every 30s
                      </Typography>
                    </Box>
                    <Box sx={{
                      px: 2, py: 0.75, borderRadius: 4,
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#34D399', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981',
                                 animation: 'pulse 2s infinite',
                                 '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                      Live
                    </Box>
                  </Box>
                  <InsightsDashboard />
                </>
              } />
            </Routes>
          </Container>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  )
}

const navBtnSx = {
  color: '#8B9EC7',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: 14,
  px: 2,
  '&.active': {
    color: '#93C5FD',
    background: 'rgba(37,99,235,0.15)',
    borderRadius: 2,
  },
  '&:hover': { color: '#F0F4FF', background: 'rgba(255,255,255,0.06)' },
}
