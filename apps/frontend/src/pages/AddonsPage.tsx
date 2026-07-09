import { useEffect, useState, useMemo } from "react";
import { 
  Search, Star, Check, Copy, ExternalLink, Github, Heart, Info, 
  Download, Sparkles, Sliders, ArrowUpDown, BookOpen, Bookmark 
} from "lucide-react";
import addonsData from "../data/addons.json";

export interface Addon {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  version: string;
  developer: string;
  language: string;
  rating: number;
  installs: number;
  manifestUrl: string;
  website: string;
  github: string;
  updatedAt: string;
  featured: boolean;
  recommended: boolean;
  verified: boolean;
  badge: string;
}

export function AddonsPage() {
  // State
  const [addons, setAddons] = useState<Addon[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("Popular");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [installed, setInstalled] = useState<string[]>([]);
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [tmdbKeyInput, setTmdbKeyInput] = useState(localStorage.getItem("streamforge:settings:tmdb_key") || "");
  
  // Load data and storage on mount
  useEffect(() => {
    setAddons(addonsData as Addon[]);
    
    try {
      const favs = localStorage.getItem("streamforge:addons:favorites");
      if (favs) setFavorites(JSON.parse(favs));
      
      const inst = localStorage.getItem("streamforge:addons:installed");
      if (inst) {
        setInstalled(JSON.parse(inst));
      } else {
        const defaults = ["tmdb", "opensubtitles-v3"];
        setInstalled(defaults);
        localStorage.setItem("streamforge:addons:installed", JSON.stringify(defaults));
      }
    } catch (e) {
      console.error("Failed to load addons local state:", e);
    }
  }, []);

  // Sync state to local storage
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("streamforge:addons:favorites", JSON.stringify(updated));
  };

  const toggleInstall = (addon: Addon, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const id = addon.id;
    const isInstalled = installed.includes(id);
    let updated;
    if (isInstalled) {
      updated = installed.filter(instId => instId !== id);
    } else {
      updated = [...installed, id];
      
      // Perform installation action
      const stremioUrl = addon.manifestUrl.replace("https://", "stremio://");
      // Try to copy manifest to clipboard
      navigator.clipboard.writeText(addon.manifestUrl).catch(() => {});
      
      // Alert and prompt stremio open
      alert(`✓ Đã thêm Addon "${addon.name}" vào danh sách cài đặt!\n\nLink Manifest đã được sao chép vào bộ nhớ tạm:\n${addon.manifestUrl}`);
      
      // Attempt opening stremio:// url
      window.location.href = stremioUrl;
    }
    
    setInstalled(updated);
    localStorage.setItem("streamforge:addons:installed", JSON.stringify(updated));
  };

  const copyManifest = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url)
      .then(() => alert("Đã sao chép link Manifest vào clipboard!"))
      .catch(() => alert("Không thể sao chép tự động."));
  };

  // Helper collection groups
  const collections = useMemo(() => {
    const all = addons;
    return {
      vietsub: all.filter(a => a.language === "Tiếng Việt" || a.id.includes("vietnam") || a.id.includes("vn")),
      anime: all.filter(a => a.category === "Anime" || a.id.includes("kitsu") || a.id.includes("anilist")),
      movies: all.filter(a => a.category === "Movies" || a.category === "Torrent" || a.id === "comet" || a.id === "torrentio"),
      debrid: all.filter(a => a.category === "Debrid")
    };
  }, [addons]);

  // Filters & Search & Sort operations
  const filteredAddons = useMemo(() => {
    let result = [...addons];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(q) || 
             a.developer.toLowerCase().includes(q) || 
             a.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      if (selectedCategory === "Installed") {
        result = result.filter(a => installed.includes(a.id));
      } else if (selectedCategory === "Favorites") {
        result = result.filter(a => favorites.includes(a.id));
      } else if (selectedCategory === "Trending") {
        result = result.filter(a => a.badge === "Trending" || a.badge === "Popular");
      } else if (selectedCategory === "New") {
        result = result.filter(a => a.badge === "New" || a.updatedAt.startsWith("2026-07"));
      } else {
        result = result.filter(a => a.category.toLowerCase() === selectedCategory.toLowerCase());
      }
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "Popular":
          return b.installs - a.installs;
        case "Rating":
          return b.rating - a.rating;
        case "Updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "Name":
          return a.name.localeCompare(b.name);
        default:
          return b.installs - a.installs;
      }
    });

    return result;
  }, [addons, search, selectedCategory, sortBy, favorites, installed]);

  const categoriesList = [
    "All", "Movies", "TV Shows", "Anime", "Subtitle", "Metadata", 
    "Live TV", "Torrent", "Debrid", "Utility", "Installed", "Favorites", "Trending", "New"
  ];

  // Statistics
  const totalCount = addons.length;
  const installedCount = installed.length;
  const favoritesCount = favorites.length;
  // Updates available: mock 1 if RealDebrid or Torrentio is installed
  const updatesCount = installed.length > 0 ? 1 : 0;

  const renderBadge = (badge: string) => {
    if (!badge) return null;
    let color = "bg-zinc-700 text-zinc-300";
    if (badge === "Official") color = "bg-blue-600/20 border border-blue-500/30 text-blue-400";
    else if (badge === "Verified") color = "bg-green-600/20 border border-green-500/30 text-green-400";
    else if (badge === "Popular") color = "bg-purple-600/20 border border-purple-500/30 text-purple-400";
    else if (badge === "Trending") color = "bg-red-600/20 border border-red-500/30 text-red-400";
    else if (badge === "New") color = "bg-amber-600/20 border border-amber-500/30 text-amber-400";

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${color}`}>
        {badge}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#111] text-white pt-24 pb-20 select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Intro Header banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-black p-8 sm:p-12 mb-10 overflow-hidden border border-white/5 shadow-2xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
          <div className="absolute left-1/3 bottom-0 translate-y-16 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest mb-3">
              <Sparkles size={14} /> StreamForge Extension Catalog
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Stremio Addons
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed font-medium">
              Cá nhân hóa trải nghiệm xem phim của bạn. Cài đặt các tiện ích mở rộng cộng đồng để tích hợp nguồn Torrent, Debrid, Phụ đề tiếng Việt và các tính năng truyền hình trực tuyến khác.
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Tổng số Addon", value: totalCount, icon: Sparkles, color: "text-zinc-400" },
            { label: "Đã cài đặt", value: installedCount, icon: Check, color: "text-green-500" },
            { label: "Yêu thích", value: favoritesCount, icon: Heart, color: "text-red-500" },
            { label: "Bản cập nhật mới", value: updatesCount, icon: ArrowUpDown, color: "text-amber-500" }
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-white/5 bg-zinc-900/60 p-5 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/80">
              <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-white mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Control layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Sidebar Filters */}
          <aside className="w-full lg:w-60 shrink-0 bg-zinc-900/40 border border-white/5 rounded-xl p-5 backdrop-blur-md shadow-xl sticky top-24">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sliders size={14} /> Danh Mục
            </h2>
            <nav className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
              {categoriesList.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center justify-between ${
                    selectedCategory === category
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{category}</span>
                  {category === "Installed" && installedCount > 0 && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${selectedCategory === "Installed" ? "bg-white text-red-600" : "bg-white/10 text-white"}`}>{installedCount}</span>
                  )}
                  {category === "Favorites" && favoritesCount > 0 && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${selectedCategory === "Favorites" ? "bg-white text-red-600" : "bg-white/10 text-white"}`}>{favoritesCount}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="border-t border-white/5 pt-5 hidden lg:block">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">TMDB API Key</h3>
              <p className="text-[10px] text-zinc-500 leading-normal mb-3">Nhập API key của bạn để hiển thị tên và tóm tắt phim bằng Tiếng Việt chất lượng cao.</p>
              <input
                type="text"
                placeholder="Nhập API Key..."
                value={tmdbKeyInput}
                onChange={(e) => {
                  setTmdbKeyInput(e.target.value);
                  localStorage.setItem("streamforge:settings:tmdb_key", e.target.value.trim());
                }}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-transparent transition-all"
              />
              {tmdbKeyInput && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full mt-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 hover:text-white py-1.5 rounded text-[10px] font-bold transition cursor-pointer"
                >
                  Lưu & Khởi động lại
                </button>
              )}
            </div>
          </aside>

          {/* Main Grid & Sliders */}
          <main className="flex-1 w-full space-y-12">
            
            {/* Search & Sort Panel */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/40 border border-white/5 rounded-xl p-4 w-full backdrop-blur-md shadow-lg">
              <div className="relative w-full sm:max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm addon, nhà phát triển..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                  Sắp xếp:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  <option value="Popular">Lượt tải phổ biến</option>
                  <option value="Rating">Đánh giá tốt nhất</option>
                  <option value="Updated">Mới cập nhật</option>
                  <option value="Name">Tên Addon A-Z</option>
                </select>
              </div>
            </div>

            {/* If no filters / search is selected, show grouped slider collections */}
            {selectedCategory === "All" && !search.trim() ? (
              <div className="space-y-12">
                
                {/* 1. Best Vietnamese Subtitle Addons */}
                {collections.vietsub.length > 0 && (
                  <div>
                    <h3 className="text-xl font-black text-white tracking-wide mb-5 flex items-center gap-2">
                      <span className="h-4 w-1 bg-red-600 rounded" /> Best Vietnamese Subtitle Addons
                    </h3>
                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
                      {collections.vietsub.map(addon => (
                        <AddonMiniCard 
                          key={addon.id} 
                          addon={addon} 
                          isInstalled={installed.includes(addon.id)}
                          isFavorite={favorites.includes(addon.id)}
                          onToggleFavorite={(e) => toggleFavorite(addon.id, e)}
                          onInstall={(e) => toggleInstall(addon, e)}
                          onSelect={() => setSelectedAddon(addon)}
                          renderBadge={renderBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Best Movie Addons */}
                {collections.movies.length > 0 && (
                  <div>
                    <h3 className="text-xl font-black text-white tracking-wide mb-5 flex items-center gap-2">
                      <span className="h-4 w-1 bg-red-600 rounded" /> Best Movie & Streaming Addons
                    </h3>
                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
                      {collections.movies.map(addon => (
                        <AddonMiniCard 
                          key={addon.id} 
                          addon={addon} 
                          isInstalled={installed.includes(addon.id)}
                          isFavorite={favorites.includes(addon.id)}
                          onToggleFavorite={(e) => toggleFavorite(addon.id, e)}
                          onInstall={(e) => toggleInstall(addon, e)}
                          onSelect={() => setSelectedAddon(addon)}
                          renderBadge={renderBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Best Anime Addons */}
                {collections.anime.length > 0 && (
                  <div>
                    <h3 className="text-xl font-black text-white tracking-wide mb-5 flex items-center gap-2">
                      <span className="h-4 w-1 bg-red-600 rounded" /> Best Anime Addons
                    </h3>
                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
                      {collections.anime.map(addon => (
                        <AddonMiniCard 
                          key={addon.id} 
                          addon={addon} 
                          isInstalled={installed.includes(addon.id)}
                          isFavorite={favorites.includes(addon.id)}
                          onToggleFavorite={(e) => toggleFavorite(addon.id, e)}
                          onInstall={(e) => toggleInstall(addon, e)}
                          onSelect={() => setSelectedAddon(addon)}
                          renderBadge={renderBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Debrid Support Addons */}
                {collections.debrid.length > 0 && (
                  <div>
                    <h3 className="text-xl font-black text-white tracking-wide mb-5 flex items-center gap-2">
                      <span className="h-4 w-1 bg-red-600 rounded" /> Debrid & Cloud Stream Resolvers
                    </h3>
                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
                      {collections.debrid.map(addon => (
                        <AddonMiniCard 
                          key={addon.id} 
                          addon={addon} 
                          isInstalled={installed.includes(addon.id)}
                          isFavorite={favorites.includes(addon.id)}
                          onToggleFavorite={(e) => toggleFavorite(addon.id, e)}
                          onInstall={(e) => toggleInstall(addon, e)}
                          onSelect={() => setSelectedAddon(addon)}
                          renderBadge={renderBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. All Addons Grid Header */}
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide mb-5 flex items-center gap-2">
                    <span className="h-4 w-1 bg-red-600 rounded" /> Tất Cả Addon
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredAddons.map(addon => (
                      <AddonGridCard 
                        key={addon.id}
                        addon={addon}
                        isInstalled={installed.includes(addon.id)}
                        isFavorite={favorites.includes(addon.id)}
                        onToggleFavorite={(e) => toggleFavorite(addon.id, e)}
                        onInstall={(e) => toggleInstall(addon, e)}
                        onSelect={() => setSelectedAddon(addon)}
                        renderBadge={renderBadge}
                      />
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              // Filtered / Search layout grid
              <div>
                <h3 className="text-xl font-black text-white tracking-wide mb-5 flex items-center gap-2">
                  <span className="h-4 w-1 bg-red-600 rounded" /> Kết quả: {selectedCategory} ({filteredAddons.length})
                </h3>
                {filteredAddons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredAddons.map(addon => (
                      <AddonGridCard 
                        key={addon.id}
                        addon={addon}
                        isInstalled={installed.includes(addon.id)}
                        isFavorite={favorites.includes(addon.id)}
                        onToggleFavorite={(e) => toggleFavorite(addon.id, e)}
                        onInstall={(e) => toggleInstall(addon, e)}
                        onSelect={() => setSelectedAddon(addon)}
                        renderBadge={renderBadge}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-zinc-900/20 p-12 text-center text-zinc-500 backdrop-blur-md">
                    Không tìm thấy addon nào phù hợp với bộ lọc đã chọn.
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Addon Detail Modal / Drawer */}
      {selectedAddon && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setSelectedAddon(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900/95 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="flex gap-5 items-start mb-6">
              <img 
                src={selectedAddon.logo} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-white/10 shadow-lg shrink-0" 
                alt="" 
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h2 className="text-2xl font-black text-white tracking-wide truncate">{selectedAddon.name}</h2>
                  {selectedAddon.verified && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/20 border border-green-500/30 text-green-400 uppercase tracking-widest">VERIFIED</span>
                  )}
                  {renderBadge(selectedAddon.badge)}
                </div>
                <p className="text-sm text-zinc-400 font-semibold mb-2">Phát triển bởi: <span className="text-zinc-200">{selectedAddon.developer}</span></p>
                <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star size={14} fill="currentColor" /> {selectedAddon.rating.toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{selectedAddon.installs.toLocaleString()} lượt tải</span>
                  <span>•</span>
                  <span>v{selectedAddon.version}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Giới thiệu</h4>
              <p className="text-sm text-zinc-300 leading-relaxed font-medium bg-white/5 rounded-lg p-4 border border-white/5">
                {selectedAddon.description}
              </p>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 bg-zinc-950/40 rounded-xl p-4 border border-white/5 text-xs font-medium text-zinc-400">
              <div>
                <p className="text-zinc-500 uppercase tracking-wider font-bold mb-1">Thể loại</p>
                <p className="text-zinc-200 text-sm font-semibold">{selectedAddon.category}</p>
              </div>
              <div>
                <p className="text-zinc-500 uppercase tracking-wider font-bold mb-1">Ngôn ngữ</p>
                <p className="text-zinc-200 text-sm font-semibold">{selectedAddon.language}</p>
              </div>
              <div>
                <p className="text-zinc-500 uppercase tracking-wider font-bold mb-1">Cập nhật lần cuối</p>
                <p className="text-zinc-200 text-sm font-semibold">{selectedAddon.updatedAt}</p>
              </div>
              <div>
                <p className="text-zinc-500 uppercase tracking-wider font-bold mb-1">Trạng thái</p>
                <p className="text-green-400 text-sm font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Active
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={(e) => {
                  toggleInstall(selectedAddon, e);
                  setSelectedAddon(null);
                }}
                className={`flex-1 flex h-12 items-center justify-center gap-2 rounded-lg font-bold text-sm cursor-pointer select-none transition-all duration-300 active:scale-95 ${
                  installed.includes(selectedAddon.id)
                    ? "bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700 hover:text-white"
                    : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20"
                }`}
              >
                <Download size={16} /> 
                {installed.includes(selectedAddon.id) ? "GỠ CÀI ĐẶT ADDON" : "CÀI ĐẶT ADDON"}
              </button>

              <button 
                onClick={(e) => copyManifest(selectedAddon.manifestUrl, e)}
                className="flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-lg h-12 px-5 text-sm font-bold transition-all duration-300 cursor-pointer select-none"
              >
                <Copy size={16} /> Copy Manifest URL
              </button>

              <button 
                onClick={() => toggleFavorite(selectedAddon.id)}
                className={`flex items-center justify-center border rounded-lg h-12 w-12 transition-all duration-300 cursor-pointer select-none ${
                  favorites.includes(selectedAddon.id)
                    ? "border-red-600/30 bg-red-600/10 text-red-500 hover:bg-red-600/20"
                    : "border-zinc-700 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
                aria-label="Add to favorites"
              >
                <Heart size={18} fill={favorites.includes(selectedAddon.id) ? "currentColor" : "none"} />
              </button>
            </div>

            {/* External Links */}
            <div className="flex gap-4 items-center justify-center mt-6 pt-5 border-t border-white/5 text-xs font-semibold text-zinc-500">
              {selectedAddon.website && (
                <a href={selectedAddon.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition">
                  <ExternalLink size={13} /> Website chính thức
                </a>
              )}
              {selectedAddon.github && (
                <a href={selectedAddon.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition">
                  <Github size={13} /> Github Repository
                </a>
              )}
            </div>

            {/* Close cross */}
            <button 
              onClick={() => setSelectedAddon(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-white/5 transition cursor-pointer"
              aria-label="Close details"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents: Addon Mini Card
interface CardProps {
  addon: Addon;
  isInstalled: boolean;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onInstall: (e: React.MouseEvent) => void;
  onSelect: () => void;
  renderBadge: (badge: string) => React.ReactNode;
}

function AddonMiniCard({ addon, isInstalled, isFavorite, onToggleFavorite, onInstall, onSelect, renderBadge }: CardProps) {
  return (
    <div 
      onClick={onSelect}
      className="w-72 shrink-0 bg-zinc-900/40 border border-white/5 hover:border-white/10 rounded-xl p-4 backdrop-blur-md shadow-lg transition-all duration-300 hover:bg-zinc-900/60 cursor-pointer relative group flex flex-col justify-between h-48 select-none"
    >
      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <img src={addon.logo} className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" alt="" />
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                isFavorite 
                  ? "border-red-600/30 bg-red-600/10 text-red-500" 
                  : "border-white/5 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Heart size={12} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        
        <h4 className="text-base font-black text-white group-hover:text-red-500 transition duration-300 truncate">{addon.name}</h4>
        <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{addon.category} • v{addon.version}</p>
        <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed font-medium">{addon.description}</p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="flex items-center gap-0.5 text-amber-400 text-xs font-semibold">
          <Star size={12} fill="currentColor" /> {addon.rating.toFixed(1)}
        </span>
        
        <button 
          onClick={onInstall}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-300 cursor-pointer ${
            isInstalled 
              ? "bg-green-600/20 border border-green-500/20 text-green-400" 
              : "bg-white text-black hover:bg-red-600 hover:text-white"
          }`}
        >
          {isInstalled ? <Check size={12} /> : <Download size={12} />}
          {isInstalled ? "Installed" : "Install"}
        </button>
      </div>
    </div>
  );
}

// Subcomponents: Addon Grid Card (Full details)
function AddonGridCard({ addon, isInstalled, isFavorite, onToggleFavorite, onInstall, onSelect, renderBadge }: CardProps) {
  return (
    <div 
      onClick={onSelect}
      className="bg-zinc-900/40 border border-white/5 hover:border-white/10 rounded-xl p-5 backdrop-blur-md shadow-lg transition-all duration-300 hover:bg-zinc-900/60 cursor-pointer relative group flex flex-col justify-between min-h-[160px] select-none"
    >
      <div className="flex gap-4 items-start">
        <img src={addon.logo} className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" alt="" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-lg font-black text-white group-hover:text-red-500 transition duration-300 truncate">{addon.name}</h4>
            {addon.verified && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/20 border border-green-500/30 text-green-400 uppercase tracking-widest">VERIFIED</span>
            )}
            {renderBadge(addon.badge)}
          </div>
          <p className="text-xs text-zinc-500 font-semibold mb-2">Được phát triển bởi: <span className="text-zinc-300">{addon.developer}</span></p>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-medium">{addon.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 w-full">
        <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500">
          <span className="flex items-center gap-0.5 text-amber-400">
            <Star size={13} fill="currentColor" /> {addon.rating.toFixed(1)}
          </span>
          <span>•</span>
          <span>{addon.installs.toLocaleString()} lượt tải</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleFavorite}
            className={`p-2 rounded-lg border transition-all duration-300 cursor-pointer ${
              isFavorite 
                ? "border-red-600/30 bg-red-600/10 text-red-500" 
                : "border-white/5 bg-white/5 text-zinc-400 hover:text-white"
            }`}
            aria-label="Add to favorites"
          >
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          
          <button 
            onClick={onInstall}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
              isInstalled 
                ? "bg-green-600/20 border border-green-500/20 text-green-400" 
                : "bg-white text-black hover:bg-red-600 hover:text-white"
            }`}
          >
            {isInstalled ? <Check size={13} /> : <Download size={13} />}
            {isInstalled ? "Installed" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
