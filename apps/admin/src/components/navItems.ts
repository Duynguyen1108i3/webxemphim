import { BarChart3, Film, CreditCard, Shield, Users } from "lucide-react";
import type { ComponentType } from "react";

export interface AdminNavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: "/", label: "Tổng quan", shortLabel: "Tổng quan", icon: BarChart3 },
  { to: "/movies", label: "Kho phim & Tập", shortLabel: "Kho phim", icon: Film },
  { to: "/users", label: "Người dùng & VIP", shortLabel: "Người dùng", icon: Users },
  { to: "/billing", label: "Doanh thu & Sổ cái", shortLabel: "Doanh thu", icon: CreditCard },
  { to: "/security", label: "An ninh & OWASP", shortLabel: "An ninh", icon: Shield }
];
