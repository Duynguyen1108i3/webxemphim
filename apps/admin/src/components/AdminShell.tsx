import { BarChart3, Clapperboard, CreditCard, Shield, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/movies", label: "Movies", icon: Clapperboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/security", label: "Security", icon: Shield }
];

export function AdminShell() {
  return (
    <div className="grid min-h-screen bg-ink text-white md:grid-cols-[260px_1fr]">
      <aside className="border-r border-white/10 p-5">
        <h1 className="text-xl font-black text-ember">RytoxGroup Admin</h1>
        <nav className="mt-8 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon size={17} />{label}</NavLink>)}
        </nav>
      </aside>
      <main className="p-5 md:p-8"><Outlet /></main>
    </div>
  );
}
