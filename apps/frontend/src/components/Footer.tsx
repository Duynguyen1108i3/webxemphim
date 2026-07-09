import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  const links = [
    { label: "Audio Description", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Gift Cards", href: "#" },
    { label: "Media Center", href: "#" },
    { label: "Investor Relations", href: "#" },
    { label: "Jobs", href: "#" },
    { label: "Terms of Use", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Legal Notices", href: "#" },
    { label: "Cookie Preferences", href: "#" },
    { label: "Corporate Information", href: "#" },
    { label: "Contact Us", href: "#" },
  ];

  return (
    <footer className="mx-auto max-w-5xl px-4 py-12 text-zinc-500 sm:px-6 md:px-8">
      {/* Social Icons */}
      <div className="flex gap-6 mb-6">
        <a href="#" className="hover:text-white transition duration-200" aria-label="Facebook">
          <Facebook size={24} />
        </a>
        <a href="#" className="hover:text-white transition duration-200" aria-label="Instagram">
          <Instagram size={24} />
        </a>
        <a href="#" className="hover:text-white transition duration-200" aria-label="Twitter">
          <Twitter size={24} />
        </a>
        <a href="#" className="hover:text-white transition duration-200" aria-label="YouTube">
          <Youtube size={24} />
        </a>
      </div>

      {/* Footer Links Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3 md:grid-cols-4 text-xs">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="hover:underline transition duration-200"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Service Code Button */}
      <button className="border border-zinc-500 px-3 py-1.5 text-xs hover:text-white hover:border-white transition duration-200 mb-6">
        Service Code
      </button>

      {/* Copyright */}
      <div className="text-[10px] text-zinc-600">
        © 2026 StreamForge, Inc.
      </div>
    </footer>
  );
}
