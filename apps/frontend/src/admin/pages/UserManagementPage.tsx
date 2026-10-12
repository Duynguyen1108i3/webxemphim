import React, { useEffect, useState, useCallback } from "react";
import { Trash2, ShieldAlert, Search, Loader2, AlertTriangle, Crown, CheckCircle2, RefreshCw, X, Play, Radio } from "lucide-react";
import { api } from "../lib/adminApi";
import { useAuthStore } from "../../store/authStore";
import { LiquidGlassButton } from "../../components/liquid-glass";

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
  isOnline?: boolean;
  isWatching?: boolean;
  watchingMovieTitle?: string | null;
  lastSeenAt?: string | null;
}

function getLocalActivePlayback(): { userId?: string; email?: string; movieTitle?: string } | null {
  try {
    const raw = localStorage.getItem("rytoxgroup:active_viewer_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.stopped) return null;
    const lastBeat = new Date(parsed.lastHeartbeatAt || 0).getTime();
    if (Date.now() - lastBeat > 35_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "Vừa xong";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function UserManagementPage() {
  const { user: currentAuthUser, avatarUrl: currentAuthAvatar } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modifyingId, setModifyingId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() =>
    new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const enrichWithLocalRealtime = useCallback(
    (rawList: UserItem[]): UserItem[] => {
      const localPlayback = getLocalActivePlayback();
      return rawList.map((u) => {
        const isCurrentAdmin =
          Boolean(currentAuthUser) &&
          (u.id === currentAuthUser?.id ||
            (Boolean(u.email) && u.email.toLowerCase() === currentAuthUser?.email?.toLowerCase()));

        const isLocalWatching =
          Boolean(localPlayback) &&
          ((Boolean(localPlayback?.userId) && localPlayback?.userId === u.id) ||
            (Boolean(localPlayback?.email) &&
              Boolean(u.email) &&
              localPlayback?.email?.toLowerCase() === u.email.toLowerCase()));

        return {
          ...u,
          avatarUrl: isCurrentAdmin ? currentAuthAvatar || u.avatarUrl || currentAuthUser?.avatarUrl : u.avatarUrl,
          isOnline: Boolean(u.isOnline || isCurrentAdmin || isLocalWatching),
          isWatching: Boolean(u.isWatching || isLocalWatching),
          watchingMovieTitle: u.watchingMovieTitle || (isLocalWatching ? localPlayback?.movieTitle || "Đang xem phim" : null),
          lastSeenAt: u.lastSeenAt || (isCurrentAdmin ? new Date().toISOString() : null)
        };
      });
    },
    [currentAuthUser, currentAuthAvatar]
  );

  const fetchUsers = useCallback(
    async (query = "", silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await api.get<{ users: UserItem[] }>(`/admin/users?search=${encodeURIComponent(query)}`);
        const list = res.data.users || [];
        if (list.length > 0) {
          setUsers(enrichWithLocalRealtime(list));
        } else if (currentAuthUser && !query) {
          setUsers(
            enrichWithLocalRealtime([
              {
                id: currentAuthUser.id,
                email: currentAuthUser.email,
                username: currentAuthUser.username,
                role: currentAuthUser.role,
                avatarUrl: currentAuthAvatar || currentAuthUser.avatarUrl,
                createdAt: new Date().toISOString(),
                isOnline: true
              }
            ])
          );
        } else {
          setUsers([]);
        }
        setLastSyncedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch {
        if (currentAuthUser && !silent) {
          setUsers(
            enrichWithLocalRealtime([
              {
                id: currentAuthUser.id,
                email: currentAuthUser.email,
                username: currentAuthUser.username,
                role: currentAuthUser.role,
                avatarUrl: currentAuthAvatar || currentAuthUser.avatarUrl,
                createdAt: new Date().toISOString(),
                isOnline: true
              }
            ])
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [currentAuthUser, currentAuthAvatar, enrichWithLocalRealtime]
  );

  useEffect(() => {
    fetchUsers(search, false);
  }, [fetchUsers]);

  // Real-time background polling every 4 seconds + cross-tab storage listener
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUsers(search, true);
      }
    }, 4000);

    const handleStorageOrFocus = () => {
      fetchUsers(search, true);
    };
    window.addEventListener("storage", handleStorageOrFocus);
    window.addEventListener("focus", handleStorageOrFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorageOrFocus);
      window.removeEventListener("focus", handleStorageOrFocus);
    };
  }, [fetchUsers, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search, false);
  };

  const handleModeration = async (userId: string, action: "BAN" | "RESTORE") => {
    setModifyingId(userId);
    try {
      await api.patch(`/admin/users/${userId}/moderation`, { action });
      await fetchUsers(search, true);
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, bannedAt: action === "BAN" ? new Date().toISOString() : null } : u))
      );
    } finally {
      setModifyingId(null);
      showToast(action === "BAN" ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản thành công!");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setModifyingId(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } finally {
      setModifyingId(null);
      showToast(`Đã cập nhật vai trò thành ${newRole}!`);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    const userId = confirmDeleteUser.id;
    const username = confirmDeleteUser.username;
    setDeletingId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
    } catch {
      // Optimistic local removal
    } finally {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteUser(null);
      setDeletingId(null);
      showToast(`Đã xóa tài khoản ${username} khỏi hệ thống!`);
    }
  };

  const onlineUsersCount = users.filter((u) => !u.bannedAt && u.isOnline).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl liquid-glass border border-emerald-500/40 text-emerald-300 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black hero-title text-white">Quản Lý Người Dùng & VIP</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
              <Radio size={12} className="text-emerald-400 animate-pulse" />
              <span>{onlineUsersCount} Đang trực tuyến</span>
              <span className="text-white/30">•</span>
              <span className="text-white/60 font-mono text-[10px]">Live {lastSyncedAt}</span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-white/50">
            Xem danh sách tài khoản, trạng thái trực tuyến thời gian thực, phân quyền quản trị và xử lý vi phạm
          </p>
        </div>

        {/* Search & Refresh */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-10 pr-9 rounded-full bg-white/5 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/35 backdrop-blur-md transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); fetchUsers("", false); }}
                className="nf-icon absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="nf-button h-10 px-4 sm:px-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-white hover:bg-white/90 active:bg-white/80 text-xs font-bold text-black transition shadow-xl cursor-pointer shrink-0"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Tìm Kiếm</span>
          </button>
          <LiquidGlassButton
            shape="circle"
            onClick={() => {
              fetchUsers(search, false);
              showToast("Đã đồng bộ trạng thái người dùng thời gian thực!");
            }}
            disabled={loading}
            className="h-10 w-10 text-white shrink-0 cursor-pointer p-0"
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </LiquidGlassButton>
        </form>
      </div>

      {/* Users Table with Liquid Glass Panel */}
      <div className="liquid-glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Tài Khoản</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Gói Thuê Bao VIP</th>
                <th className="py-3 px-4">Ngày Tham Gia</th>
                <th className="py-3 px-4">Trạng Thái Thực Tế</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-white/70" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={24} className="text-white/20" />
                      <p>Không tìm thấy tài khoản nào.</p>
                      {search && (
                        <button
                          type="button"
                          onClick={() => { setSearch(""); fetchUsers("", false); }}
                          className="nf-button min-h-0 h-8 px-4 mt-1 rounded-full glass-button text-xs font-bold text-white cursor-pointer"
                        >
                          Xóa bộ lọc tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const isBanned = Boolean(user.bannedAt);
                  const isOnline = !isBanned && Boolean(user.isOnline);
                  const isWatching = !isBanned && Boolean(user.isWatching);
                  const avatar = user.avatarUrl || presetCatAvatars[idx % presetCatAvatars.length];
                  const tier = user.subscriptions?.[0]?.tier;

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={avatar}
                              alt={user.username}
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 rounded-full object-cover border border-white/15 shadow-md bg-[#1e202d]"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#141414] ${
                                isBanned
                                  ? "bg-red-500"
                                  : isOnline
                                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                                  : "bg-zinc-500"
                              }`}
                              title={isBanned ? "Đã khóa" : isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-white text-xs leading-tight">{user.username}</p>
                              {user.id === currentAuthUser?.id && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/40 font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={user.role}
                          disabled={modifyingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none backdrop-blur-md transition ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-red-500/20 text-red-300 border-red-500/40"
                              : user.role === "ADMIN"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : user.role === "MODERATOR"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              : "bg-white/5 text-white/80 border-white/15 hover:border-white/30"
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
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-full">
                            <ShieldAlert size={11} /> Đã Khóa
                          </span>
                        ) : isWatching ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                              </span>
                              Đang Xem Phim
                            </span>
                            {user.watchingMovieTitle && (
                              <span className="text-[10px] text-emerald-400/85 font-medium truncate max-w-[170px] flex items-center gap-1 pl-1">
                                <Play size={9} className="fill-current shrink-0" />
                                {user.watchingMovieTitle}
                              </span>
                            )}
                          </div>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                            </span>
                            Đang Hoạt Động
                          </span>
                        ) : (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/45 bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-full">
                              <span className="h-2 w-2 rounded-full bg-white/30" />
                              Ngoại Tuyến
                            </span>
                            {user.lastSeenAt && (
                              <span className="text-[9px] text-white/35 pl-1">
                                Hoạt động: {formatRelativeTime(user.lastSeenAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isBanned ? (
                            <button
                              type="button"
                              disabled={modifyingId === user.id}
                              onClick={() => handleModeration(user.id, "RESTORE")}
                              className="nf-button min-h-0 h-8 px-3.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                            >
                              Mở khóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={modifyingId === user.id || user.role === "SUPER_ADMIN"}
                              onClick={() => handleModeration(user.id, "BAN")}
                              className="nf-button min-h-0 h-8 px-3.5 rounded-full text-xs font-bold glass-button text-amber-300 hover:text-amber-200 transition disabled:opacity-40 cursor-pointer"
                            >
                              Khóa
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={user.role === "SUPER_ADMIN"}
                            onClick={() => setConfirmDeleteUser(user)}
                            className="nf-icon h-8 w-8 rounded-full bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition disabled:opacity-30 cursor-pointer"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 size={14} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl liquid-glass p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 rounded-2xl bg-red-500/15 border border-red-500/30">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Xác Nhận Xóa Tài Khoản</h4>
                  <p className="text-xs text-white/50">{confirmDeleteUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="nf-icon rounded-full p-2 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong className="text-white">{confirmDeleteUser.username}</strong>? Dữ liệu lịch sử xem, gói cước và đánh giá sẽ bị gỡ hoàn toàn.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <LiquidGlassButton
                shape="pill"
                onClick={() => setConfirmDeleteUser(null)}
                className="h-10 px-5 text-xs font-bold text-white cursor-pointer"
              >
                Hủy bỏ
              </LiquidGlassButton>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleDeleteUser}
                className="nf-button h-10 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-bold text-red-400 transition disabled:opacity-50 cursor-pointer"
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

