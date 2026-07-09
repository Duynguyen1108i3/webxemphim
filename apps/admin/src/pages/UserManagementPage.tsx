import { Button } from "@streamforge/ui";

export function UserManagementPage() {
  return (
    <section>
      <h2 className="text-3xl font-black">User management</h2>
      <div className="mt-6 overflow-hidden rounded-md border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/55"><tr><th className="p-3">User</th><th>Plan</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody><tr className="border-t border-white/10"><td className="p-3">member@example.com</td><td>Premium</td><td>Active</td><td className="space-x-2"><Button variant="ghost">Suspend</Button><Button variant="danger">Ban</Button></td></tr></tbody>
        </table>
      </div>
    </section>
  );
}
