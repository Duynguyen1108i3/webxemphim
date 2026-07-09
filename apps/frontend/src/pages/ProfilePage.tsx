import { Lock, Pencil, LogOut } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

export function ProfilePage() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.username || "Main";

  return (
    <main className="grid min-h-screen place-items-center bg-[#141414] px-5 py-24 select-none">
      <div className="w-full max-w-5xl text-center">
        <h1 className="text-4xl font-normal md:text-6xl text-white">Who's watching?</h1>
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            [displayName, "from-blue-500 to-cyan-300"],
            ["Kids", "from-yellow-400 to-orange-500"],
            ["Guest", "from-purple-500 to-pink-500"],
            ["Private", "from-zinc-600 to-zinc-900"]
          ].map(([name, color]) => (
            <button key={name} className="group text-center text-white/60 transition hover:text-white">
              <div className={`mx-auto grid aspect-square w-full max-w-40 place-items-center rounded bg-gradient-to-br ${color} ring-4 ring-transparent transition group-hover:ring-white`}>
                {name === "Private" ? <Lock size={42} /> : <span className="text-5xl font-black text-white/90">{name[0].toUpperCase()}</span>}
              </div>
              <p className="mt-3 text-xl">{name}</p>
            </button>
          ))}
        </div>
        
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="inline-flex h-10 items-center gap-2 border border-white/45 px-6 text-sm uppercase tracking-[.15em] text-white/65 transition hover:border-white hover:text-white cursor-pointer">
            <Pencil size={15} /> Manage Profiles
          </button>
          
          <button 
            onClick={handleSignOut}
            className="inline-flex h-10 items-center gap-2 border border-[#e50914] px-6 text-sm uppercase tracking-[.15em] text-[#e50914] hover:bg-[#e50914] hover:text-white transition cursor-pointer"
          >
            <LogOut size={15} /> Đăng Xuất
          </button>
        </div>
      </div>
    </main>
  );
}
