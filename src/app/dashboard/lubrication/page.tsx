"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface LubPart {
  id: number;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  quantity: number;
  minStockLevel: number;
}

interface Vehicle { id: number; registrationNumber: string; make: string; model: string }
interface StockTransaction {
  id: number;
  partId: number;
  transactionType: string;
  quantity: number;
  remarks: string | null;
  createdAt: string;
  part: { partName: string; partNumber: string } | null;
  vehicle: { registrationNumber: string } | null;
  performedBy: { fullName: string } | null;
}

const LUB_ICONS: Record<string, string> = {
  "Petrol Engine Oil": "⛽",
  "Diesel Engine Oil": "🛢️",
  "Coolant": "❄️",
  "Gear Oil": "⚙️",
  "Brake Oil": "🛑",
};

export default function LubricationPage() {
  const [items, setItems] = useState<LubPart[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentIssues, setRecentIssues] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<LubPart | null>(null);
  const [user, setUser] = useState<{ role: string; fullName: string } | null>(null);

  const [issueForm, setIssueForm] = useState({ partId: "", quantity: "", vehicleId: "", remarks: "" });
  const [addStockForm, setAddStockForm] = useState({ partId: "", quantity: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, vRes, txRes] = await Promise.all([
        fetchAuth("/api/inventory").then((r) => r.json()),
        fetchAuth("/api/vehicles").then((r) => r.json()),
        fetchAuth("/api/lubrication/transactions").then((r) => r.json()),
      ]);

      const lubParts = (invRes.items || [])
        .filter((i: any) => i.part?.category === "Lubrication")
        .map((i: any) => ({
          id: i.part.id,
          partNumber: i.part.partNumber,
          partName: i.part.partName,
          category: i.part.category,
          unit: i.part.unit,
          quantity: i.quantity,
          minStockLevel: i.part.minStockLevel || 20,
        }));
      setItems(lubParts);
      setVehicles(vRes.vehicles || []);
      setRecentIssues(txRes.transactions || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleIssue = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/requisition", {
      method: "POST",
      body: JSON.stringify({ type: "issue-lubrication", ...issueForm }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Issued! Remaining: ${data.remainingStock} liter`);
      setShowIssueModal(false);
      setIssueForm({ partId: "", quantity: "", vehicleId: "", remarks: "" });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  const handleAddStock = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/inventory", {
      method: "POST",
      body: JSON.stringify({ type: "add-stock", ...addStockForm }),
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ Stock added!");
      setShowAddStockModal(false);
      setAddStockForm({ partId: "", quantity: "" });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  const canIssue = user?.role === "store_executive" || user?.role === "procurement_executive";
  const canAddStock = user?.role === "store_executive" || user?.role === "procurement_executive";
  const isManager = user?.role === "fleet_manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🛢️ Lubrication Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isManager ? "📊 View only — Issue is restricted to Store Executive" : "Issue lubricants to vehicles and track stock"}
          </p>
        </div>
        {canAddStock && (
          <button onClick={() => setShowAddStockModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500">
            + Add Stock
          </button>
        )}
      </div>

      {isManager && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="font-medium text-blue-900">View-Only Mode</p>
              <p className="text-sm text-blue-700">As Fleet Manager, you can monitor stock and transactions. Issuing lubricants is done by Store Executive only.</p>
            </div>
          </div>
        </div>
      )}

      {/* Lubrication Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                {LUB_ICONS[item.partName] || "🛢️"}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{item.partName}</h3>
                <p className="text-xs text-slate-500">{item.partNumber}</p>
              </div>
            </div>
            <div className="flex items-end justify-between mt-4">
              <div>
                <p className="text-xs text-slate-500">In Stock</p>
                <p className={`text-3xl font-bold ${item.quantity < item.minStockLevel ? "text-red-600" : "text-slate-900"}`}>
                  {item.quantity}
                  <span className="text-sm text-slate-500 font-normal ml-1">{item.unit}</span>
                </p>
              </div>
              {canIssue && (
                <button
                  onClick={() => {
                    setSelectedPart(item);
                    setIssueForm({ ...issueForm, partId: String(item.id) });
                    setShowIssueModal(true);
                  }}
                  className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200"
                >
                  Issue
                </button>
              )}
            </div>
            {item.quantity < item.minStockLevel && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">⚠ Low stock — reorder needed</div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Issues */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Part</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Vehicle</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Qty</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">By</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden lg:table-cell">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentIssues.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm font-medium">{tx.part?.partName}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 hidden md:table-cell">{tx.vehicle?.registrationNumber || "-"}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`font-bold ${tx.transactionType === "issue" || tx.transactionType === "lubrication_issue" ? "text-red-600" : "text-green-600"}`}>
                      {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500 hidden sm:table-cell">{tx.performedBy?.fullName}</td>
                  <td className="px-6 py-3 text-xs text-slate-500 hidden lg:table-cell">{tx.remarks || "-"}</td>
                </tr>
              ))}
              {recentIssues.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No transactions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Issue Lubricant</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleIssue} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lubricant *</label>
                <select value={issueForm.partId} onChange={(e) => setIssueForm({ ...issueForm, partId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">Select lubricant</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.partName} ({i.quantity} {i.unit} in stock)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (liters) *</label>
                <input type="number" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" min="0.5" step="0.5" required placeholder="e.g. 4" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
                <select value={issueForm.vehicleId} onChange={(e) => setIssueForm({ ...issueForm, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Select vehicle (optional)</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <input type="text" value={issueForm.remarks} onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Oil change at 50,000 km" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Issue Now</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Stock</h2>
              <button onClick={() => setShowAddStockModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lubricant *</label>
                <select value={addStockForm.partId} onChange={(e) => setAddStockForm({ ...addStockForm, partId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">Select lubricant</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.partName} (current: {i.quantity} {i.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Add *</label>
                <input type="number" value={addStockForm.quantity} onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" min="1" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddStockModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
