import { Lock, Pencil, LogOut } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

export function ProfilePage() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const setProfileId = useAuthStore(state => state.setProfileId);
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const handleProfileSelect = (name: string) => {
    if (name === "Private") {
      const pin = prompt("Nhập mã PIN bảo mật cho hồ sơ riêng tư (mặc định: 1234):");
      if (pin !== "1234") {
        alert("Mã PIN không chính xác!");
        return;
      }
    }
    setProfileId(name);
    navigate("/");
  };

  const displayName = user?.username || "Main";

  return (
    <main className="grid min-h-screen place-items-center bg-[#141414] px-5 py-24 select-none">
      <div className="w-full max-w-5xl text-center">
        <h1 className="text-3xl font-medium sm:text-5xl text-white tracking-wide mb-10">Ai đang xem vậy?</h1>
        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 max-w-3xl mx-auto">
          {[
            [displayName, "from-blue-500 to-cyan-300"],
            ["Kids", "from-yellow-400 to-orange-500"],
            ["Guest", "from-purple-500 to-pink-500"],
            ["Private", "from-zinc-600 to-zinc-900"]
          ].map(([name, color]) => (
            <button 
              key={name} 
              onClick={() => handleProfileSelect(name)}
              className="group text-center text-zinc-400 transition hover:text-white focus:outline-none"
            >
              <div className={`mx-auto grid aspect-square w-full max-w-36 place-items-center rounded bg-gradient-to-br ${color} ring-[3px] ring-transparent transition duration-300 group-hover:ring-white/90 group-active:scale-95`}>
                {name === "Private" ? <Lock size={36} className="text-white/80" /> : <span className="text-4xl font-extrabold text-white/95">{name[0].toUpperCase()}</span>}
              </div>
              <p className="mt-3 text-base font-normal tracking-wide transition duration-300 group-hover:text-white">{name}</p>
            </button>
          ))}
        </div>
        
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-5">
          <button className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-500 px-6 text-sm uppercase tracking-widest text-zinc-500 transition duration-300 hover:border-white hover:text-white cursor-pointer select-none">
            <Pencil size={14} /> QUẢN LÝ HỒ SƠ
          </button>
          
          <button 
            onClick={handleSignOut}
            className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-500 px-6 text-sm uppercase tracking-widest text-zinc-500 transition duration-300 hover:border-[#e50914] hover:text-[#e50914] cursor-pointer select-none"
          >
            <LogOut size={14} /> ĐĂNG XUẤT
          </button>
        </div>
      </div>
    </main>
  );
}
