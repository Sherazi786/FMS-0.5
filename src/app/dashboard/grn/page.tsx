"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface GRN {
  id: number;
  grnNumber: string;
  receivedDate: string;
  remarks: string | null;
  po: { poNumber: string; status: string } | null;
  vendor: { name: string } | null;
  receivedBy: { fullName: string } | null;
}

interface POItem {
  id: number;
  partId: number;
  quantity: number;
  receivedQuantity: number;
  unitPrice: string;
  part: { partNumber: string; partName: string; category: string | null } | null;
}

interface PO {
  id: number;
  poNumber: string;
  status: string;
  vendor: { name: string } | null;
  expectedDelivery: string | null;
  items: POItem[];
}

export default function GRNPage() {
  const [grnList, setGrnList] = useState<GRN[]>([]);
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch POs and their items separately
      const [grnRes, poRes] = await Promise.all([
        fetchAuth("/api/procurement?type=grn").then((r) => r.json()),
        fetchAuth("/api/procurement?type=purchase-orders").then((r) => r.json()),
      ]);

      const pos = poRes.purchaseOrders || [];
      const ordersWithItems: PO[] = [];

      // Fetch items for each PO
      for (const po of pos) {
        try {
          const itemsRes = await fetchAuth(`/api/procurement?type=po-items&poId=${po.id}`).then((r) => r.json());
          ordersWithItems.push({ ...po, items: itemsRes.items || [] });
        } catch {
          ordersWithItems.push({ ...po, items: [] });
        }
      }

      setGrnList(grnRes.grn || []);
      setOrders(ordersWithItems);
      setLoading(false);
    } catch (err) {
      console.error("Load error:", err);
      setLoading(false);
    }
  };

  const openReceiveModal = (po: PO) => {
    setSelectedPO(po);
    // Pre-fill with remaining quantities
    const qtyMap: Record<number, number> = {};
    po.items.forEach((item) => {
      qtyMap[item.id] = item.quantity - (item.receivedQuantity || 0);
    });
    setReceiveQuantities(qtyMap);
    setShowReceiveModal(true);
  };

  const handleReceive = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPO || submitting) return;
    setSubmitting(true);

    try {
      const items = selectedPO.items
        .map((item) => ({
          poItemId: item.id,
          partId: item.partId,
          quantityReceived: receiveQuantities[item.id] || 0,
        }))
        .filter((i) => i.quantityReceived > 0);

      if (items.length === 0) {
        alert("⚠️ Please enter quantity to receive");
        setSubmitting(false);
        return;
      }

      const res = await fetchAuth("/api/procurement", {
        method: "POST",
        body: JSON.stringify({ type: "grn", poId: selectedPO.id, items }),
      });
      const data = await res.json();

      if (data.success) {
        alert(`✅ GRN ${data.grn.grnNumber} created! Stock added to inventory.`);
        setShowReceiveModal(false);
        setSelectedPO(null);
        setReceiveQuantities({});
        loadData();
      } else {
        alert("❌ " + (data.error || "Failed to create GRN"));
      }
    } catch (err) {
      alert("❌ Error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  const pendingDelivery = orders.filter((o) => o.status === "ordered" || o.status === "partial_received");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📥 Goods Receipt Note (GRN)</h1>
        <p className="text-sm text-slate-500 mt-1">Receive stock from purchase orders — auto-updates inventory</p>
      </div>

      {/* Pending Deliveries */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Pending Deliveries</h2>
          <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">{pendingDelivery.length} pending</span>
        </div>
        <div className="divide-y divide-slate-100">
          {pendingDelivery.map((po) => (
            <div key={po.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-medium text-blue-600">{po.poNumber}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    po.status === "partial_received" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {po.status === "partial_received" ? "Partial Received" : "Ordered"}
                  </span>
                </div>
                <div className="text-sm text-slate-700 mt-1">{po.vendor?.name || "Unknown vendor"}</div>
                {po.expectedDelivery && <div className="text-xs text-amber-600 mt-1">Expected: {new Date(po.expectedDelivery).toLocaleDateString()}</div>}
                <div className="text-xs text-slate-500 mt-1">{po.items.length} item(s)</div>
              </div>
              <button onClick={() => openReceiveModal(po)} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500">
                📥 Receive
              </button>
            </div>
          ))}
          {pendingDelivery.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              <div className="text-4xl mb-2">✅</div>
              <p>No pending deliveries</p>
            </div>
          )}
        </div>
      </div>

      {/* GRN History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">GRN History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">GRN #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">PO #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Vendor</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Received By</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grnList.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-green-600">{g.grnNumber}</td>
                  <td className="px-6 py-4 text-sm font-mono text-blue-600">{g.po?.poNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{g.vendor?.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{g.receivedBy?.fullName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center">{new Date(g.receivedDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {grnList.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No GRN records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">📥 Receive Goods</h2>
                <p className="text-sm text-slate-500">{selectedPO.poNumber} • {selectedPO.vendor?.name}</p>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleReceive} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
                💡 Enter the quantity you actually received. Stock will be auto-added to inventory.
              </div>

              {selectedPO.items && selectedPO.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedPO.items.map((item) => {
                    const remaining = item.quantity - (item.receivedQuantity || 0);
                    return (
                      <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            {item.part?.partNumber} — {item.part?.partName}
                          </div>
                          <div className="text-xs text-slate-500">
                            Ordered: {item.quantity} | Already Received: {item.receivedQuantity || 0} | Remaining: <span className="font-bold text-amber-600">{remaining}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Receive:</label>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={receiveQuantities[item.id] ?? 0}
                            onChange={(e) =>
                              setReceiveQuantities({
                                ...receiveQuantities,
                                [item.id]: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-4">No items in this PO</div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowReceiveModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50">
                  {submitting ? "Receiving..." : "✓ Confirm Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
