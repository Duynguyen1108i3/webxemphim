import { createBrowserRouter } from "react-router-dom";
import { AdminShell } from "../components/AdminShell";
import { DashboardPage } from "../pages/DashboardPage";
import { MovieManagementPage } from "../pages/MovieManagementPage";
import { UserManagementPage } from "../pages/UserManagementPage";
import { BillingPage } from "../pages/BillingPage";
import { SecurityPage } from "../pages/SecurityPage";

export const router = createBrowserRouter([
  {
    element: <AdminShell />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/movies", element: <MovieManagementPage /> },
      { path: "/users", element: <UserManagementPage /> },
      { path: "/billing", element: <BillingPage /> },
      { path: "/security", element: <SecurityPage /> },
    ],
  },
]);
