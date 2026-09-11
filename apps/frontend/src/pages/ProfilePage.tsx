import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Check, Camera, LogOut, Save, User, Mail, Lock, KeyRound, Send, ShieldCheck, Sparkles, HelpCircle, RefreshCw, X, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore, authApi } from "../store/auth";
import { useNavigate } from "react-router-dom";
import { LiquidGlassBackground } from "../components/LiquidGlassBackground";

const PROFILE_TABS = [
  { id: "general", label: "Ảnh đại diện", icon: User },
  { id: "username", label: "Tên hiển thị", icon: Sparkles },
  { id: "email", label: "Địa chỉ Email", icon: Mail },
  { id: "password", label: "Mật khẩu", icon: Lock },
] as const;

const presetAvatars = [
  { name: "Netflix Red", value: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" },
  { name: "Cyberpunk", value: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
  { name: "Neon Hero", value: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80" },
  { name: "Cinematic", value: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80" },
  { name: "Anime Rei", value: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80" },
  { name: "Obsidian", value: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80" },
  { name: "Ruby Style", value: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80" },
  { name: "Blue Glow", value: "from-blue-500 to-cyan-300" },
  { name: "Neon Sunset", value: "from-yellow-400 to-orange-500" },
  { name: "Purple Dream", value: "from-purple-500 to-pink-500" },
];

export function ProfilePage() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const avatarUrl = useAuthStore(state => state.avatarUrl);
  const setAvatarUrl = useAuthStore(state => state.setAvatarUrl);
  const setUser = useAuthStore(state => state.setUser);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"general" | "username" | "email" | "password">("general");

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Avatar state
  const [inputAvatar, setInputAvatar] = useState(avatarUrl || "");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("streamforge:profile:uploaded_photos");
      const initialList: string[] = saved ? JSON.parse(saved) : [];
      if (avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.includes("/")) && !initialList.includes(avatarUrl)) {
        initialList.unshift(avatarUrl);
      }
      return initialList;
    } catch {
      return avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.includes("/")) ? [avatarUrl] : [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUploadedPhoto = (newPhotoUrl: string) => {
    setUploadedPhotos(prev => {
      const filtered = prev.filter(url => url !== newPhotoUrl);
      const updated = [newPhotoUrl, ...filtered].slice(0, 10);
      try {
        localStorage.setItem("streamforge:profile:uploaded_photos", JSON.stringify(updated));
      } catch (err) {
        console.warn("Could not save avatar history to localStorage:", err);
      }
      return updated;
    });
  };

  const removeUploadedPhoto = (photoUrl: string) => {
    setUploadedPhotos(prev => {
      const updated = prev.filter(url => url !== photoUrl);
      try {
        localStorage.setItem("streamforge:profile:uploaded_photos", JSON.stringify(updated));
      } catch (err) {
        console.warn("Could not update localStorage:", err);
      }
      return updated;
    });
  };

  // Username state
  const [usernameInput, setUsernameInput] = useState(user?.username || "");
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Forgot Password Mode state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [sendingResetCode, setSendingResetCode] = useState(false);
  const [verifyingResetCode, setVerifyingResetCode] = useState(false);

  // Status messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectAndSaveAvatar = async (val: string) => {
    setInputAvatar(val);
    setAvatarUrl(val);
    if (user) {
      setUser({ ...user, avatarUrl: val });
    }
    try {
      await authApi.updateAvatar(val);
      showSuccess("Đã đổi và lưu ảnh đại diện thành công!");
    } catch (err: any) {
      console.warn("Avatar update notice:", err);
      showSuccess("Đã đổi ảnh đại diện thành công!");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      showError("Kích thước ảnh đại diện phải nhỏ hơn 1.5MB!");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === "string") {
        const base64Str = reader.result;
        addUploadedPhoto(base64Str);
        await handleSelectAndSaveAvatar(base64Str);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!inputAvatar.trim()) return showError("Vui lòng chọn hoặc nhập liên kết ảnh đại diện!");
    if (inputAvatar.startsWith("http") || inputAvatar.includes("/")) {
      addUploadedPhoto(inputAvatar);
    }
    await handleSelectAndSaveAvatar(inputAvatar);
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return showError("Vui lòng nhập tên người dùng!");
    if (usernameInput === user?.username) return showError("Tên người dùng không thay đổi!");

    setUsernameLoading(true);
    try {
      await authApi.updateUsername(usernameInput.trim());
      showSuccess("Đổi tên người dùng thành công!");
    } catch (err: any) {
      showError(err?.message || "Không thể đổi tên người dùng!");
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail.trim()) return showError("Vui lòng nhập địa chỉ Email mới!");
    if (newEmail.trim().toLowerCase() === user?.email.toLowerCase()) {
      return showError("Email mới phải khác với Email hiện tại!");
    }

    setSendingOtp(true);
    try {
      await authApi.sendChangeEmailOtp(newEmail.trim());
      setOtpSent(true);
      showSuccess("Mã OTP đã được gửi đến " + newEmail.trim());

      setOtpTimer(60);
      const interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      showError(err?.message || "Lỗi khi gửi mã OTP!");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp.trim() || emailOtp.length !== 6) return showError("Mã OTP gồm 6 chữ số!");

    setUpdatingEmail(true);
    try {
      await authApi.updateEmail(newEmail.trim(), emailOtp.trim());
      showSuccess("Đã cập nhật Email thành công!");
      setNewEmail("");
      setEmailOtp("");
      setOtpSent(false);
    } catch (err: any) {
      showError(err?.message || "Mã OTP không hợp lệ!");
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return showError("Vui lòng nhập mật khẩu hiện tại!");
    if (newPassword.length < 8) return showError("Mật khẩu mới phải từ 8 ký tự!");
    if (newPassword !== confirmPassword) return showError("Xác nhận mật khẩu mới không khớp!");

    setUpdatingPassword(true);
    try {
      await authApi.updatePassword(currentPassword, newPassword);
      showSuccess("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showError(err?.message || "Mật khẩu hiện tại không chính xác!");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendResetCode = async () => {
    if (!user?.email) return showError("Không tìm thấy địa chỉ Email của tài khoản!");
    setSendingResetCode(true);
    try {
      await authApi.sendResetCode(user.email);
      setResetCodeSent(true);
      showSuccess("Mã khôi phục 6 chữ số đã được gửi đến email: " + user.email);
    } catch (err: any) {
      showError(err?.message || "Lỗi khi gửi mã khôi phục!");
    } finally {
      setSendingResetCode(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || resetCode.length !== 6) return showError("Mã khôi phục gồm 6 chữ số!");
    if (resetPassword.length < 8) return showError("Mật khẩu mới phải từ 8 ký tự!");
    if (resetPassword !== confirmResetPassword) return showError("Xác nhận mật khẩu mới không khớp!");

    setVerifyingResetCode(true);
    try {
      await authApi.verifyResetCode(user!.email, resetCode.trim(), resetPassword);
      showSuccess("Đặt lại mật khẩu mới thành công!");
      setForgotMode(false);
      setResetCodeSent(false);
      setResetCode("");
      setResetPassword("");
      setConfirmResetPassword("");
    } catch (err: any) {
      showError(err?.message || "Mã khôi phục không chính xác hoặc đã hết hạn!");
    } finally {
      setVerifyingResetCode(false);
    }
  };

  const displayName = user?.username || "Thành viên";
  const displayEmail = user?.email || "Chưa cập nhật email";
  const isCustomImage = inputAvatar && (inputAvatar.startsWith("http") || inputAvatar.includes("/"));

  return (
    <main className="min-h-screen bg-transparent px-4 pt-24 pb-16 sm:px-6 md:px-8 flex items-center justify-center relative">
      <LiquidGlassBackground />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="w-full max-w-xl liquid-glass rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/15 relative overflow-hidden backdrop-blur-2xl">
        
        {/* Header Navigation Row */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition cursor-pointer text-xs font-semibold focus:outline-none"
          >
            <ArrowLeft size={14} /> Trang chủ
          </button>
          <span className="text-[11px] uppercase tracking-widest text-white/90 font-black flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-sm">
            <Sparkles size={12} className="text-white" /> Quản lý tài khoản
          </span>
        </div>

        {/* User Card Summary Banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick} title="Bấm vào đây để thay đổi ảnh đại diện">
            <div className="h-12 w-12 rounded-xl overflow-hidden shadow-md border border-white/20 aspect-square">
              {isCustomImage ? (
                <img src={inputAvatar} className="h-full w-full object-cover aspect-square" alt="Avatar" />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${inputAvatar || "from-blue-500 to-cyan-300"} grid place-items-center aspect-square`}>
                  <span className="text-xl font-black text-white">{displayName[0].toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera size={14} className="text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white truncate">{displayName}</h3>
            <p className="text-xs text-white/50 truncate">{displayEmail}</p>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-white/70 uppercase">
            {user?.role || "MEMBER"}
          </span>
        </div>

        {/* Alert Feedback Messages */}
        {successMsg && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check size={14} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <ShieldCheck size={14} /> {errorMsg}
          </div>
        )}

        {/* Profile Navigation Tabs styled identically to Home Menu Bar */}
        <nav
          aria-label="Profile Tabs"
          className="relative flex items-center justify-between gap-1 p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner mb-6 select-none"
        >
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorMsg("");
                  setSuccessMsg("");
                  setForgotMode(false);
                }}
                type="button"
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full transition-all duration-200 z-10 cursor-pointer select-none text-white/60 hover:text-white active:scale-95 text-xs ${
                  active ? "text-white" : ""
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-profile-tab-pill"
                    className="absolute inset-0 bg-white/20 border border-white/25 rounded-full shadow-[0_3px_14px_rgba(255,255,255,0.15)] z-[-1] backdrop-blur-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
                <Icon
                  size={14}
                  className={`transition-transform duration-200 ${
                    active ? "scale-110 text-white" : "text-white/60"
                  }`}
                />
                <span
                  className={`transition-all duration-200 truncate ${
                    active ? "font-bold text-white scale-105" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* TAB 1: GENERAL & AVATAR SETTINGS */}
        {activeTab === "general" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Chọn mẫu ảnh đại diện
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {presetAvatars.map((item) => {
                  const isSelected = inputAvatar === item.value;
                  const isImg = item.value.startsWith("http") || item.value.includes("/") || item.value.startsWith("data:");
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSelectAndSaveAvatar(item.value)}
                      className="flex flex-col items-center gap-1 focus:outline-none group cursor-pointer"
                    >
                      <div className={`h-11 w-11 rounded-xl border-2 transition duration-200 ${isSelected ? "border-white scale-105 shadow-[0_0_16px_rgba(255,255,255,0.5)] ring-2 ring-white/60" : "border-white/10 hover:border-white/40"} aspect-square overflow-hidden`}>
                        {isImg ? (
                          <img src={item.value} className="h-full w-full object-cover aspect-square" alt={item.name} />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-br ${item.value}`} />
                        )}
                      </div>
                      <span className="text-[9px] text-white/40 group-hover:text-white transition truncate max-w-full font-medium">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {uploadedPhotos.length > 0 && (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                  Ảnh bạn đã tải lên ({uploadedPhotos.length})
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {uploadedPhotos.map((photoUrl, idx) => {
                    const isSelected = inputAvatar === photoUrl;
                    return (
                      <div key={photoUrl.slice(0, 30) + idx} className="relative group flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectAndSaveAvatar(photoUrl)}
                          className={`h-11 w-11 rounded-xl border-2 transition duration-200 ${isSelected ? "border-white scale-105 shadow-[0_0_16px_rgba(255,255,255,0.5)] ring-2 ring-white/60" : "border-white/10 hover:border-white/40"} aspect-square overflow-hidden cursor-pointer`}
                        >
                          <img src={photoUrl} className="h-full w-full object-cover aspect-square" alt={`Ảnh ${idx + 1}`} />
                        </button>
                        <span className="text-[9px] text-white/40 group-hover:text-white transition font-medium truncate max-w-full">
                          Ảnh tải {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeUploadedPhoto(photoUrl); }}
                          title="Xóa ảnh này"
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-black/80 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Hoặc liên kết ảnh tự chọn (URL)
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={isCustomImage ? inputAvatar : ""}
                  onChange={(e) => setInputAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/15 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Camera size={13} /> Chọn tệp
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="flex items-center gap-2 bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] active:scale-95 cursor-pointer focus:outline-none"
              >
                <Save size={14} /> Lưu ảnh đại diện
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CHANGE USERNAME */}
        {activeTab === "username" && (
          <form onSubmit={handleUpdateUsername} className="space-y-4 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Tên hiển thị người dùng
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-3 text-white/40" />
                <input 
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Nhập tên người dùng mới"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                />
              </div>
              <p className="text-[10px] text-white/40">
                Tên hiển thị công khai trên ứng dụng (từ 3 đến 32 ký tự, gồm chữ cái, chữ số và dấu gạch dưới).
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={usernameLoading}
                className="flex items-center gap-2 bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] disabled:opacity-50 active:scale-95 cursor-pointer focus:outline-none"
              >
                <Save size={14} /> {usernameLoading ? "Đang xử lý..." : "Lưu tên người dùng"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CHANGE EMAIL WITH OTP */}
        {activeTab === "email" && (
          <form onSubmit={handleVerifyEmail} className="space-y-4 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Địa chỉ Email mới
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3.5 top-3 text-white/40" />
                  <input 
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={otpSent}
                    placeholder="email-moi@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={sendingOtp || otpTimer > 0}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-bold transition border border-white/15 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Send size={12} />
                  {sendingOtp ? "Đang gửi..." : otpTimer > 0 ? `Gửi lại (${otpTimer}s)` : "Gửi mã OTP"}
                </button>
              </div>
            </div>

            {otpSent && (
              <div className="space-y-1.5 pt-1 animate-fadeIn">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                  Mã xác thực OTP (6 chữ số)
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3.5 top-3 text-white/40" />
                  <input 
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs font-mono tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                  />
                </div>
                <p className="text-[10px] text-white/40">
                  Mã OTP đã được gửi tới email <span className="text-white/80 font-bold">{newEmail}</span>. Mã có hiệu lực trong 5 phút.
                </p>
              </div>
            )}

            {otpSent && (
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setEmailOtp(""); }}
                  className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition border border-white/10 active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updatingEmail}
                  className="flex items-center gap-2 bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] disabled:opacity-50 active:scale-95 cursor-pointer focus:outline-none"
                >
                  <Save size={14} /> {updatingEmail ? "Đang xác thực..." : "Xác nhận đổi Email"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 4: CHANGE PASSWORD & FORGOT PASSWORD */}
        {activeTab === "password" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Toggle Mode Banner */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
              <span className="text-white/70 font-medium">
                {forgotMode ? "Khôi phục mật khẩu qua Email" : "Đổi mật khẩu đăng nhập"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(!forgotMode);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-white/80 hover:text-white underline font-semibold flex items-center gap-1.5 text-xs focus:outline-none transition cursor-pointer"
              >
                <HelpCircle size={13} />
                {forgotMode ? "Đăng nhập bình thường" : "Quên mật khẩu?"}
              </button>
            </div>

            {/* NORMAL CHANGE PASSWORD FORM */}
            {!forgotMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-3 text-white/40" />
                    <input 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <KeyRound size={14} className="absolute left-3.5 top-3 text-white/40" />
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự (chữ hoa, chữ thường, số, ký tự đặc biệt)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <ShieldCheck size={14} className="absolute left-3.5 top-3 text-white/40" />
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="flex items-center gap-2 bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] disabled:opacity-50 active:scale-95 cursor-pointer focus:outline-none"
                  >
                    <Save size={14} /> {updatingPassword ? "Đang lưu..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            ) : (
              /* FORGOT PASSWORD VIA OTP FORM */
              <form onSubmit={handleVerifyResetCode} className="space-y-3.5 animate-fadeIn">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="text-white/40">Gửi mã khôi phục về Email:</p>
                    <p className="text-white font-bold truncate max-w-[240px]">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendResetCode}
                    disabled={sendingResetCode}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-bold transition border border-white/15 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                  >
                    <RefreshCw size={12} className={sendingResetCode ? "animate-spin" : ""} />
                    {sendingResetCode ? "Đang gửi..." : resetCodeSent ? "Gửi lại mã" : "Gửi mã khôi phục"}
                  </button>
                </div>

                {resetCodeSent && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                        Mã khôi phục (6 chữ số)
                      </label>
                      <div className="relative">
                        <KeyRound size={14} className="absolute left-3.5 top-3 text-white/40" />
                        <input 
                          type="text"
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs font-mono tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-3 text-white/40" />
                        <input 
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="Mật khẩu mới từ 8 ký tự"
                          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <ShieldCheck size={14} className="absolute left-3.5 top-3 text-white/40" />
                        <input 
                          type="password"
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/[0.10] transition shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={verifyingResetCode}
                        className="flex items-center gap-2 bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] disabled:opacity-50 active:scale-95 cursor-pointer focus:outline-none"
                      >
                        <Save size={14} /> {verifyingResetCode ? "Đang xác thực..." : "Xác nhận đặt lại mật khẩu"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        )}

        {/* Footer Actions: Logout and Delete Account */}
        <div className="border-t border-white/10 mt-6 pt-4 flex items-center justify-between">
          <span className="text-[10px] text-white/30">ID Tài khoản: {user?.id || "N/A"}</span>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => {
                if (window.confirm("⚠️ Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản của mình không?\nToàn bộ dữ liệu, danh sách yêu thích và lịch sử xem phim sẽ bị xóa hoàn toàn khỏi hệ thống.")) {
                  authApi.request("/users/me", { method: "DELETE" })
                    .then(() => {
                      logout();
                      navigate("/login");
                    })
                    .catch((err) => {
                      alert(err?.response?.data?.message || "Lỗi xóa tài khoản");
                    });
                }
              }}
              className="flex items-center gap-1.5 text-rose-400/70 hover:text-rose-500 transition text-xs font-semibold cursor-pointer focus:outline-none"
            >
              <Trash2 size={13} /> Xóa tài khoản
            </button>
            <button 
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-white/40 hover:text-white transition text-xs font-semibold cursor-pointer focus:outline-none"
            >
              <LogOut size={13} /> Đăng xuất
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}


