import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi, useAuthStore } from "../store/auth";
import { Loader2 } from "lucide-react";
import { LiquidGlassBackground } from "../components/LiquidGlassBackground";

export function LoginPage() {
  const location = useLocation();
  const state = location.state as { email?: string; password?: string; registeredSuccess?: boolean } | null;

  const [email, setEmail] = useState(state?.email || "");
  const [password, setPassword] = useState(state?.password || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(state?.registeredSuccess ? "Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo." : "");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
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

    if (!password) {
      errors.password = "Mật khẩu không được để trống.";
    } else if (password.length < 8) {
      errors.password = "Mật khẩu phải chứa ít nhất 8 ký tự.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const user = await authApi.login(email, password);
      setUser(user);
      navigate("/");
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
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tight">Đăng Nhập</h1>

          {success && (
            <div className="mb-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-xs sm:text-sm font-semibold text-emerald-200 backdrop-blur-md flex items-center gap-2">
              <span className="text-base font-bold">✓</span>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 p-3.5 text-xs sm:text-sm font-medium text-red-200 backdrop-blur-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="relative w-full">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="Địa chỉ Email"
                className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.email ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.email}</p>
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
                placeholder="Mật khẩu"
                className={`w-full h-13 sm:h-14 rounded-2xl bg-white/[0.06] border ${fieldErrors.password ? "border-red-400/80 focus:border-red-400" : "border-white/15 focus:border-white/40"} px-5 text-white placeholder-white/40 focus:outline-none focus:bg-white/[0.10] focus:ring-2 focus:ring-white/20 transition-all text-sm sm:text-base backdrop-blur-xl shadow-inner`}
                required
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400 font-semibold px-1">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-12 sm:h-13 w-full items-center justify-center rounded-2xl bg-white text-black font-black hover:bg-white/90 hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] active:scale-98 transition duration-300 disabled:opacity-50 cursor-pointer text-sm sm:text-base"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : "Đăng Nhập"}
            </button>
          </form>

          {/* Remember me & Helper links */}
          <div className="mt-4 flex items-center justify-between text-xs text-white/70 font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" className="accent-white h-4 w-4 rounded border-white/20 bg-white/10" defaultChecked />
              Ghi nhớ tài khoản
            </label>
            <Link to="/forgot-password" className="hover:underline text-white/70 hover:text-white transition">Quên mật khẩu?</Link>
          </div>

          {/* Register Redirect info */}
          <div className="mt-8 text-sm text-white/50 font-medium text-center">
            <p>
              Bạn mới sử dụng RytoxGroup?{" "}
              <Link to="/register" className="text-white hover:underline font-bold ml-1">
                Đăng ký ngay bây giờ.
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
