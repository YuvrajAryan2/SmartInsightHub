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

const App: React.FC = () => {
  const location = useLocation();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Smart Talent Insight Hub
          </Typography>
          <Button
            color="inherit"
            component={Link}
            to="/"
            variant={location.pathname === "/" ? "outlined" : "text"}
            sx={{ mr: 1 }}
          >
            Feedback
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/insights"
            variant={location.pathname === "/insights" ? "outlined" : "text"}
          >
            Insights
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ flexGrow: 1, py: 4 }}>
        <Routes>
          <Route path="/" element={<FeedbackPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: "center", mt: "auto" }}>
        <Typography variant="body2" color="text.secondary">
          Powered by Amazon Bedrock & AWS Serverless
        </Typography>
      </Box>
    </Box>
  );
};

export default App;

