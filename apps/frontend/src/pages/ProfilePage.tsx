import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Check, Camera, LogOut, Save, User, Mail, Lock, KeyRound, Send, ShieldCheck, Sparkles, HelpCircle, RefreshCw, X, Trash2, CreditCard, QrCode, Smartphone, Zap, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore, authApi } from "../store/auth";
import { useNavigate } from "react-router-dom";
import { LiquidGlassBackground } from "../components/LiquidGlassBackground";

const PROFILE_TABS = [
  { id: "general", label: "Ảnh đại diện", icon: User },
  { id: "username", label: "Tên hiển thị", icon: Sparkles },
  { id: "email", label: "Địa chỉ Email", icon: Mail },
  { id: "password", label: "Mật khẩu", icon: Lock },
  { id: "billing", label: "Gói cước VIP", icon: CreditCard },
] as const;

const presetAvatars = [
  { name: "Gato Coder Fisheye", value: "https://i.pinimg.com/736x/d9/29/00/d9290081650be42d78fda3208fc97b8f.jpg" },
  { name: "Mèo Coder Bàn Mini", value: "https://i.pinimg.com/736x/77/fd/20/77fd20eb5fdbad732959cf9fd6656bec.jpg" },
  { name: "Mèo Ngủ Cạnh Mac", value: "https://i.pinimg.com/736x/27/2c/bc/272cbc5a4f0b054c1825a7df3e8d281c.jpg" },
  { name: "Mèo Gõ Phím Siêu Tốc", value: "https://i.pinimg.com/736x/dd/a3/91/dda391ff72469d4c4c603c0c033966e8.jpg" },
  { name: "Mèo Kính Trắng Chill", value: "https://i.pinimg.com/736x/60/ef/ff/60effff1052085826c1eda5c1db835e6.jpg" },
];

export function ProfilePage() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const avatarUrl = useAuthStore(state => state.avatarUrl);
  const setAvatarUrl = useAuthStore(state => state.setAvatarUrl);
  const setUser = useAuthStore(state => state.setUser);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"general" | "username" | "email" | "password" | "billing">("general");


  const activeTabIndex = useMemo(() => {
    const idx = PROFILE_TABS.findIndex((t) => t.id === activeTab);
    return idx !== -1 ? idx : 0;
  }, [activeTab]);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoveredTabIndex, setHoveredTabIndex] = useState<number>(activeTabIndex);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const startPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  useEffect(() => {
    if (!isScrubbing) {
      setHoveredTabIndex(activeTabIndex);
    }
  }, [activeTabIndex, isScrubbing]);

  const startScrubbing = (index: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;

    startPointerPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    setIsScrubbing(true);
    setHoveredTabIndex(index);

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = Math.abs(ev.clientX - startPointerPos.current.x);
      const deltaY = Math.abs(ev.clientY - startPointerPos.current.y);

      if (deltaX > 6 || deltaY > 6) {
        hasDragged.current = true;
      }

      let closestIdx = -1;
      let minDistance = Infinity;

      tabRefs.current.forEach((tabEl, i) => {
        if (!tabEl) return;
        const rect = tabEl.getBoundingClientRect();

        if (ev.clientX >= rect.left && ev.clientX <= rect.right) {
          closestIdx = i;
          minDistance = 0;
        } else {
          const dist = Math.min(
            Math.abs(ev.clientX - rect.left),
            Math.abs(ev.clientX - rect.right)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestIdx = i;
          }
        }
      });

      if (closestIdx !== -1) {
        setHoveredTabIndex((prev) => {
          if (prev !== closestIdx) {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate(8);
              } catch {
                // Ignore vibration errors
              }
            }
            return closestIdx;
          }
          return prev;
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      setIsScrubbing(false);

      setHoveredTabIndex((finalIdx) => {
        const dest = PROFILE_TABS[finalIdx];
        if (dest) {
          setActiveTab(dest.id as any);
          setErrorMsg("");
          setSuccessMsg("");
          setForgotMode(false);
        }
        return finalIdx;
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const displayedTabIndex = isScrubbing ? hoveredTabIndex : activeTabIndex;

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Avatar state
  const [inputAvatar, setInputAvatar] = useState(avatarUrl || "");
  const [customUrlInput, setCustomUrlInput] = useState(() => (avatarUrl && avatarUrl.startsWith("http")) ? avatarUrl : "");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("streamforge:profile:uploaded_photos");
      const initialList: string[] = saved ? JSON.parse(saved) : [];
      if (avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:") || avatarUrl.includes("/")) && !initialList.includes(avatarUrl)) {
        initialList.unshift(avatarUrl);
      }
      return initialList;
    } catch {
      return avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:") || avatarUrl.includes("/")) ? [avatarUrl] : [];
    }
  });

  useEffect(() => {
    if (avatarUrl) {
      setInputAvatar(avatarUrl);
      if (avatarUrl.startsWith("http")) {
        setCustomUrlInput(avatarUrl);
      }
    }
  }, [avatarUrl]);

  // Subscription & Payment State
  const [subTier, setSubTier] = useState<"BASIC" | "STANDARD" | "PREMIUM">("PREMIUM");
  const [subStatus, setSubStatus] = useState("ACTIVE");
  const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [periodEnd, setPeriodEnd] = useState("31/12/2026");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "STANDARD" | "PREMIUM">("PREMIUM");
  const [selectedInterval, setSelectedInterval] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [selectedMethod, setSelectedMethod] = useState<"VIETQR" | "MOMO" | "CARD">("VIETQR");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (user) {
      authApi.request<{ subscription: any }>("/subscriptions/me")
        .then((res) => {
          if (res.subscription) {
            setSubTier(res.subscription.tier || "PREMIUM");
            setSubStatus(res.subscription.status || "ACTIVE");
            setBillingInterval(res.subscription.billingInterval || "YEARLY");
            if (res.subscription.currentPeriodEnd) {
              setPeriodEnd(new Date(res.subscription.currentPeriodEnd).toLocaleDateString("vi-VN"));
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSimulatePayment = async () => {
    setIsProcessingPayment(true);
    try {
      await authApi.request("/subscriptions/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: `sub-${user?.id || "user"}`,
          paymentMethod: selectedMethod
        })
      });
      setSubTier(selectedPlan);
      setBillingInterval(selectedInterval);
      setSubStatus("ACTIVE");
      setSuccessMsg(`🎉 Chúc mừng bạn đã nâng cấp thành công gói ${selectedPlan} (${selectedInterval === "MONTHLY" ? "Hàng tháng" : "Hàng năm"})!`);
      setShowUpgradeModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi xử lý thanh toán");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn tắt tự động gia hạn gói cước không? Bạn vẫn sẽ xem được đến hết chu kỳ hiện tại.")) return;
    try {
      await authApi.request("/subscriptions/cancel", { method: "POST" });
      setSuccessMsg("Đã tắt tự động gia hạn gói cước thành công.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể hủy tự động gia hạn");
    }
  };


  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUploadedPhoto = (newPhotoUrl: string) => {
    setUploadedPhotos(prev => {
      const filtered = prev.filter(url => url !== newPhotoUrl);
      const updated = [newPhotoUrl, ...filtered].slice(0, 6);
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

  // Utility to auto crop square and compress avatar to ~20KB
  const compressImageToAvatar = (file: File, maxSize = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = img.width;
          const height = img.height;
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          const targetDim = Math.min(maxSize, minDim);
          canvas.width = targetDim;
          canvas.height = targetDim;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);

          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          resolve(compressed);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSelectAndSaveAvatar = async (val: string) => {
    if (!val) return;
    setIsSavingAvatar(true);
    setInputAvatar(val);
    if (val.startsWith("http")) {
      setCustomUrlInput(val);
    }
    setAvatarUrl(val);
    if (user) {
      setUser({ ...user, avatarUrl: val });
    }
    try {
      await authApi.updateAvatar(val);
      showSuccess("Đã đổi và lưu ảnh đại diện thành công!");
    } catch (err: any) {
      console.warn("Avatar update notice:", err);
      showSuccess("Đã cập nhật ảnh đại diện thành công!");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Vui lòng chọn tệp hình ảnh hợp lệ!");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError("Kích thước tệp ảnh không được vượt quá 10MB!");
      return;
    }

    try {
      setIsSavingAvatar(true);
      const compressed = await compressImageToAvatar(file, 256);
      addUploadedPhoto(compressed);
      await handleSelectAndSaveAvatar(compressed);
    } catch (err) {
      console.error("Lỗi khi xử lý hình ảnh:", err);
      showError("Không thể xử lý hình ảnh đã chọn!");
    } finally {
      setIsSavingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveAvatar = async () => {
    const targetVal = customUrlInput.trim() || inputAvatar.trim();
    if (!targetVal) return showError("Vui lòng chọn hoặc nhập liên kết ảnh đại diện!");
    if (targetVal.startsWith("http") || targetVal.startsWith("data:") || targetVal.includes("/")) {
      addUploadedPhoto(targetVal);
    }
    await handleSelectAndSaveAvatar(targetVal);
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
  const isCustomImage = Boolean(inputAvatar && (inputAvatar.startsWith("http") || inputAvatar.startsWith("data:") || inputAvatar.startsWith("/") || inputAvatar.includes("/")));

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

        {/* Profile Navigation Tabs styled identically to Home Menu Bar with drag & hold scrubber */}
        <nav
          aria-label="Profile Tabs"
          className={`relative flex items-center justify-between gap-1 p-1.5 rounded-full backdrop-blur-md shadow-inner mb-6 select-none touch-none transition-all duration-300 ${
            isScrubbing
              ? "bg-white/10 border border-white/35 shadow-[0_0_24px_rgba(255,255,255,0.22)] ring-1 ring-white/20"
              : "bg-white/5 border border-white/10"
          }`}
        >
          {PROFILE_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isTarget = displayedTabIndex === index;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                onPointerDown={(e) => startScrubbing(index, e)}
                type="button"
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full transition-all duration-200 z-10 cursor-pointer select-none text-white/60 hover:text-white active:scale-95 text-xs ${
                  isTarget ? "text-white" : ""
                } ${isScrubbing && !isTarget ? "opacity-50" : "opacity-100"}`}
              >
                {isTarget && (
                  <motion.div
                    layoutId="active-profile-tab-pill"
                    className="absolute inset-0 bg-white/20 border border-white/25 rounded-full shadow-[0_3px_14px_rgba(255,255,255,0.15)] z-[-1] backdrop-blur-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
                <Icon
                  size={14}
                  className={`transition-transform duration-200 ${
                    isTarget ? "scale-110 text-white" : "text-white/60"
                  }`}
                />
                <span
                  className={`transition-all duration-200 truncate ${
                    isTarget ? "font-bold text-white scale-105" : "font-medium"
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
                Bộ sưu tập ảnh mèo cute (Pinterest)
              </label>
              <div className="grid grid-cols-5 gap-2.5">
                {presetAvatars.map((item, index) => {
                  const isSelected = inputAvatar === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSelectAndSaveAvatar(item.value)}
                      className="flex flex-col items-center gap-1 focus:outline-none group cursor-pointer"
                    >
                      <div className={`h-12 w-12 rounded-xl border-2 transition duration-200 ${isSelected ? "border-white scale-105 shadow-[0_0_16px_rgba(255,255,255,0.5)] ring-2 ring-white/60" : "border-white/10 hover:border-white/40"} aspect-square overflow-hidden`}>
                        <img 
                          src={item.value} 
                          onError={(e) => {
                            e.currentTarget.src = `/avatars/cat-${index + 1}.jpg`;
                          }}
                          className="h-full w-full object-cover aspect-square" 
                          alt={item.name} 
                        />
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
                  value={customUrlInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomUrlInput(val);
                    if (val.trim().startsWith("http") || val.trim().startsWith("/")) {
                      setInputAvatar(val.trim());
                    }
                  }}
                  placeholder="https://example.com/cat.jpg"
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
                disabled={isSavingAvatar}
                className="flex items-center gap-2 bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] disabled:opacity-50 active:scale-95 cursor-pointer focus:outline-none"
              >
                {isSavingAvatar ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Lưu ảnh đại diện
                  </>
                )}
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

        {/* TAB 5: VIP SUBSCRIPTION & BILLING */}

        {activeTab === "billing" && (
          <div className="space-y-6 animate-fadeIn">
            {/* VIP Status Holographic Hero Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-purple-900/60 via-zinc-900/80 to-pink-900/40 p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-black uppercase tracking-wider">
                      {subTier} MEMBER
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Đang hoạt động
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Gói {subTier === "PREMIUM" ? "Premium 4K Ultra HD" : subTier === "STANDARD" ? "Standard Full HD" : "Basic HD"}
                  </h3>
                  <p className="text-xs text-white/60 mt-1">
                    Chu kỳ thanh toán: <span className="text-white font-semibold">{billingInterval === "YEARLY" ? "Hàng năm (Tiết kiệm 20%)" : "Hàng tháng"}</span> • Hạn dùng: <span className="text-white font-semibold">{periodEnd}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black font-black text-xs px-6 py-3 rounded-full transition-all duration-200 shadow-xl active:scale-95 cursor-pointer shrink-0"
                >
                  <Zap size={14} fill="currentColor" /> Nâng cấp / Đổi gói
                </button>
              </div>

              {/* VIP Perks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 text-xs text-white/80">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                  <Check size={14} className="text-purple-400 shrink-0" />
                  <span>Hình ảnh 4K Ultra HD sắc nét & Âm thanh Dolby</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                  <Check size={14} className="text-purple-400 shrink-0" />
                  <span>Xem đồng thời trên 4 thiết bị cùng lúc</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                  <Check size={14} className="text-purple-400 shrink-0" />
                  <span>Tự động bỏ qua đoạn mở đầu (Skip Intro)</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
                  <Check size={14} className="text-purple-400 shrink-0" />
                  <span>Kho phim 100% không quảng cáo làm gián đoạn</span>
                </div>
              </div>
            </div>

            {/* Plan Management Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.03] text-xs">
              <div>
                <p className="font-bold text-white">Quản lý Gia hạn Tự động</p>
                <p className="text-white/50 text-[11px] mt-0.5">Gói cước sẽ được gia hạn tự động khi đến ngày {periodEnd}.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAutoRenew}
                className="text-white/60 hover:text-white underline text-xs font-semibold self-start sm:self-auto cursor-pointer"
              >
                Hủy tự động gia hạn
              </button>
            </div>
          </div>
        )}

        {/* Upgrade & Payment Simulation Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Nâng cấp Gói xem phim</h3>
                  <p className="text-xs text-white/50 mt-0.5">Chọn gói cước và phương thức thanh toán thuận tiện nhất</p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Step 1: Select Plan Tier */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase">1. Chọn gói cước</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "BASIC", name: "Basic", price: "$7.99", quality: "720p HD", screens: "1 Thiết bị" },
                    { id: "STANDARD", name: "Standard", price: "$12.99", quality: "1080p FHD", screens: "2 Thiết bị" },
                    { id: "PREMIUM", name: "Premium", price: "$17.99", quality: "4K HDR", screens: "4 Thiết bị" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id as any)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        selectedPlan === p.id
                          ? "border-purple-400 bg-purple-500/20 shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {selectedPlan === p.id && <Check size={14} className="text-purple-300" />}
                      </div>
                      <p className="text-sm font-black text-white mt-1">{p.price}<span className="text-[10px] font-normal text-white/50">/tháng</span></p>
                      <p className="text-[10px] text-white/50 mt-1">{p.quality}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Payment Method */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase">2. Phương thức thanh toán</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "VIETQR", label: "VietQR Ngân hàng", icon: QrCode, badge: "Khuyên dùng" },
                    { id: "MOMO", label: "Ví MoMo", icon: Smartphone, badge: "Nhanh chóng" },
                    { id: "CARD", label: "Thẻ Visa / Master", icon: CreditCard, badge: "Quốc tế" }
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m.id as any)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          selectedMethod === m.id
                            ? "border-white bg-white/15 shadow-lg"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={16} className={selectedMethod === m.id ? "text-white" : "text-white/60"} />
                          <span className="text-xs font-bold text-white">{m.label}</span>
                        </div>
                        <span className="text-[10px] text-white/40">{m.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Payment Visual Preview */}
              <div className="p-4 rounded-2xl border border-white/15 bg-black/50 space-y-3">
                {selectedMethod === "VIETQR" && (
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-xl bg-white p-1.5 shadow-md shrink-0 flex items-center justify-center">
                      {/* Generative QR visual representation */}
                      <div className="w-full h-full bg-zinc-900 rounded flex flex-col items-center justify-center p-1 text-center">
                        <QrCode size={48} className="text-white" />
                        <span className="text-[8px] text-white/70 font-mono">VIETQR SCAN</span>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">Quét mã VietQR qua bất kỳ App Ngân hàng</p>
                      <p className="text-white/50 text-[11px]">Ngân hàng: <span className="text-white">MB Bank (Quân Đội)</span></p>
                      <p className="text-white/50 text-[11px]">Số tài khoản: <span className="text-white font-mono font-bold">999988882024</span></p>
                      <p className="text-white/50 text-[11px]">Nội dung: <span className="text-emerald-400 font-mono font-bold">RYTOX VIP {user?.email?.split("@")[0]}</span></p>
                    </div>
                  </div>
                )}

                {selectedMethod === "MOMO" && (
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-pink-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                      MoMo
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">Thanh toán qua Ví điện tử MoMo</p>
                      <p className="text-white/50 text-[11px]">Mở ứng dụng MoMo và xác nhận liên kết tự động</p>
                      <p className="text-emerald-400 text-[11px] font-semibold">Tự động kích hoạt ngay sau 3 giây</p>
                    </div>
                  </div>
                )}

                {selectedMethod === "CARD" && (
                  <div className="text-xs space-y-2">
                    <p className="font-bold text-white">Thanh toán bằng Thẻ Quốc tế (Visa / Master)</p>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      defaultValue="4111 •••• •••• 8888"
                      className="w-full h-9 rounded-xl border border-white/15 bg-black px-3 text-xs text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessingPayment}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black text-xs px-7 py-3 rounded-full transition-all duration-200 shadow-[0_4px_20px_rgba(168,85,247,0.4)] active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {isProcessingPayment ? "Đang xử lý kích hoạt..." : `Kích hoạt gói ${selectedPlan} ngay`}
                </button>
              </div>
            </div>
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


