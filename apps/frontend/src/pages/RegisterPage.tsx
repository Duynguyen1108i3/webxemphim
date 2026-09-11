import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, useAuthStore } from "../store/auth";
import { Loader2 } from "lucide-react";
import { LiquidGlassBackground } from "../components/LiquidGlassBackground";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    otp?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const setUser = useAuthStore(state => state.setUser);
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!email) {
      errors.email = "Email không được để trống.";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      errors.email = "Địa chỉ email không hợp lệ.";
    }

    if (!username) {
      errors.username = "Tên hiển thị không được để trống.";
    } else if (username.length < 2) {
      errors.username = "Tên hiển thị phải có ít nhất 2 ký tự.";
    }

    if (!password) {
      errors.password = "Mật khẩu không được để trống.";
    } else {
      if (password.length < 8) {
        errors.password = "Mật khẩu phải chứa ít nhất 8 ký tự.";
      } else if (!/[A-Z]/.test(password)) {
        errors.password = "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.";
      } else if (!/[a-z]/.test(password)) {
        errors.password = "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.";
      } else if (!/[0-9]/.test(password)) {
        errors.password = "Mật khẩu phải chứa ít nhất 1 chữ số.";
      } else if (!/[^a-zA-Z0-9]/.test(password)) {
        errors.password = "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.";
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (otpSent && (!otpCode || otpCode.length !== 6)) {
      errors.otp = "Vui lòng nhập mã xác thực gồm 6 chữ số.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtpClick = async () => {
    if (!email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã." }));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.sendOtp(email);
      setOtpSent(true);
      setFieldErrors(prev => ({ ...prev, email: undefined }));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Không thể gửi mã xác nhận. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await authApi.register(email, username, password, otpCode);
      setUser(user);
      navigate("/login", {
        state: {
          email,
          password,
          registeredSuccess: true
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#060608] select-none overflow-x-hidden">
      {/* Pure Monochromatic Liquid Glass Fluid Background (Zero Color) */}
      <LiquidGlassBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <Link to="/" className="brand-logo text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_2px_12px_rgba(255,255,255,0.35)] hover:opacity-90 transition">
          RytoxGroup
        </Link>
      </header>

      {/* Center card */}
      <main className="relative z-10 flex min-h-[calc(100vh-92px)] items-center justify-center p-4">
        <div className="w-full max-w-[460px] rounded-3xl liquid-glass p-7 sm:p-11 shadow-[0_24px_80px_rgba(0,0,0,0.85)] border border-white/20">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tight">Đăng Ký</h1>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 p-3.5 text-xs sm:text-sm font-medium text-red-200 backdrop-blur-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Email Field with inline Send OTP Text Button */}
            <div className="relative w-full">
              <div className="relative flex items-center w-full">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Địa chỉ Email"
                  className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.email ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} pl-5 pr-24 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                  required
                />
                <button
                  type="button"
                  onClick={handleSendOtpClick}
                  disabled={loading || !email}
                  className="absolute right-3 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 transition active:scale-95 disabled:opacity-40 backdrop-blur-md cursor-pointer shadow-sm select-none"
                >
                  {otpSent ? "Gửi lại" : "Gửi mã"}
                </button>
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* OTP Code input field (shows directly below Email) */}
            {otpSent && (
              <div className="relative w-full animate-[fadeIn_0.3s_ease-out]">
                <input
                  type="text"
                  maxLength={6}
                  id="otp"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/[^0-9]/g, ""));
                    if (fieldErrors.otp) setFieldErrors(prev => ({ ...prev, otp: undefined }));
                  }}
                  placeholder="Nhập mã OTP (6 chữ số)"
                  className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.otp ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all font-semibold tracking-widest text-center text-lg backdrop-blur-xl shadow-inner`}
                  required
                />
                {fieldErrors.otp && (
                  <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.otp}</p>
                )}
                <p className="mt-1.5 text-[11px] text-white/60 leading-normal px-1">
                  Mã xác thực 6 chữ số đã được gửi đến email <strong className="text-white">{email}</strong>. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).
                </p>
              </div>
            )}

            <div className="relative w-full">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: undefined }));
                }}
                placeholder="Tên tài khoản (username)"
                className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.username ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                required
              />
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.username}</p>
              )}
            </div>

            <div className="relative w-full">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.password ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                required
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.password}</p>
              )}
              {/* Password strength checklist in pure liquid glass */}
              <div className="mt-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/70 backdrop-blur-md flex flex-col gap-2 select-none">
                <p className="font-bold text-white/90">Yêu cầu mật khẩu:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={password.length >= 8 ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                      {password.length >= 8 ? "✓" : "○"}
                    </span>
                    <span className={password.length >= 8 ? "text-white font-medium" : "text-white/60"}>Tối thiểu 8 ký tự</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={/[A-Z]/.test(password) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[A-Z]/.test(password) ? "text-white font-medium" : "text-white/60"}>1 chữ viết hoa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={/[a-z]/.test(password) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                      {/[a-z]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[a-z]/.test(password) ? "text-white font-medium" : "text-white/60"}>1 chữ viết thường</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={/[0-9]/.test(password) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                      {/[0-9]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[0-9]/.test(password) ? "text-white font-medium" : "text-white/60"}>1 chữ số</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className={/[^a-zA-Z0-9]/.test(password) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                      {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[^a-zA-Z0-9]/.test(password) ? "text-white font-medium" : "text-white/60"}>1 ký tự đặc biệt (!@#...)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative w-full">
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Xác nhận mật khẩu"
                className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.confirmPassword ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                required
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-12 sm:h-13 w-full items-center justify-center rounded-2xl bg-white text-black font-black hover:bg-white/90 hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] active:scale-98 transition duration-300 disabled:opacity-50 cursor-pointer text-sm sm:text-base"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : "Đăng Ký"}
            </button>
          </form>

          {/* Login Redirect info */}
          <div className="mt-7 text-sm text-white/50 font-medium text-center">
            <p>
              Bạn đã có tài khoản?{" "}
              <Link to="/login" className="text-white hover:underline font-bold ml-1">
                Đăng nhập ngay.
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
