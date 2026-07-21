import React, { useState } from "react";
import { ArrowLeft, Check, Camera, LogOut, Save } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

const presetGradients = [
  { name: "Blue Glow", value: "from-blue-500 to-cyan-300" },
  { name: "Neon Sunset", value: "from-yellow-400 to-orange-500" },
  { name: "Purple Dream", value: "from-purple-500 to-pink-500" },
  { name: "Obsidian", value: "from-zinc-600 to-zinc-900" },
  { name: "Emerald", value: "from-green-400 to-teal-600" },
  { name: "Ruby", value: "from-red-500 to-rose-700" }
];

export function ProfilePage() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const avatarUrl = useAuthStore(state => state.avatarUrl);
  const setAvatarUrl = useAuthStore(state => state.setAvatarUrl);
  const navigate = useNavigate();

  const [inputAvatar, setInputAvatar] = useState(avatarUrl || "");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAvatarUrl(inputAvatar);
    setSuccessMsg("Lưu thay đổi thành công!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const displayName = user?.username || "Thành viên";
  const displayEmail = user?.email || "Chưa cập nhật email";

  const isCustomImage = inputAvatar && (inputAvatar.startsWith("http") || inputAvatar.includes("/"));

  return (
    <main className="min-h-screen bg-transparent px-4 pt-28 pb-16 sm:px-8 md:px-14 lg:px-16 flex items-center justify-center">
      <div className="w-full max-w-2xl liquid-glass rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Top Header Row with Back Button */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-8">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/60 hover:text-white transition cursor-pointer text-sm font-semibold focus:outline-none"
          >
            <ArrowLeft size={16} /> Quay lại trang chủ
          </button>
          <span className="text-xs uppercase tracking-widest text-[#e50914] font-black">Cài đặt hồ sơ</span>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-semibold flex items-center gap-2 animate-pulse">
            <Check size={16} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            
            {/* Avatar Preview block */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="h-32 w-32 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 transition-transform duration-300 group-hover:scale-105">
                  {isCustomImage ? (
                    <img 
                      src={inputAvatar} 
                      className="h-full w-full object-cover" 
                      alt="Avatar Preview" 
                      onError={(e) => {
                        // fallback to default gradient on error
                        (e.target as HTMLImageElement).src = "";
                        setInputAvatar("from-blue-500 to-cyan-300");
                      }}
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${inputAvatar || "from-blue-500 to-cyan-300"} grid place-items-center`}>
                      <span className="text-5xl font-black text-white">
                        {displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 pointer-events-none">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Ảnh đại diện</span>
            </div>

            {/* Profile Fields Info */}
            <div className="flex-1 space-y-5 w-full">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Tên người dùng</label>
                <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">
                  {displayName}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Địa chỉ Email</label>
                <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm">
                  {displayEmail}
                </div>
              </div>
            </div>
          </div>

          {/* Preset Avatar Selection Grid */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider block">Chọn ảnh mẫu đại diện</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {presetGradients.map((gradient) => {
                const isSelected = inputAvatar === gradient.value;
                return (
                  <button
                    key={gradient.value}
                    type="button"
                    onClick={() => setInputAvatar(gradient.value)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group cursor-pointer"
                  >
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient.value} border-2 transition duration-300 ${isSelected ? "border-[#e50914] scale-105 shadow-lg" : "border-white/10 hover:border-white/50"}`} />
                    <span className="text-[10px] text-white/50 group-hover:text-white transition font-medium">{gradient.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar Input URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider block">Hoặc dùng ảnh tùy biến bằng URL</label>
            <input 
              type="text"
              value={isCustomImage ? inputAvatar : ""}
              onChange={(e) => setInputAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition"
            />
            <span className="text-[10px] text-white/40 block">Nhập địa chỉ ảnh liên kết (URL) của bạn để hiển thị hình nền đại diện tự chọn.</span>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/10 pt-6 gap-4">
            <button 
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 text-white/40 hover:text-[#e50914] transition duration-300 text-sm font-semibold cursor-pointer py-2 focus:outline-none w-full sm:w-auto"
            >
              <LogOut size={16} /> Đăng xuất khỏi tài khoản
            </button>
            <button 
              type="submit"
              className="flex items-center justify-center gap-2 bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-sm px-6 py-3 rounded-xl transition duration-300 shadow-lg cursor-pointer focus:outline-none w-full sm:w-auto"
            >
              <Save size={16} /> Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
