import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function DashboardPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await api.get("/admin/dashboard")).data });
  const cards = [
    ["Total users", data?.totalUsers ?? 0],
    ["Subscriptions", data?.activeSubscriptions ?? 0],
    ["Revenue", `$${((data?.revenueCents ?? 0) / 100).toLocaleString()}`],
    ["Views", data?.views ?? 0],
    ["Watch hours", Math.round((data?.watchTimeSeconds ?? 0) / 3600)]
  ];
  return (
    <section>
      <h2 className="text-3xl font-black">Operations dashboard</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {cards.map(([label, value]) => <article key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-sm text-white/55">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>)}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5"><h3 className="font-bold">Revenue trend</h3><div className="mt-6 h-56 rounded bg-gradient-to-t from-ember/35 to-white/5" /></div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5"><h3 className="font-bold">Content health</h3><div className="mt-6 h-56 rounded bg-gradient-to-t from-sky-500/30 to-white/5" /></div>
      </div>
    </section>
  );
}
