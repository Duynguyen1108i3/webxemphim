import { useEffect, useState } from "react";
import { Button } from "@streamforge/ui";
import { Trash2, ShieldAlert, UserCheck, Search, Loader2 } from "lucide-react";
import { api } from "../lib/api";

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  bannedAt?: string | null;
  suspendedUntil?: string | null;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modifyingId, setModifyingId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserItem | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUsers = async (query = "") => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get<{ users: UserItem[] }>(`/admin/users?search=${encodeURIComponent(query)}`);
      setUsers(res.data.users || []);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || "Không thể tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(search);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleModeration = async (userId: string, action: "BAN" | "RESTORE") => {
    setModifyingId(userId);
    try {
      await api.patch(`/admin/users/${userId}/moderation`, { action });
      await fetchUsers(search);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi thao tác khóa/mở tài khoản");
    } finally {
      setModifyingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    const userId = confirmDeleteUser.id;
    setDeletingId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setConfirmDeleteUser(null);
      await fetchUsers(search);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể xóa tài khoản này");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Quản lý tài khoản người dùng</h2>
          <p className="text-sm text-zinc-400 mt-1">Xem danh sách, phân quyền, khóa tài khoản hoặc xóa vĩnh viễn tài khoản người dùng.</p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/15 rounded-md pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 placeholder-zinc-500"
            />
          </div>
          <Button type="submit" variant="ghost" className="bg-white/10 hover:bg-white/20 text-white text-xs px-4">
            Tìm
          </Button>
        </form>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60 shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400 border-b border-white/10">
            <tr>
              <th className="p-4">Người dùng</th>
              <th>Vai trò</th>
              <th>Ngày tham gia</th>
              <th>Trạng thái</th>
              <th className="text-right p-4">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-red-500" />
                    <span>Đang tải danh sách tài khoản...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-400">
                  Không tìm thấy tài khoản nào.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isBanned = Boolean(user.bannedAt);
                return (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-600 to-zinc-800 text-white font-bold flex items-center justify-center text-sm border border-white/10">
                          {user.username ? user.username[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-bold text-white leading-tight">{user.username}</p>
                          <p className="text-xs text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-zinc-300 border-white/10"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-zinc-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td>
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                          <ShieldAlert size={12} /> Đã khóa (Banned)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <UserCheck size={12} /> Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isBanned ? (
                          <Button
                            variant="ghost"
                            disabled={modifyingId === user.id}
                            onClick={() => handleModeration(user.id, "RESTORE")}
                            className="h-8 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          >
                            Mở khóa
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            disabled={modifyingId === user.id}
                            onClick={() => handleModeration(user.id, "BAN")}
                            className="h-8 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          >
                            Khóa TK
                          </Button>
                        )}

                        <Button
                          variant="danger"
                          disabled={deletingId === user.id}
                          onClick={() => setConfirmDeleteUser(user)}
                          className="h-8 text-xs px-3 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 size={14} /> Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">Xác nhận xóa vĩnh viễn tài khoản</h3>
            <p className="text-sm text-zinc-300">
              Bạn có chắc chắn muốn xóa tài khoản <strong className="text-red-400">{confirmDeleteUser.email}</strong> không?
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed bg-red-500/10 border border-red-500/20 p-3 rounded text-red-300">
              ⚠️ Hành động này sẽ xóa vĩnh viễn toàn bộ hồ sơ, lịch sử xem phim và dữ liệu liên quan của người dùng này khỏi cơ sở dữ liệu và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmDeleteUser(null)}
                className="bg-white/10 hover:bg-white/20 text-white"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                disabled={Boolean(deletingId)}
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                {deletingId && <Loader2 size={16} className="animate-spin" />}
                Xóa ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
