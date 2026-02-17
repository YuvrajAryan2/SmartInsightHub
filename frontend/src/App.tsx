import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate
} from "react-router-dom";
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
import Login from "./Login";
import RequireAuth from "./RequireAuth";
import { isAuthenticated, isHr, signOut } from "./auth";

import bgImage from "./assets/bg.png";

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [authed, setAuthed] = useState(false);
  const [hr, setHr] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setHr(isHr());
  }, [location]);

  const handleLogout = () => {
    signOut();
    setAuthed(false);
    setHr(false);
    navigate("/login");
  };

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      
      {/* Background */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(10px)",
          transform: "scale(1.1)",
          zIndex: -2
        }}
      />

      <Box
        sx={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          zIndex: -1
        }}
      />

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
        {authed && (
          <AppBar
            position="static"
            elevation={0}
            sx={{
              backdropFilter: "blur(20px)",
              background: "rgba(255,255,255,0.05)"
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
                sx={{ color: "#fff", mr: 2 }}
              >
                Feedback
              </Button>

              {/* HR Only */}
              {hr && (
                <Button
                  component={Link}
                  to="/insights"
                  sx={{ color: "#fff", mr: 2 }}
                >
                  Insights
                </Button>
              )}

              <Button onClick={handleLogout} sx={{ color: "#fff" }}>
                Logout
              </Button>
            </Toolbar>
          </AppBar>
        )}

        {/* Pages */}
        <Container sx={{ flexGrow: 1, py: 6 }}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <FeedbackPage />
                </RequireAuth>
              }
            />

            <Route
              path="/insights"
              element={
                hr ? (
                  <RequireAuth>
                    <InsightsPage />
                  </RequireAuth>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
          </Routes>
        </Container>

        {/* Footer */}
        {authed && (
          <Box
            component="footer"
            sx={{
              py: 3,
              textAlign: "center",
              background: "rgba(255,255,255,0.03)"
            }}
          >
            <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
              Powered by AWS (Comprehend / Bedrock) & AWS Serverless
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default App;
