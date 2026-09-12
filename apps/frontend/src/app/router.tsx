import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { HomePage } from "../pages/HomePage";
import { AdminGuard } from "../admin/components/AdminGuard";

const MovieDetailPage = lazy(() => import("../pages/MovieDetailPage").then((module) => ({ default: module.MovieDetailPage })));
const SearchPage = lazy(() => import("../pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const ProfilePage = lazy(() => import("../pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const WatchPage = lazy(() => import("../pages/WatchPage").then((module) => ({ default: module.WatchPage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const MyListPage = lazy(() => import("../pages/MyListPage").then((module) => ({ default: module.MyListPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const NewAndPopularPage = lazy(() => import("../pages/NewAndPopularPage").then((module) => ({ default: module.NewAndPopularPage })));

// Admin lazy pages
const AdminShell = lazy(() => import("../admin/components/AdminShell").then((module) => ({ default: module.AdminShell })));
const AdminDashboardPage = lazy(() => import("../admin/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const AdminMoviePage = lazy(() => import("../admin/pages/MovieManagementPage").then((module) => ({ default: module.MovieManagementPage })));
const AdminUserPage = lazy(() => import("../admin/pages/UserManagementPage").then((module) => ({ default: module.UserManagementPage })));
const AdminBillingPage = lazy(() => import("../admin/pages/BillingPage").then((module) => ({ default: module.BillingPage })));
const AdminSecurityPage = lazy(() => import("../admin/pages/SecurityPage").then((module) => ({ default: module.SecurityPage })));

function PageLoader({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

const pageLoadingFallback = <div className="pt-28">Loading...</div>;
const playerLoadingFallback = <div className="grid min-h-screen place-items-center bg-black text-white">Loading...</div>;

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/tv-shows", element: <HomePage type="tv-shows" /> },
      { path: "/movies", element: <HomePage type="movies" /> },
      { path: "/anime", element: <HomePage type="anime" /> },
      { path: "/new-popular", element: <PageLoader><NewAndPopularPage /></PageLoader> },
      { path: "/movie/:slug", element: <PageLoader fallback={pageLoadingFallback}><MovieDetailPage /></PageLoader> },
      { path: "/search", element: <PageLoader><SearchPage /></PageLoader> },
      { path: "/profile", element: <PageLoader><ProfilePage /></PageLoader> },
      { path: "/my-list", element: <PageLoader><MyListPage /></PageLoader> },
      { path: "*", element: <PageLoader><NotFoundPage /></PageLoader> },
    ],
  },
  {
    path: "/admin",
    element: (
      <AdminGuard>
        <PageLoader>
          <AdminShell />
        </PageLoader>
      </AdminGuard>
    ),
    children: [
      { index: true, element: <PageLoader><AdminDashboardPage /></PageLoader> },
      { path: "movies", element: <PageLoader><AdminMoviePage /></PageLoader> },
      { path: "users", element: <PageLoader><AdminUserPage /></PageLoader> },
      { path: "billing", element: <PageLoader><AdminBillingPage /></PageLoader> },
      { path: "security", element: <PageLoader><AdminSecurityPage /></PageLoader> },
    ],
  },
  { path: "/login", element: <PageLoader><LoginPage /></PageLoader> },
  { path: "/register", element: <PageLoader><RegisterPage /></PageLoader> },
  { path: "/forgot-password", element: <PageLoader><ForgotPasswordPage /></PageLoader> },
  { path: "/watch/:id", element: <PageLoader fallback={playerLoadingFallback}><WatchPage /></PageLoader> },
]);
