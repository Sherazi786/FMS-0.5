"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface PO {
  id: number;
  poNumber: string;
  status: string;
  totalAmount: string;
  orderDate: string | null;
  expectedDelivery: string | null;
  vendor: { name: string } | null;
  branch: { name: string } | null;
  createdBy: { fullName: string } | null;
  prId?: number | null;
}

interface PR {
  id: number;
  prNumber: string;
  status: string;
  priority: string;
  remarks: string | null;
  branch: { name: string } | null;
  items: PRItem[];
}

interface PRItem {
  id: number;
  partId: number;
  quantity: number;
  estimatedPrice: string | null;
  part: { partNumber: string; partName: string } | null;
}

interface Vendor { id: number; name: string }
interface Part { id: number; partNumber: string; partName: string }

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending_approval: "Pending Approval", approved: "Approved", ordered: "Ordered",
  partial_received: "Partial Received", completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600", pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700", ordered: "bg-purple-100 text-purple-700",
  partial_received: "bg-orange-100 text-orange-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [pendingPRs, setPendingPRs] = useState<PR[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);

  const [newPO, setNewPO] = useState({
    vendorId: "", branchId: "", expectedDelivery: "", remarks: "",
    items: [{ partId: "", quantity: "", unitPrice: "" }],
    prId: null as number | null,
  });

  const [newVendor, setNewVendor] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [poData, prData, vData, pData, bData] = await Promise.all([
        fetchAuth("/api/procurement?type=purchase-orders").then((r) => r.json()),
        fetchAuth("/api/procurement?type=purchase-requisitions&status=pending").then((r) => r.json()),
        fetchAuth("/api/vendors").then((r) => r.json()),
        fetchAuth("/api/inventory?allParts=true").then((r) => r.json()),
        fetchAuth("/api/branches").then((r) => r.json()),
      ]);

      // Get items for each pending PR
      const prs = prData.purchaseRequisitions || [];
      const prsWithItems = await Promise.all(
        prs.map(async (pr: PR) => {
          const itemsRes = await fetchAuth(`/api/procurement?type=pr-items&prId=${pr.id}`).then((r) => r.json());
          return { ...pr, items: itemsRes.items || [] };
        })
      );

      setOrders(poData.purchaseOrders || []);
      setPendingPRs(prsWithItems);
      setVendors(vData.vendors || []);
      setParts(pData.parts || []);
      if (bData.branches?.length > 0 && !newPO.branchId) {
        setNewPO((p) => ({ ...p, branchId: String(bData.branches[0].id) }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const createFromPR = (pr: PR) => {
    setSelectedPR(pr);
    setNewPO({
      vendorId: "",
      branchId: pr.branch ? "" : newPO.branchId,
      expectedDelivery: "",
      remarks: `Created from PR: ${pr.prNumber}`,
      items: pr.items.map((i) => ({
        partId: String(i.partId),
        quantity: String(i.quantity),
        unitPrice: i.estimatedPrice || "",
      })),
      prId: pr.id,
    });
    setShowCreate(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/procurement", {
      method: "POST",
      body: JSON.stringify({
        type: "purchase-order",
        vendorId: parseInt(newPO.vendorId),
        branchId: parseInt(newPO.branchId),
        expectedDelivery: newPO.expectedDelivery || null,
        remarks: newPO.remarks,
        items: newPO.items.map((item) => ({
          partId: parseInt(item.partId),
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
        prId: newPO.prId,
      }),
    });
    const data = await res.json();
    if (data.success) {
      const linked = data.po.prId ? `\n🔗 Linked to PR #${selectedPR?.prNumber || "PR"}` : "";
      alert(`✅ PO ${data.po.poNumber} created!${linked}`);
      setShowCreate(false);
      setSelectedPR(null);
      setNewPO({ vendorId: "", branchId: newPO.branchId, expectedDelivery: "", remarks: "", items: [{ partId: "", quantity: "", unitPrice: "" }], prId: null });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  const handleAddVendor = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/vendors", { method: "POST", body: JSON.stringify(newVendor) });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Vendor ${data.vendor.name} added!`);
      setNewPO({ ...newPO, vendorId: String(data.vendor.id) });
      setNewVendor({ name: "", contactPerson: "", phone: "", email: "", address: "" });
      setShowAddVendor(false);
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
          <h1 className="text-2xl font-bold text-slate-900">🛒 Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Convert PRs to POs, manage vendors, and track orders</p>
        </div>
        <button onClick={() => {
          setSelectedPR(null);
          setNewPO({ vendorId: "", branchId: newPO.branchId, expectedDelivery: "", remarks: "", items: [{ partId: "", quantity: "", unitPrice: "" }], prId: null });
          setShowCreate(true);
        }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">+ New PO (Manual)</button>
      </div>

      {/* Pending PRs to Convert */}
      {pendingPRs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <span>📋</span>
            <span>Pending Purchase Requisitions</span>
            <span className="bg-amber-200 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">{pendingPRs.length}</span>
          </h2>
          <p className="text-sm text-amber-800 mb-4">Click "Create PO" to convert a PR to Purchase Order. Items will be auto-filled.</p>
          <div className="space-y-3">
            {pendingPRs.map((pr) => (
              <div key={pr.id} className="bg-white rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-blue-600">{pr.prNumber}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      pr.priority === "urgent" ? "bg-red-100 text-red-700" :
                      pr.priority === "high" ? "bg-orange-100 text-orange-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{pr.priority}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {pr.items.length} item(s) • {pr.branch?.name}
                  </p>
                  {pr.remarks && <p className="text-xs text-slate-500 italic mt-1">📝 {pr.remarks}</p>}
                </div>
                <button
                  onClick={() => createFromPR(pr)}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-500"
                >
                  Create PO →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Purchase Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">All Purchase Orders ({orders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">PO #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Vendor</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Amount</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{po.poNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{po.vendor?.name}</td>
                  <td className="px-6 py-4 text-sm text-center font-semibold">Rs. {parseFloat(po.totalAmount || "0").toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[po.status]}`}>{STATUS_LABELS[po.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center hidden sm:table-cell">{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No purchase orders yet. Create one from a PR above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedPR ? `📋 Create PO from ${selectedPR.prNumber}` : "+ New Purchase Order"}
              </h2>
              {selectedPR && (
                <p className="text-sm text-slate-500 mt-1">
                  🔗 Linked to PR: <span className="font-mono font-bold text-blue-600">{selectedPR.prNumber}</span>
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Vendor *</label>
                    <button type="button" onClick={() => setShowAddVendor(true)} className="text-xs text-blue-600 font-medium">+ Add Vendor</button>
                  </div>
                  <select value={newPO.vendorId} onChange={(e) => setNewPO({ ...newPO, vendorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                    <option value="">Select vendor</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                  <input type="date" value={newPO.expectedDelivery} onChange={(e) => setNewPO({ ...newPO, expectedDelivery: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Items {selectedPR && <span className="text-xs text-blue-600">(from {selectedPR.prNumber})</span>}</label>
                {newPO.items.map((item, index) => {
                  const prItem = selectedPR?.items[index];
                  return (
                    <div key={index} className="flex gap-2 mb-2">
                      <select value={item.partId} onChange={(e) => {
                        const items = [...newPO.items];
                        items[index] = { ...item, partId: e.target.value };
                        setNewPO({ ...newPO, items });
                      }} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" required disabled={!!selectedPR}>
                        <option value="">Select part</option>
                        {parts.map((p) => <option key={p.id} value={p.id}>{p.partNumber} — {p.partName}</option>)}
                      </select>
                      <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                        const items = [...newPO.items];
                        items[index] = { ...item, quantity: e.target.value };
                        setNewPO({ ...newPO, items });
                      }} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" min="1" required readOnly={!!selectedPR} />
                      <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => {
                        const items = [...newPO.items];
                        items[index] = { ...item, unitPrice: e.target.value };
                        setNewPO({ ...newPO, items });
                      }} className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm" step="0.01" required />
                    </div>
                  );
                })}
                {!selectedPR && (
                  <button type="button" onClick={() => setNewPO({ ...newPO, items: [...newPO.items, { partId: "", quantity: "", unitPrice: "" }] })} className="text-sm text-blue-600">+ Add Item</button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea value={newPO.remarks} onChange={(e) => setNewPO({ ...newPO, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setSelectedPR(null); }} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add New Vendor</h2>
              <button onClick={() => setShowAddVendor(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name *</label>
                <input type="text" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input type="text" value={newVendor.contactPerson} onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="text" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="+92-300-1234567" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea value={newVendor.address} onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddVendor(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Add Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
