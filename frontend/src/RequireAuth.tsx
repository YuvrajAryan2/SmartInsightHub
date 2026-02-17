import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "./auth";

interface Props {
  children: JSX.Element;
}

const RequireAuth: React.FC<Props> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RequireAuth;
