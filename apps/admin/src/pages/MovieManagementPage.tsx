import { useState } from "react";
import { Button } from "@streamforge/ui";
import { api } from "../lib/api";

const sourcePresets = [
  {
    label: "Mux HLS demo",
    title: "Mux Streaming Demo",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&auto=format&fit=crop&q=80"
  },
  {
    label: "Apple HLS sample",
    title: "BipBop HLS Sample",
    sourceUrl: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
    posterUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&auto=format&fit=crop&q=80"
  },
  {
    label: "MDN MP4 sample",
    title: "Flower MP4 Sample",
    sourceUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&auto=format&fit=crop&q=80"
  }
];

export function MovieManagementPage() {
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900");
  const [backdropUrl, setBackdropUrl] = useState("https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600");

  function applyPreset(label: string) {
    const preset = sourcePresets.find((item) => item.label === label);
    if (!preset) return;
    setTitle(preset.title);
    setSourceUrl(preset.sourceUrl);
    setPosterUrl(preset.posterUrl);
    setBackdropUrl(preset.backdropUrl);
  }

  async function createMovie() {
    await api.post("/admin/movies", {
      slug: title.toLowerCase().replace(/\W+/g, "-"),
      title,
      synopsis: "A premium catalog title curated by the editorial team.",
      description: "Editorial metadata, media assets, publication status and playback manifests are managed from this workspace.",
      posterUrl,
      backdropUrl,
      releaseYear: new Date().getFullYear(),
      runtimeMinutes: 112,
      maturityRating: "PG_13",
      hlsUrl: sourceUrl || undefined,
      publishedAt: new Date()
    });
    setTitle("");
    setSourceUrl("");
  }
  return (
    <section>
      <h2 className="text-3xl font-black">Movie management</h2>
      <div className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h3 className="font-bold">Create movie</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_1fr_auto]">
          <select onChange={(event) => applyPreset(event.target.value)} defaultValue="" className="h-11 rounded-md border border-white/10 bg-black px-3 outline-none">
            <option value="" disabled>Source preset</option>
            {sourcePresets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie title" className="h-11 flex-1 rounded-md border border-white/10 bg-black px-3 outline-none" />
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Permitted HLS or MP4 source URL" className="h-11 flex-1 rounded-md border border-white/10 bg-black px-3 outline-none" />
          <Button onClick={createMovie} disabled={!title}>Create</Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="Poster URL" className="h-11 rounded-md border border-white/10 bg-black px-3 outline-none" />
          <input value={backdropUrl} onChange={(e) => setBackdropUrl(e.target.value)} placeholder="Backdrop URL" className="h-11 rounded-md border border-white/10 bg-black px-3 outline-none" />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {["Poster upload", "Trailer upload", "Video master upload"].map((label) => <button key={label} className="rounded-md border border-dashed border-white/20 p-8 text-white/65 hover:bg-white/5">{label}</button>)}
        </div>
      </div>
    </section>
  );
}
