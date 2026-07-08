"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface PurchaseRecord {
  prId?: number | null;
  prNumber?: string;
  poId: number;
  poNumber: string;
  poStatus: string;
  poCreated: string;
  vendorName: string;
  totalAmount: number;
  items: { partNumber: string; partName: string; quantity: number; unitPrice: number; receivedQuantity: number }[];
  grnNumber?: string;
  grnDate?: string;
  receivedBy?: string;
  branchName: string;
  vehicleNumber?: string;
}

export default function PurchaseRecordsPage() {
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetchAuth("/api/procurement?type=purchase-records").then((r) => r.json());
      setRecords(res.records || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const filtered = records.filter((r) => {
    if (search) {
      const s = search.toLowerCase();
      if (!r.poNumber.toLowerCase().includes(s) && !(r.prNumber?.toLowerCase().includes(s)) && !r.vendorName.toLowerCase().includes(s)) return false;
    }
    if (dateFrom) {
      const d = new Date(r.poCreated);
      if (d < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const d = new Date(r.poCreated);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPOs = filtered.length;
  const totalGRNs = filtered.filter((r) => r.grnNumber).length;

  const exportCSV = () => {
    setExporting(true);
    try {
      const headers = ["PO #", "PR #", "Date", "Vendor", "Branch", "Vehicle", "Part #", "Part Name", "Qty", "Unit Price", "Total", "Received", "GRN #", "GRN Date", "Received By", "Status"];
      const rows = filtered.flatMap((r) =>
        r.items.map((item) => [
          r.poNumber,
          r.prNumber || "",
          new Date(r.poCreated).toLocaleDateString(),
          r.vendorName,
          r.branchName,
          r.vehicleNumber || "",
          item.partNumber,
          item.partName,
          item.quantity,
          item.unitPrice,
          (item.unitPrice * item.quantity).toFixed(2),
          item.receivedQuantity,
          r.grnNumber || "",
          r.grnDate ? new Date(r.grnDate).toLocaleDateString() : "",
          r.receivedBy || "",
          r.poStatus,
        ])
      );

      const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-records-${dateFrom || "all"}-to-${dateTo || "now"}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert("✅ CSV exported!");
    } catch (err) {
      alert("❌ Export failed: " + err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📊 Purchase Records</h1>
          <p className="text-sm text-slate-500 mt-1">Monthly purchase sheet — PRs, POs, and GRNs</p>
        </div>
        <button onClick={exportCSV} disabled={exporting || filtered.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 disabled:opacity-50">
          {exporting ? "Exporting..." : "📥 Export CSV"}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm text-blue-600">Total POs</div>
          <div className="text-2xl font-bold text-blue-900">{totalPOs}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-sm text-green-600">Total GRNs</div>
          <div className="text-2xl font-bold text-green-900">{totalGRNs}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="text-sm text-purple-600">Total Amount</div>
          <div className="text-2xl font-bold text-purple-900">Rs. {totalAmount.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-sm text-amber-600">Period</div>
          <div className="text-2xl font-bold text-amber-900">
            {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom || dateTo || "All Time"}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by PO, PR, or vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Clear
          </button>
        )}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">PO #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3 hidden md:table-cell">PR #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Vendor</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Items</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Amount</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3 hidden md:table-cell">GRN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.poId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">{r.poNumber}</td>
                  <td className="px-4 py-3 text-sm font-mono text-purple-600 hidden md:table-cell">{r.prNumber || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">{new Date(r.poCreated).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.vendorName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{r.items.length} item(s)</div>
                    <div className="text-xs text-slate-400">{r.items[0]?.partName}{r.items.length > 1 ? ` +${r.items.length - 1}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">Rs. {r.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.poStatus === "completed" ? "bg-green-100 text-green-700" :
                      r.poStatus === "partial_received" ? "bg-orange-100 text-orange-700" :
                      r.poStatus === "ordered" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{r.poStatus.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {r.grnNumber ? (
                      <span className="text-xs font-mono text-green-600">{r.grnNumber}</span>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No records found</td></tr>}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-900">Total ({totalPOs} POs)</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">Rs. {totalAmount.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
