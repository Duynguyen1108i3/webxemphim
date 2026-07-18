import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, useAuthStore } from "../store/auth";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
          <h1 className="text-3xl font-bold text-white mb-7">Đăng Nhập</h1>

          {error && (
            <div className="mb-4 rounded bg-[#e87c03] p-3.5 text-sm font-medium text-white shadow">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.email ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.email}</p>
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
                className={`w-full h-14 rounded bg-zinc-800/80 border ${fieldErrors.password ? "border-red-500 focus:ring-red-500/80" : "border-zinc-700 focus:ring-[#e50914]/80"} px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                required
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-12 w-full items-center justify-center rounded bg-[#e50914] font-bold text-white hover:bg-[#b20710] active:scale-95 transition disabled:opacity-50 cursor-pointer text-base"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Đăng Nhập"}
            </button>
          </form>

          {/* Remember me & Helper links */}
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="accent-[#e50914] h-4 w-4 rounded border-zinc-700" defaultChecked />
              Ghi nhớ tài khoản
            </label>
            <a href="#" className="hover:underline">Bạn cần trợ giúp?</a>
          </div>

          {/* Register Redirect info */}
          <div className="mt-12 text-sm text-zinc-500 font-medium">
            <p>
              Bạn mới sử dụng StreamForge?{" "}
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
