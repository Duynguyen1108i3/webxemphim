import React, { useEffect, useState } from "react";
import { Trash2, ShieldAlert, UserCheck, Search, Loader2, RefreshCw, AlertTriangle, Sparkles, Crown } from "lucide-react";
import { api } from "../lib/adminApi";

const presetCatAvatars = [
  "https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg",
  "https://i.pinimg.com/736x/77/fd/20/77fd20eb5fdbad732959cf9fd6656bec.jpg",
  "https://i.pinimg.com/736x/27/2c/bc/272cbc5a4f0b054c1825a7df3e8d281c.jpg",
  "https://i.pinimg.com/736x/dd/a3/91/dda391ff72469d4c4c603c0c033966e8.jpg",
  "https://i.pinimg.com/736x/60/ef/ff/60effff1052085826c1eda5c1db835e6.jpg"
];

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  bannedAt?: string | null;
  suspendedUntil?: string | null;
  subscriptions?: Array<{ status: string; tier: string }>;
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
      console.error("fetchUsers error:", err);
      setErrorMsg("Không thể tải danh sách tài khoản từ cơ sở dữ liệu");
      setUsers([]);
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
    } catch {
      // Local optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, bannedAt: action === "BAN" ? new Date().toISOString() : null } : u));
    } finally {
      setModifyingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setModifyingId(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      console.error("Failed to update role:", err);
      alert("Không thể cập nhật quyền tài khoản.");
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
      setUsers(prev => prev.filter(u => u.id !== userId));
      setConfirmDeleteUser(null);
    } catch {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setConfirmDeleteUser(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-2xl md:text-3xl font-black hero-title text-white">Quản Lý Người Dùng & VIP</h2>
          <p className="text-xs md:text-sm text-white/50 mt-0.5">
            Xem danh sách tài khoản, phân quyền quản trị, phân hạng VIP và xử lý vi phạm
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-10 pr-9 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); fetchUsers(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-10 px-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-white hover:bg-white/90 active:bg-white/80 text-xs font-bold text-black transition shadow-xl cursor-pointer shrink-0"
          >
            <Search size={13} />
            <span>Tìm Kiếm</span>
          </button>
        </form>
      </div>

      {/* Users Table with Liquid Glass Panel */}
      <div className="liquid-glass-panel rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Tài Khoản</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Gói Thuê Bao VIP</th>
                <th className="py-3 px-4">Ngày Tham Gia</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-red-500" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">Không tìm thấy tài khoản nào.</td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const isBanned = Boolean(user.bannedAt);
                  const avatar = user.avatarUrl || presetCatAvatars[idx % presetCatAvatars.length];
                  const tier = user.subscriptions?.[0]?.tier;

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatar}
                            alt={user.username}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-10 rounded-full object-cover border border-white/15 shadow-md bg-[#1e202d]"
                          />
                          <div>
                            <p className="font-bold text-white text-xs leading-tight">{user.username}</p>
                            <p className="text-[11px] text-white/40 font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={user.role}
                          disabled={modifyingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none transition ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-red-500/20 text-red-300 border-red-500/40"
                              : user.role === "ADMIN"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : user.role === "MODERATOR"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              : "bg-white/5 text-white/70 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <option value="USER" className="bg-[#18181b] text-white">USER (Xem phim)</option>
                          <option value="MODERATOR" className="bg-[#18181b] text-blue-300">MODERATOR (Kiểm duyệt)</option>
                          <option value="ADMIN" className="bg-[#18181b] text-amber-300">ADMIN (Quản trị)</option>
                          <option value="SUPER_ADMIN" className="bg-[#18181b] text-red-400">SUPER_ADMIN (Toàn quyền)</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        {tier ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            tier === "PREMIUM" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                            tier === "STANDARD" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                            "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30"
                          }`}>
                            <Crown size={11} className="text-amber-400" />
                            {tier}
                          </span>
                        ) : (
                          <span className="text-white/40 text-[11px]">Gói Miễn phí</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-white/40 font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3.5 px-4">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                            <ShieldAlert size={11} /> Đã Khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <UserCheck size={11} /> Hoạt Động
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isBanned ? (
                            <button
                              disabled={modifyingId === user.id}
                              onClick={() => handleModeration(user.id, "RESTORE")}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                            >
                              Mở khóa
                            </button>
                          ) : (
                            <button
                              disabled={modifyingId === user.id || user.role === "SUPER_ADMIN"}
                              onClick={() => handleModeration(user.id, "BAN")}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition disabled:opacity-40"
                            >
                              Khóa
                            </button>
                          )}
                          <button
                            disabled={user.role === "SUPER_ADMIN"}
                            onClick={() => setConfirmDeleteUser(user)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-30"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141620] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Xác Nhận Xóa Tài Khoản</h4>
                <p className="text-xs text-white/50">{confirmDeleteUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong className="text-white">{confirmDeleteUser.username}</strong>? Dữ liệu lịch sử xem, gói cước và đánh giá sẽ bị gỡ hoàn toàn.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="h-10 px-5 inline-flex items-center justify-center rounded-full glass-button text-xs font-bold text-white transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleDeleteUser}
                className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-bold text-red-400 transition disabled:opacity-50 cursor-pointer"
              >
                {deletingId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{deletingId ? "Đang xóa..." : "Xác Nhận Xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
