import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, useAuthStore } from "../store/auth";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const setUser = useAuthStore(state => state.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await authApi.login(email, password);
      setUser(user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại.");
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email hoặc số điện thoại"
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
                placeholder="Mật khẩu"
                className="w-full h-14 rounded bg-zinc-800/80 border border-zinc-700 px-5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e50914]/80 focus:border-transparent transition-all"
                required
              />
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
            
            {/* Seed accounts notice box */}
            <div className="mt-6 rounded border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-zinc-400">
              <p className="font-bold text-[#e50914] mb-1">Tài khoản quản trị viên thử nghiệm:</p>
              <p>Email: <span className="text-white">trantxi05@gmail.com</span></p>
              <p>Mật khẩu: <span className="text-white">Duy@1188</span></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
