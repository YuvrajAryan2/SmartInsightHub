import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
  Button
} from "@mui/material";
import FeedbackPage from "./pages/FeedbackPage";
import InsightsPage from "./pages/InsightsPage";
import bgImage from "./assets/bg.png";

const App: React.FC = () => {
  const location = useLocation();

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      
      {/* Blurred Background */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(10px)",
          transform: "scale(1.1)",
          zIndex: -2
        }}
      />

      {/* Dark Overlay */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          zIndex: -1
        }}
      />

      {/* ✨ Cute Floating Right-Side Glow */}
      <Box
        sx={{
          position: "absolute",
          right: "6%",
          top: "35%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(236,72,153,0.3) 60%, transparent 80%)",
          filter: "blur(60px)",
          animation: "float 6s ease-in-out infinite",
          zIndex: 0
        }}
      />

      {/* Main Content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Navbar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backdropFilter: "blur(20px)",
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <Toolbar>
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                background:
                  "linear-gradient(90deg, #8b5cf6, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Smart Talent Insight Hub
            </Typography>

            <Button
              component={Link}
              to="/"
              sx={{
                mr: 2,
                color: "#fff",
                borderRadius: 3,
                background:
                  location.pathname === "/"
                    ? "linear-gradient(90deg, #8b5cf6, #ec4899)"
                    : "transparent"
              }}
            >
              Feedback
            </Button>

            <Button
              component={Link}
              to="/insights"
              sx={{
                color: "#fff",
                borderRadius: 3,
                background:
                  location.pathname === "/insights"
                    ? "linear-gradient(90deg, #8b5cf6, #ec4899)"
                    : "transparent"
              }}
            >
              Insights
            </Button>
          </Toolbar>
        </AppBar>

        {/* Pages */}
        <Container sx={{ flexGrow: 1, py: 6 }}>
          <Routes>
            <Route path="/" element={<FeedbackPage />} />
            <Route path="/insights" element={<InsightsPage />} />
          </Routes>
        </Container>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            textAlign: "center",
            backdropFilter: "blur(20px)",
            background: "rgba(255,255,255,0.03)"
          }}
        >
          <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
            Powered by Amazon Bedrock & AWS Serverless
          </Typography>
        </Box>
      </Box>

      {/* Animation Keyframes */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-25px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>
    </Box>
  );
};

export default App;