import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { HomePage } from "../pages/HomePage";

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
  { path: "/login", element: <PageLoader><LoginPage /></PageLoader> },
  { path: "/register", element: <PageLoader><RegisterPage /></PageLoader> },
  { path: "/forgot-password", element: <PageLoader><ForgotPasswordPage /></PageLoader> },
  { path: "/watch/:id", element: <PageLoader fallback={playerLoadingFallback}><WatchPage /></PageLoader> },
]);
