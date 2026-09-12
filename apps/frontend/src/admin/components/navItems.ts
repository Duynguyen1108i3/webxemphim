import { BarChart3, Film, CreditCard, Shield, Users } from "lucide-react";
import type { ComponentType } from "react";

export interface AdminNavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: "/admin", label: "Tổng quan", shortLabel: "Tổng quan", icon: BarChart3 },
  { to: "/admin/movies", label: "Kho phim", shortLabel: "Kho phim", icon: Film },
  { to: "/admin/users", label: "Người dùng", shortLabel: "Người dùng", icon: Users },
  { to: "/admin/billing", label: "Doanh thu", shortLabel: "Doanh thu", icon: CreditCard },
  { to: "/admin/security", label: "Bảo mật", shortLabel: "Bảo mật", icon: Shield }
];
