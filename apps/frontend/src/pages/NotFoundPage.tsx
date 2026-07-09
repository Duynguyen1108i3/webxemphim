import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Background Graphic Grid/Atmosphere */}
      <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1200')" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-[#141414]" />

      <div className="relative z-10 text-center max-w-lg space-y-6">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white text-shadow">
          Lost your way?
        </h1>
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mx-auto">
          Sorry, we can't find that page. You'll find lots to explore on the home page.
        </p>
        <div className="pt-4">
          <Link
            to="/"
            className="nf-button inline-flex h-12 items-center justify-center rounded bg-white px-8 text-sm font-black text-black hover:bg-white/85 transition"
          >
            StreamForge Home
          </Link>
        </div>
        <div className="pt-8 border-t border-zinc-800 text-xs tracking-widest text-zinc-500 font-mono">
          ERROR CODE <span className="text-[#e50914] font-black">NSES-404</span>
        </div>
      </div>
    </main>
  );
}
export default NotFoundPage;
