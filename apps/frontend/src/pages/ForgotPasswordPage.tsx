import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../store/auth";
import { Loader2 } from "lucide-react";
import { LiquidGlassBackground } from "../components/LiquidGlassBackground";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Send email, 2: Enter code & new password
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError("");
    setLoading(true);

    try {
      await authApi.sendResetCode(email);
      setStep(2);
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

  const validateNewPassword = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!newPassword) {
      errors.newPassword = "Mật khẩu mới không được để trống.";
    } else {
      if (newPassword.length < 8) {
        errors.newPassword = "Mật khẩu phải chứa ít nhất 8 ký tự.";
      } else if (!/[A-Z]/.test(newPassword)) {
        errors.newPassword = "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.";
      } else if (!/[a-z]/.test(newPassword)) {
        errors.newPassword = "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.";
      } else if (!/[0-9]/.test(newPassword)) {
        errors.newPassword = "Mật khẩu phải chứa ít nhất 1 chữ số.";
      } else if (!/[^a-zA-Z0-9]/.test(newPassword)) {
        errors.newPassword = "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.";
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Mã khôi phục phải gồm 6 chữ số.");
      return;
    }
    if (!validateNewPassword()) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.verifyResetCode(email, code, newPassword);
      navigate("/login", {
        state: {
          email,
          password: newPassword,
          registeredSuccess: true
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại mã.");
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
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tight">Khôi Phục Mật Khẩu</h1>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 p-3.5 text-xs sm:text-sm font-medium text-red-200 backdrop-blur-md">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-3.5">
              <p className="text-xs sm:text-sm text-white/60 mb-2 leading-relaxed">
                Nhập email của bạn để nhận mã khôi phục mật khẩu (OTP).
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Địa chỉ Email"
                className="w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border border-white/15 focus:border-white/40 px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex h-12 sm:h-13 w-full items-center justify-center rounded-2xl bg-white text-black font-black hover:bg-white/90 hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] active:scale-98 transition duration-300 disabled:opacity-50 cursor-pointer text-sm sm:text-base"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : "Gửi Mã Khôi Phục"}
              </button>

              <div className="mt-6 text-sm text-white/50 font-medium text-center">
                <Link to="/login" className="text-white hover:underline font-bold">
                  Quay lại Đăng nhập
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
              <p className="text-xs sm:text-sm text-white/70 mb-1 leading-relaxed font-medium">
                Mã xác thực đã gửi đến <strong className="text-white">{email}</strong>. Vui lòng kiểm tra hộp thư hoặc tệp <code className="text-white bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/15">otp_code.txt</code>.
              </p>

              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Nhập mã OTP (6 chữ số)"
                className="w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border border-white/15 focus:border-white/40 px-5 text-white text-center text-xl font-bold tracking-widest focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all backdrop-blur-xl shadow-inner"
                required
              />

              <div className="relative w-full">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                  }}
                  placeholder="Mật khẩu mới"
                  className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.newPassword ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                  required
                />
                {fieldErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.newPassword}</p>
                )}

                {/* Visual password helper */}
                <div className="mt-2.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/60 flex flex-col gap-1.5 select-none backdrop-blur-md">
                  <p className="font-bold text-white/80 mb-0.5">Yêu cầu mật khẩu:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={newPassword.length >= 8 ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                        {newPassword.length >= 8 ? "✓" : "○"}
                      </span>
                      <span className={newPassword.length >= 8 ? "text-white font-medium" : ""}>Tối thiểu 8 ký tự</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[A-Z]/.test(newPassword) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                        {/[A-Z]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? "text-white font-medium" : ""}>1 chữ viết hoa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[a-z]/.test(newPassword) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                        {/[a-z]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? "text-white font-medium" : ""}>1 chữ viết thường</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[0-9]/.test(newPassword) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                        {/[0-9]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? "text-white font-medium" : ""}>1 chữ số</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <span className={/[^a-zA-Z0-9]/.test(newPassword) ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/30"}>
                        {/[^a-zA-Z0-9]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[^a-zA-Z0-9]/.test(newPassword) ? "text-white font-medium" : ""}>1 ký tự đặc biệt (!@#...)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative w-full">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Xác nhận mật khẩu mới"
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
                className="mt-3 flex h-12 sm:h-13 w-full items-center justify-center rounded-2xl bg-white text-black font-black hover:bg-white/90 hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] active:scale-98 transition duration-300 disabled:opacity-50 cursor-pointer text-sm sm:text-base"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : "Đặt Lại Mật Khẩu"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-white/50 hover:text-white font-semibold hover:underline self-center mt-3 cursor-pointer transition"
              >
                Nhập lại email khác
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
