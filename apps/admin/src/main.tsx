import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import { AdminShell } from "./components/AdminShell";
import { DashboardPage } from "./pages/DashboardPage";
import { MovieManagementPage } from "./pages/MovieManagementPage";
import { UserManagementPage } from "./pages/UserManagementPage";

const router = createBrowserRouter([{ element: <AdminShell />, children: [
  { path: "/", element: <DashboardPage /> },
  { path: "/movies", element: <MovieManagementPage /> },
  { path: "/users", element: <UserManagementPage /> },
  { path: "/billing", element: <DashboardPage /> },
  { path: "/security", element: <DashboardPage /> }
] }]);

createRoot(document.getElementById("root")!).render(<React.StrictMode><QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider></React.StrictMode>);
