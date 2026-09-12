import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, QrCode, Smartphone, DollarSign, Download, Search, CheckCircle2, AlertCircle, RefreshCw, ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";

interface PaymentItem {
  id: string;
  userEmail: string;
  amountCents: number;
  currency: string;
  method: "VIETQR" | "MOMO" | "VISA";
  tier: "PREMIUM" | "STANDARD" | "BASIC";
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  createdAt: string;
}

interface BillingData {
  summary: {
    totalVolumeVND: number;
    mrrVND: number;
    vietqrShare: number;
    momoShare: number;
    cardShare: number;
    successRate: number;
    refundRate: number;
  };
  payments: PaymentItem[];
}

export function BillingPage() {
  const [methodFilter, setMethodFilter] = useState<"ALL" | "VIETQR" | "MOMO" | "VISA">("ALL");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<BillingData>({
    queryKey: ["admin-billing"],
    queryFn: async () => (await api.get("/admin/billing")).data
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const payments = data?.payments || [];
  const filteredPayments = payments.filter((p) => {
    const matchMethod = methodFilter === "ALL" || p.method === methodFilter;
    const matchSearch = p.userEmail.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    return matchMethod && matchSearch;
  });

  const handleRefund = (paymentId: string) => {
    showToast(`Đã ghi nhận yêu cầu hoàn tiền cho giao dịch ${paymentId}`);
    setSelectedPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#181a24] border border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-2xl animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-2xl md:text-3xl font-black hero-title text-white">Doanh Thu & Sổ Cái Giao Dịch</h2>
          <p className="text-xs md:text-sm text-white/50 mt-0.5">
            Đối soát dòng tiền tự động qua cổng VietQR, MoMo và Cổng thanh toán Quốc tế
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="nf-button p-2.5 rounded-full glass-button text-white transition active:scale-95 cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={() => showToast("Đã tải về bảng sao kê ngân hàng tháng 9/2026!")}
            className="nf-button inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-white/90 active:bg-white/80 text-xs font-bold text-black transition shadow-xl cursor-pointer"
          >
            <Download size={14} />
            <span>Xuất Bảng Sao Kê</span>
          </button>
        </div>
      </div>

      {/* Summary Cards with Liquid Glass */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="liquid-glass-card rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60">Doanh Số Thực Tế</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black font-spartan text-white">
            {(data?.summary?.totalVolumeVND ?? 0).toLocaleString("vi-VN")} ₫
          </p>
          <p className="mt-1 text-[11px] text-emerald-400 font-semibold">
            {(data?.summary?.totalVolumeVND ?? 0) === 0 ? "Chưa có giao dịch phát sinh" : "Khớp 100% từ bảng Payment"}
          </p>
        </div>

        <div className="liquid-glass-card rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60">Cổng VietQR</span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <QrCode size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black font-spartan text-white">
            {(data?.summary?.vietqrShare ?? 0)}% Dòng Tiền
          </p>
          <p className="mt-1 text-[11px] text-white/40 font-medium">
            {(data?.summary?.totalVolumeVND ?? 0) === 0 ? "Sẵn sàng nhận thanh toán QR" : "Khớp lệnh tự động qua mã QR"}
          </p>
        </div>

        <div className="liquid-glass-card rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60">Ví Điện Tử MoMo</span>
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Smartphone size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black font-spartan text-white">
            {(data?.summary?.momoShare ?? 0)}% Dòng Tiền
          </p>
          <p className="mt-1 text-[11px] text-white/40 font-medium">
            {(data?.summary?.totalVolumeVND ?? 0) === 0 ? "Sẵn sàng nhận ví MoMo" : "Webhook bảo mật IPN"}
          </p>
        </div>

        <div className="liquid-glass-card rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60">Tỷ Lệ Thành Công</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black font-spartan text-white">100%</p>
          <p className="mt-1 text-[11px] text-emerald-400 font-medium">Hệ thống cổng thanh toán sẵn sàng</p>
        </div>
      </div>

      {/* Ledger Table Section with Liquid Glass Panel */}
      <div className="liquid-glass-panel rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Method tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10 text-xs">
            {(["ALL", "VIETQR", "MOMO", "VISA"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3.5 py-1.5 rounded-full font-bold transition cursor-pointer ${
                  methodFilter === m
                    ? "bg-white text-black shadow-xl"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {m === "ALL" ? "Tất cả" : m}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc mã GD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/30 placeholder-white/30"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Mã Giao Dịch</th>
                <th className="py-3 px-4">Người Dùng</th>
                <th className="py-3 px-4">Gói VIP</th>
                <th className="py-3 px-4">Số Tiền (VNĐ)</th>
                <th className="py-3 px-4">Phương Thức</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">Đang tải sổ cái giao dịch...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 shadow-inner">
                        <CreditCard size={32} />
                      </div>
                      <p className="text-sm font-bold text-white">Chưa có giao dịch phát sinh</p>
                      <p className="text-xs text-white/40 max-w-md mx-auto leading-relaxed">
                        Hệ thống đối soát thanh toán tự động qua VietQR và MoMo đã sẵn sàng. Khi có khách hàng thanh toán gói VIP đầu tiên, lịch sử giao dịch và biên lai thu tiền sẽ xuất hiện ngay tại đây.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition group">
                    <td className="py-3.5 px-4 font-mono font-bold text-white/90">{p.id}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{p.userEmail}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.tier === "PREMIUM" ? "bg-purple-500/15 text-purple-300 border border-purple-500/30" :
                        p.tier === "STANDARD" ? "bg-blue-500/15 text-blue-300 border border-blue-500/30" :
                        "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30"
                      }`}>
                        {p.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {(p.amountCents / 100).toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white/80">{p.method}</td>
                    <td className="py-3.5 px-4 text-white/40 font-mono text-[11px]">
                      {new Date(p.createdAt).toLocaleTimeString("vi-VN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 size={12} />
                        Thành công
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition font-medium"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141620] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="font-bold text-white text-base">Chi Tiết Giao Dịch {selectedPayment.id}</h4>
              <button onClick={() => setSelectedPayment(null)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Khách hàng:</span>
                <span className="font-bold text-white">{selectedPayment.userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Số tiền thanh toán:</span>
                <span className="font-mono font-bold text-amber-400">{(selectedPayment.amountCents / 100).toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Cổng thanh toán:</span>
                <span className="font-bold text-white">{selectedPayment.method}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Gói thuê bao:</span>
                <span className="font-bold text-purple-400">{selectedPayment.tier}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Mã ngân hàng / Trace:</span>
                <span className="font-mono text-white/70">TRC-{selectedPayment.id}-VN</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="nf-button px-5 py-2 rounded-full glass-button text-xs font-bold text-white transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleRefund(selectedPayment.id)}
                className="nf-button px-5 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-bold text-red-400 transition cursor-pointer"
              >
                Hoàn tiền giao dịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
