import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../store/auth";
import { Loader2 } from "lucide-react";

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
    <div className="relative min-h-screen w-full bg-transparent select-none">
      {/* Background Image with opacity to let ambient background show through */}
      <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/ca6a761f-bd50-44d5-be40-699a737c9d4e/web_translate/VN-vi-20260120-trifectadaily-perspective_alpha_website_large.jpg')] bg-cover bg-center bg-no-repeat opacity-40 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 -z-10" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="brand-logo text-3xl font-black text-[#e50914] tracking-tighter">STREAMFORGE</span>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-92px)] items-center justify-center p-4">
        <div className="w-full max-w-[450px] rounded-2xl liquid-glass px-6 py-12 sm:px-16 sm:py-16 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-7">Khôi Phục Mật Khẩu</h1>

          {error && (
            <div className="mb-4 rounded bg-[#e87c03] p-3.5 text-sm font-medium text-white shadow">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
              <p className="text-sm text-zinc-400 mb-2 leading-relaxed">
                Nhập email của bạn để nhận mã khôi phục mật khẩu (OTP).
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Địa chỉ Email"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 focus:ring-[#e50914]/80 px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex h-12 w-full items-center justify-center rounded bg-[#e50914] font-bold text-white hover:bg-[#b20710] active:scale-95 transition disabled:opacity-50 cursor-pointer text-base"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gửi Mã Khôi Phục"}
              </button>

              <div className="mt-6 text-sm text-zinc-500 font-medium">
                <Link to="/login" className="text-white hover:underline">Quay lại Đăng nhập</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <p className="text-sm text-zinc-400 mb-2 leading-relaxed font-medium">
                Mã xác thực đã được gửi đến email <strong className="text-white">{email}</strong>. Vui lòng kiểm tra console hoặc tệp <code className="text-white bg-zinc-800 px-1 py-0.5 rounded">otp_code.txt</code>.
              </p>

              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Nhập mã OTP (6 chữ số)"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 focus:ring-[#e50914]/80 px-5 text-white text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:border-transparent transition-all"
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
                  className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.newPassword ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                  required
                />
                {fieldErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.newPassword}</p>
                )}
                {/* Visual password helper */}
                <div className="mt-2.5 p-3 rounded bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 flex flex-col gap-1.5 select-none">
                  <p className="font-bold text-zinc-300 mb-0.5">Yêu cầu mật khẩu:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={newPassword.length >= 8 ? "text-green-500" : "text-zinc-500"}>
                        {newPassword.length >= 8 ? "✓" : "○"}
                      </span>
                      <span className={newPassword.length >= 8 ? "text-zinc-300 font-medium" : ""}>Tối thiểu 8 ký tự</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[A-Z]/.test(newPassword) ? "text-green-500" : "text-zinc-500"}>
                        {/[A-Z]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? "text-zinc-300 font-medium" : ""}>1 chữ viết hoa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[a-z]/.test(newPassword) ? "text-green-500" : "text-zinc-500"}>
                        {/[a-z]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? "text-zinc-300 font-medium" : ""}>1 chữ viết thường</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[0-9]/.test(newPassword) ? "text-green-500" : "text-zinc-500"}>
                        {/[0-9]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? "text-zinc-300 font-medium" : ""}>1 chữ số</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <span className={/[^a-zA-Z0-9]/.test(newPassword) ? "text-green-500" : "text-zinc-500"}>
                        {/[^a-zA-Z0-9]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span className={/[^a-zA-Z0-9]/.test(newPassword) ? "text-zinc-300 font-medium" : ""}>1 ký tự đặc biệt (!@#...)</span>
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
                  className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.confirmPassword ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                  required
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center rounded bg-[#e50914] font-bold text-white hover:bg-[#b20710] active:scale-95 transition disabled:opacity-50 cursor-pointer text-base"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Đặt Lại Mật Khẩu"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-zinc-400 hover:text-white font-semibold hover:underline self-center mt-2 cursor-pointer"
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
