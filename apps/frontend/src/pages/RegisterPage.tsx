import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, useAuthStore } from "../store/auth";
import { Loader2 } from "lucide-react";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
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
        errors.password = "Password too weak. Mật khẩu phải chứa ít nhất 8 ký tự.";
      } else if (!/[A-Z]/.test(password)) {
        errors.password = "Password too weak. Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.";
      } else if (!/[a-z]/.test(password)) {
        errors.password = "Password too weak. Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.";
      } else if (!/[0-9]/.test(password)) {
        errors.password = "Password too weak. Mật khẩu phải chứa ít nhất 1 chữ số.";
      } else if (!/[^a-zA-Z0-9]/.test(password)) {
        errors.password = "Password too weak. Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.";
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
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
      const user = await authApi.register(email, username, password);
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
          <h1 className="text-3xl font-bold text-white mb-7">Đăng Ký</h1>

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
