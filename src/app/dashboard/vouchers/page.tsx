"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface Voucher {
  id: number;
  voucherNumber: string;
  amount: string;
  description: string | null;
  status: string;
  paidAmount: string | null;
  paidDate: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  createdAt: string;
  po: { poNumber: string } | null;
  vendor: { name: string } | null;
  paidByUser: { fullName: string } | null;
}

interface VoucherDetail {
  voucher: Voucher;
  items: { id: number; partId: number; quantity: number; unitPrice: string; receivedQuantity: number; part: { partNumber: string; partName: string } | null }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [payModal, setPayModal] = useState<Voucher | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", paymentReference: "", remarks: "" });
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "paid">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetchAuth("/api/vouchers?type=vouchers")
      .then((r) => r.json())
      .then((data) => {
        setVouchers(data.vouchers || []);
        setLoading(false);
      });
  };

  const viewVoucher = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetchAuth(`/api/vouchers?type=voucher-detail&id=${id}`).then((r) => r.json());
      setSelectedVoucher(res);
    } catch {
      setSelectedVoucher(null);
    }
    setLoadingDetail(false);
  };

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    const res = await fetchAuth("/api/vouchers", {
      method: "POST",
      body: JSON.stringify({
        type: "mark-paid",
        voucherId: payModal.id,
        ...payForm,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Payment recorded! Status: ${data.newStatus}`);
      setPayModal(null);
      setPayForm({ amount: "", paymentMethod: "cash", paymentReference: "", remarks: "" });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  const filtered = vouchers.filter((v) => {
    if (search) {
      const s = search.toLowerCase();
      if (!v.voucherNumber.toLowerCase().includes(s) && !(v.po?.poNumber.toLowerCase().includes(s)) && !(v.vendor?.name.toLowerCase().includes(s))) return false;
    }
    if (activeTab === "pending" && v.status === "paid") return false;
    if (activeTab === "paid" && v.status !== "paid") return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, v) => sum + Number(v.amount), 0);
  const totalPaid = filtered.reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);
  const totalUnpaid = totalAmount - totalPaid;

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">💰 Debit Vouchers</h1>
        <p className="text-sm text-slate-500 mt-1">Auto-generated from Purchase Orders. Track payments to vendors.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-5">
          <div className="text-sm text-amber-700">Total Amount</div>
          <div className="text-2xl font-bold text-amber-900">Rs. {totalAmount.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
          <div className="text-sm text-green-700">Total Paid</div>
          <div className="text-2xl font-bold text-green-900">Rs. {totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5">
          <div className="text-sm text-red-700">Pending</div>
          <div className="text-2xl font-bold text-red-900">Rs. {totalUnpaid.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {[
            { key: "all", label: "All Vouchers", count: vouchers.length },
            { key: "pending", label: "Pending / Partial", count: vouchers.filter((v) => v.status !== "paid").length },
            { key: "paid", label: "Paid", count: vouchers.filter((v) => v.status === "paid").length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}{" "}
              <span className="ml-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{t.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by voucher #, PO #, or vendor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-96 px-4 py-2 border border-slate-300 rounded-lg"
      />

      {/* Vouchers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Voucher #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3 hidden md:table-cell">PO #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Vendor</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3 hidden sm:table-cell">Paid</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3 hidden sm:table-cell">Balance</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => {
                const balance = Number(v.amount) - Number(v.paidAmount || 0);
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">{v.voucherNumber}</td>
                    <td className="px-4 py-3 text-sm font-mono text-purple-600 hidden md:table-cell">{v.po?.poNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{v.vendor?.name}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold">Rs. {Number(v.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 hidden sm:table-cell">Rs. {Number(v.paidAmount || 0).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium hidden sm:table-cell ${balance > 0 ? "text-red-600" : "text-slate-500"}`}>
                      Rs. {balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => viewVoucher(v.id)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">View</button>
                        {v.status !== "paid" && (
                          <button onClick={() => {
                            setPayModal(v);
                            setPayForm({ ...payForm, amount: String(balance) });
                          }} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No vouchers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">💰 Voucher Details</h2>
                <p className="text-sm text-slate-500">{selectedVoucher.voucher.voucherNumber} • {selectedVoucher.voucher.po?.poNumber}</p>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs text-slate-500">Vendor</div><div className="font-medium">{selectedVoucher.voucher.vendor?.name}</div></div>
                <div><div className="text-xs text-slate-500">Total Amount</div><div className="font-bold text-lg">Rs. {Number(selectedVoucher.voucher.amount).toLocaleString()}</div></div>
                <div><div className="text-xs text-slate-500">Paid</div><div className="font-medium text-green-600">Rs. {Number(selectedVoucher.voucher.paidAmount || 0).toLocaleString()}</div></div>
                <div><div className="text-xs text-slate-500">Status</div><div><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedVoucher.voucher.status]}`}>{selectedVoucher.voucher.status}</span></div></div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Items in PO</h3>
                <div className="space-y-1">
                  {selectedVoucher.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                      <span>{item.part?.partNumber} — {item.part?.partName}</span>
                      <span className="text-xs">{item.quantity} × Rs. {Number(item.unitPrice).toLocaleString()} = <span className="font-bold">Rs. {(item.quantity * Number(item.unitPrice)).toLocaleString()}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedVoucher.voucher.paymentMethod && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <div className="text-sm">
                    <strong>Last Payment:</strong> {selectedVoucher.voucher.paymentMethod} • Rs. {Number(selectedVoucher.voucher.paidAmount || 0).toLocaleString()}
                    {selectedVoucher.voucher.paidDate && ` on ${new Date(selectedVoucher.voucher.paidDate).toLocaleDateString()}`}
                    {selectedVoucher.voucher.paidByUser && ` by ${selectedVoucher.voucher.paidByUser.fullName}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">💵 Mark Payment</h2>
              <button onClick={() => setPayModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                <div><strong>Vendor:</strong> {payModal.vendor?.name}</div>
                <div><strong>Total:</strong> Rs. {Number(payModal.amount).toLocaleString()}</div>
                <div><strong>Already Paid:</strong> Rs. {Number(payModal.paidAmount || 0).toLocaleString()}</div>
                <div><strong>Balance:</strong> Rs. {(Number(payModal.amount) - Number(payModal.paidAmount || 0)).toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount *</label>
                <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference (Cheque # / Transaction ID)</label>
                <input type="text" value={payForm.paymentReference} onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea value={payForm.remarks} onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPayModal(null)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
