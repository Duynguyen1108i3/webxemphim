import { Lock, Pencil } from "lucide-react";

export function ProfilePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#141414] px-5 py-24">
      <div className="w-full max-w-5xl text-center">
        <h1 className="text-4xl font-normal md:text-6xl">Who's watching?</h1>
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["Main", "from-blue-500 to-cyan-300"],
            ["Kids", "from-yellow-400 to-orange-500"],
            ["Guest", "from-purple-500 to-pink-500"],
            ["Private", "from-zinc-600 to-zinc-900"]
          ].map(([name, color]) => (
            <button key={name} className="group text-center text-white/60 transition hover:text-white">
              <div className={`mx-auto grid aspect-square w-full max-w-40 place-items-center rounded bg-gradient-to-br ${color} ring-4 ring-transparent transition group-hover:ring-white`}>
                {name === "Private" ? <Lock size={42} /> : <span className="text-5xl font-black text-white/90">{name[0]}</span>}
              </div>
              <p className="mt-3 text-xl">{name}</p>
            </button>
          ))}
        </div>
        <button className="mt-12 inline-flex h-10 items-center gap-2 border border-white/45 px-6 text-sm uppercase tracking-[.15em] text-white/65 transition hover:border-white hover:text-white">
          <Pencil size={15} /> Manage Profiles
        </button>
      </div>
    </main>
  );
}
