import { motion } from "framer-motion";
import { BookmarkPlus, LogIn, UserPlus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlaybackStore } from "../store/playbackStore";

export function AuthPromptModal() {
  const { closeAuthModal } = usePlaybackStore();

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fadeIn"
      onClick={closeAuthModal}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.85 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm liquid-glass rounded-3xl p-6 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-white/20 text-center"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer focus:outline-none border border-white/15"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>

        {/* Icon Circle */}
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 border border-white/20 shadow-inner">
          <BookmarkPlus size={30} className="text-white" />
        </div>

        {/* Heading & Subtitle */}
        <h3 className="text-lg font-black tracking-tight text-white mb-2">
          Yêu cầu đăng nhập
        </h3>
        <p className="text-xs text-white/70 leading-relaxed mb-6 px-1">
          Vui lòng đăng nhập hoặc tạo tài khoản để thêm phim vào danh sách phát và đồng bộ lịch sử xem của riêng bạn.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/login"
            onClick={closeAuthModal}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-white/20 hover:bg-white/30 text-sm font-bold text-white transition border border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md active:scale-95 cursor-pointer"
          >
            <LogIn size={16} />
            Đăng nhập ngay
          </Link>

          <Link
            to="/register"
            onClick={closeAuthModal}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/12 text-sm font-semibold text-white/80 hover:text-white transition border border-white/15 backdrop-blur-md active:scale-95 cursor-pointer"
          >
            <UserPlus size={16} />
            Tạo tài khoản mới
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
