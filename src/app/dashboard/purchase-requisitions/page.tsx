"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface PR {
  id: number;
  prNumber: string;
  status: string;
  priority: string;
  remarks: string | null;
  requestedDate: string;
  approvedDate: string | null;
  branch: { name: string } | null;
  requestedBy: { fullName: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  fulfilled: "bg-green-100 text-green-700",
};

export default function PurchaseRequisitionsPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [newPR, setNewPR] = useState({
    branchId: "",
    priority: "medium",
    remarks: "",
    items: [{ partId: "1", quantity: "", estimatedPrice: "" }],
  });

  const [parts, setParts] = useState<{ id: number; partNumber: string; partName: string }[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prRes, pRes, bRes] = await Promise.all([
        fetchAuth("/api/procurement?type=purchase-requisitions").then((r) => r.json()),
        fetchAuth("/api/inventory?allParts=true").then((r) => r.json()),
        fetchAuth("/api/branches").then((r) => r.json()),
      ]);
      setPrs(prRes.purchaseRequisitions || []);
      setParts(pRes.parts || []);
      setBranches(bRes.branches || []);
      if (bRes.branches?.length > 0 && !newPR.branchId) {
        setNewPR((p) => ({ ...p, branchId: String(bRes.branches[0].id) }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const addItem = () => {
    setNewPR({
      ...newPR,
      items: [...newPR.items, { partId: "1", quantity: "", estimatedPrice: "" }],
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/procurement", {
      method: "POST",
      body: JSON.stringify({
        type: "purchase-requisition",
        branchId: parseInt(newPR.branchId),
        priority: newPR.priority,
        remarks: newPR.remarks,
        items: newPR.items
          .filter((i) => i.quantity)
          .map((item) => ({
            partId: parseInt(item.partId),
            quantity: parseInt(item.quantity),
            estimatedPrice: item.estimatedPrice || null,
          })),
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ PR ${data.pr.prNumber} created!`);
      setShowCreate(false);
      setNewPR({
        branchId: newPR.branchId,
        priority: "medium",
        remarks: "",
        items: [{ partId: "1", quantity: "", estimatedPrice: "" }],
      });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Requisitions</h1>
          <p className="text-sm text-slate-500 mt-1">Manage PRs and create Purchase Orders</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">
          + New PR
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">PR #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Branch</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Requested By</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Priority</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prs.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{pr.prNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{pr.branch?.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{pr.requestedBy?.fullName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      pr.priority === "urgent" ? "bg-red-100 text-red-700" :
                      pr.priority === "high" ? "bg-orange-100 text-orange-700" :
                      pr.priority === "medium" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{pr.priority}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[pr.status]}`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center hidden sm:table-cell">{new Date(pr.requestedDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {prs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No purchase requisitions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create Purchase Requisition</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select value={newPR.priority} onChange={(e) => setNewPR({ ...newPR, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select value={newPR.branchId} onChange={(e) => setNewPR({ ...newPR, branchId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Items</label>
                {newPR.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select value={item.partId} onChange={(e) => {
                      const items = [...newPR.items];
                      items[index] = { ...item, partId: e.target.value };
                      setNewPR({ ...newPR, items });
                    }} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" required>
                      {parts.map((p) => <option key={p.id} value={p.id}>{p.partNumber} — {p.partName}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                      const items = [...newPR.items];
                      items[index] = { ...item, quantity: e.target.value };
                      setNewPR({ ...newPR, items });
                    }} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" min="1" required />
                    <input type="number" placeholder="Est. Price" value={item.estimatedPrice} onChange={(e) => {
                      const items = [...newPR.items];
                      items[index] = { ...item, estimatedPrice: e.target.value };
                      setNewPR({ ...newPR, items });
                    }} className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm" step="0.01" />
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm text-blue-600">+ Add Item</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea value={newPR.remarks} onChange={(e) => setNewPR({ ...newPR, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Create PR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
