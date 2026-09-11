import { Facebook, Heart, Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-4 pt-10 pb-28 md:pb-10 text-zinc-400 sm:px-6 md:px-8 flex flex-col items-center justify-center gap-5 text-center">
      {/* Social Logos */}
      <div className="flex items-center justify-center gap-6">
        <a href="#" className="hover:text-white transition duration-200" aria-label="Facebook">
          <Facebook size={22} />
        </a>
        <a href="#" className="hover:text-white transition duration-200" aria-label="Instagram">
          <Instagram size={22} />
        </a>
        <a href="#" className="hover:text-white transition duration-200" aria-label="Twitter">
          <Twitter size={22} />
        </a>
        <a 
          href="https://www.youtube.com/@toxijp2364" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-[#e50914] transition duration-200" 
          aria-label="YouTube"
        >
          <Youtube size={22} />
        </a>
      </div>

      {/* Donate Line */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-medium text-zinc-300 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full backdrop-blur-md shadow-lg">
        <span className="flex items-center gap-1.5 text-white font-bold">
          <Heart size={15} className="text-[#e50914] fill-[#e50914] animate-pulse" />
          Ủng hộ máy chủ (Donate):
        </span>
        <span>MB Bank — STK: <strong className="text-white font-bold">010764831289</strong> (RytoxGroup)</span>
      </div>

      {/* Copyright */}
      <div className="text-[11px] text-zinc-600 font-medium">
        © 2026 RytoxGroup, Inc.
      </div>
    </footer>
  );
}
