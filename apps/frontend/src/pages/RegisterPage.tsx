import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, useAuthStore } from "../store/auth";
import { Loader2 } from "lucide-react";

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
      errors.username = "Tên tài khoản không được để trống.";
    } else if (username.length < 3 || username.length > 32) {
      errors.username = "Tên tài khoản phải từ 3 đến 32 ký tự.";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = "Tên tài khoản chỉ được chứa chữ cái, chữ số và dấu gạch dưới (_).";
    }

    if (!password) {
      errors.password = "Mật khẩu không được để trống.";
    } else {
      if (password.length < 8) {
        errors.password = "Mật khẩu phải chứa nhất 8 ký tự.";
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

    if (otpSent && !otpCode) {
      errors.otp = "Vui lòng nhập mã xác thực OTP.";
    } else if (otpSent && otpCode.length !== 6) {
      errors.otp = "Mã xác thực phải gồm 6 chữ số.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtpClick = async () => {
    if (!email) {
      setFieldErrors(prev => ({ ...prev, email: "Email không được để trống." }));
      return;
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Địa chỉ email không hợp lệ." }));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.sendOtp(email);
      setOtpSent(true);
      setOtpCode("");
      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
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

    if (!otpSent) {
      setError("Vui lòng nhấn nút 'Gửi mã' ở dòng Email và điền mã xác thực OTP trước.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.register(email, username, password, otpCode);
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
        setError("Máy chủ gặp lỗi. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/ca6a761f-bd50-44d5-be40-699a737c9d4e/web_translate/VN-vi-20260120-trifectadaily-perspective_alpha_website_large.jpg')] bg-cover bg-center bg-no-repeat select-none">
      {/* Radial overlay */}
      <div className="absolute inset-0 bg-black/50 bg-gradient-to-t from-black via-black/40 to-black/70" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="brand-logo text-3xl font-black text-[#e50914] tracking-tighter">STREAMFORGE</span>
      </header>

      {/* Center card */}
      <main className="relative z-10 flex min-h-[calc(100vh-92px)] items-center justify-center p-4">
        <div className="w-full max-w-[450px] rounded-md bg-black/75 px-6 py-12 sm:px-16 sm:py-16 backdrop-blur-sm border border-white/5 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-7">Đăng Ký</h1>

          {error && (
            <div className="mb-4 rounded bg-[#e87c03] p-3.5 text-sm font-medium text-white shadow">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field with inline Send OTP Button */}
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
                  className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.email ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} pl-5 pr-28 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={handleSendOtpClick}
                  disabled={loading || !email}
                  className="absolute right-2 h-10 px-4 rounded bg-[#e50914] text-xs font-bold text-white hover:bg-[#b20710] disabled:opacity-50 transition cursor-pointer select-none"
                >
                  {otpSent ? "Gửi lại" : "Gửi mã"}
                </button>
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.email}</p>
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
                  className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.otp ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all font-semibold tracking-widest text-center text-lg`}
                  required
                />
                {fieldErrors.otp && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.otp}</p>
                )}
                <p className="mt-1.5 text-[11px] text-zinc-400 leading-normal">
                  Mã xác thực đã được lưu vào tệp <code className="text-white bg-zinc-800/80 px-1 py-0.5 rounded font-mono">otp_code.txt</code> ở thư mục gốc của dự án.
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
                className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.username ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                required
              />
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.username}</p>
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
                className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.password ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                required
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.password}</p>
              )}
              {/* Password strength checklist */}
              <div className="mt-2.5 p-3 rounded bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 flex flex-col gap-1.5 select-none">
                <p className="font-bold text-zinc-300 mb-0.5">Yêu cầu mật khẩu:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={password.length >= 8 ? "text-green-500" : "text-zinc-500"}>
                      {password.length >= 8 ? "✓" : "○"}
                    </span>
                    <span className={password.length >= 8 ? "text-zinc-300 font-medium" : ""}>Tối thiểu 8 ký tự</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={/[A-Z]/.test(password) ? "text-green-500" : "text-zinc-500"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[A-Z]/.test(password) ? "text-zinc-300 font-medium" : ""}>1 chữ viết hoa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={/[a-z]/.test(password) ? "text-green-500" : "text-zinc-500"}>
                      {/[a-z]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[a-z]/.test(password) ? "text-zinc-300 font-medium" : ""}>1 chữ viết thường</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={/[0-9]/.test(password) ? "text-green-500" : "text-zinc-500"}>
                      {/[0-9]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[0-9]/.test(password) ? "text-zinc-300 font-medium" : ""}>1 chữ số</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <span className={/[^a-zA-Z0-9]/.test(password) ? "text-green-500" : "text-zinc-500"}>
                      {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"}
                    </span>
                    <span className={/[^a-zA-Z0-9]/.test(password) ? "text-zinc-300 font-medium" : ""}>1 ký tự đặc biệt (!@#...)</span>
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
              className="mt-4 flex h-12 w-full items-center justify-center rounded bg-[#e50914] font-bold text-white hover:bg-[#b20710] active:scale-95 transition disabled:opacity-50 cursor-pointer text-base"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Đăng Ký"}
            </button>
          </form>

          {/* Login Redirect info */}
          <div className="mt-8 text-sm text-zinc-500 font-medium">
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
