import React, { lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { ErrorBoundary } from "./components/ErrorBoundary";

const MovieDetailPage = lazy(() => import("./pages/MovieDetailPage").then((m) => ({ default: m.MovieDetailPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const WatchPage = lazy(() => import("./pages/WatchPage").then((m) => ({ default: m.WatchPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const MyListPage = lazy(() => import("./pages/MyListPage").then((m) => ({ default: m.MyListPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const AddonsPage = lazy(() => import("./pages/AddonsPage").then((m) => ({ default: m.AddonsPage })));

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/tv-shows", element: <HomePage type="tv-shows" /> },
      { path: "/movies", element: <HomePage type="movies" /> },
      { path: "/new-popular", element: <HomePage type="new-popular" /> },
      { path: "/movie/:slug", element: <React.Suspense fallback={<div className="pt-28">Loading...</div>}><MovieDetailPage /></React.Suspense> },
      { path: "/search", element: <React.Suspense fallback={null}><SearchPage /></React.Suspense> },
      { path: "/profile", element: <React.Suspense fallback={null}><ProfilePage /></React.Suspense> },
      { path: "/my-list", element: <React.Suspense fallback={null}><MyListPage /></React.Suspense> },
      { path: "/addons", element: <React.Suspense fallback={null}><AddonsPage /></React.Suspense> },
      { path: "*", element: <React.Suspense fallback={null}><NotFoundPage /></React.Suspense> }
    ]
  },
  {
    path: "/login",
    element: <React.Suspense fallback={null}><LoginPage /></React.Suspense>
  },
  {
    path: "/register",
    element: <React.Suspense fallback={null}><RegisterPage /></React.Suspense>
  },
  {
    path: "/watch/:id",
    element: <React.Suspense fallback={<div className="grid min-h-screen place-items-center bg-black text-white">Loading...</div>}><WatchPage /></React.Suspense>
  }
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>

);
