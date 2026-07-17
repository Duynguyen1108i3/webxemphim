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
  const [loading, setLoading] = useState(false);

  const setUser = useAuthStore(state => state.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ tất cả thông tin.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải chứa ít nhất 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
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
        const msg = err.message;
        if (msg.includes("Failed to fetch") || msg.toLowerCase().includes("network") || msg.includes("fetch failed") || msg.includes("kết nối")) {
          setError("Không thể kết nối tới máy chủ. Hệ thống sẽ tạo tài khoản offline để xem phim.");
          // Auto-fallback after a brief delay so user sees the message
          setTimeout(async () => {
            try {
              const user = await authApi.register(email, username, password);
              setUser(user);
              navigate("/");
            } catch {
              setError("Không thể đăng ký. Vui lòng thử lại.");
            } finally {
              setLoading(false);
            }
          }, 1500);
          return;
        }
        setError(msg || "Đăng ký thất bại.");
      } else {
        setError("Đăng ký thất bại.");
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Địa chỉ Email"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e50914]/80 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="relative w-full">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên tài khoản (username)"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e50914]/80 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="relative w-full">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e50914]/80 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="relative w-full">
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e50914]/80 focus:border-transparent transition-all"
                required
              />
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
