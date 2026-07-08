"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface RequisitionItem {
  id: number;
  partId: number;
  quantityRequested: number;
  quantityAvailable: number;
  quantityIssued: number;
  issued: boolean;
  partsMaster: { partNumber: string; partName: string; category: string | null } | null;
}

interface Requisition {
  id: number;
  requisitionNumber: string;
  status: string;
  requestedDate: string;
  remarks: string | null;
  jobCard: { jobCardNumber: string; description: string } | null;
  vehicle: { registrationNumber: string } | null;
  items: RequisitionItem[];
  hasStockNow?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", approved: "Approved", fulfilled: "Fulfilled", rejected: "Rejected",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700", fulfilled: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
};

export default function PartsIssuePage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueQuantities, setIssueQuantities] = useState<Record<number, number>>({});
  const [transferModal, setTransferModal] = useState<{ itemId: number; partId: number; qty: number; requisitionId: number; partName: string } | null>(null);
  const [transferReason, setTransferReason] = useState("");
  const [lastTransfer, setLastTransfer] = useState<{ partName: string; prNumber: string } | null>(null);
  const [autoStockMessage, setAutoStockMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds to detect new stock
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    fetchAuth("/api/requisition?type=requisitions")
      .then((r) => r.json())
      .then(async (data) => {
        const allReqs = data.requisitions || [];
        const withItems = await Promise.all(
          allReqs.map(async (req: Requisition) => {
            const itemsRes = await fetchAuth(`/api/requisition/items?requisitionId=${req.id}`).then((r) => r.json());
            // Re-check actual stock for each item from current inventory
            const enrichedItems = await Promise.all(
              (itemsRes.items || []).map(async (item: RequisitionItem) => {
                try {
                  const invRes = await fetchAuth(`/api/inventory`).then((r) => r.json());
                  const inv = invRes.items?.find((i: any) => i.part?.id === item.partId);
                  if (inv) {
                    item.quantityAvailable = inv.quantity;
                  }
                } catch {}
                return item;
              })
            );
            const hasStock = enrichedItems.some((i: RequisitionItem) => i.quantityAvailable > 0 && !i.issued);
            return { ...req, items: enrichedItems, hasStockNow: hasStock };
          })
        );
        const previousStock = requisitions;
        setRequisitions(withItems);
        // Detect new stock arrival
        const newlyAvailable = withItems.filter((r) => {
          if (!r.hasStockNow) return false;
          const prev = previousStock.find((p) => p.id === r.id);
          return prev && !prev.hasStockNow;
        });
        if (newlyAvailable.length > 0) {
          setAutoStockMessage(`🎉 ${newlyAvailable.length} requisition(s) now have stock available!`);
          setTimeout(() => setAutoStockMessage(null), 8000);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Load error:", err);
        setLoading(false);
      });
  };

  const handleIssue = async (requisitionId: number, itemId: number, partId: number, qty: number) => {
    const res = await fetchAuth("/api/requisition", {
      method: "POST",
      body: JSON.stringify({
        type: "issue-parts",
        requisitionId,
        items: [{ id: itemId, partId, quantityIssued: qty }],
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (data.allIssued) {
        alert("✅ All parts issued! Job card back to In Progress.");
      }
      loadData();
    }
  };

  const handleTransfer = async () => {
    if (!transferModal) return;
    const res = await fetchAuth("/api/requisition", {
      method: "POST",
      body: JSON.stringify({
        type: "transfer-to-procurement",
        requisitionItemId: transferModal.itemId,
        partId: transferModal.partId,
        requestedQty: transferModal.qty,
        requisitionId: transferModal.requisitionId,
        reason: transferReason,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setLastTransfer({ partName: data.autoPR?.partName || transferModal.partName, prNumber: data.autoPR?.prNumber || "" });
      setTransferModal(null);
      setTransferReason("");
      loadData();
    } else {
      alert(data.error || "Failed to transfer");
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  const active = requisitions.filter((r) => r.status !== "fulfilled" && r.status !== "rejected");
  const fulfilled = requisitions.filter((r) => r.status === "fulfilled");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Parts Issue & Transfer</h1>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Auto-detecting stock (refreshes every 15s)
        </div>
      </div>

      {autoStockMessage && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-center justify-between animate-pulse">
          <p className="font-medium text-green-900">{autoStockMessage}</p>
          <button onClick={() => setAutoStockMessage(null)} className="text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {lastTransfer && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="font-medium text-purple-900">{lastTransfer.partName} transferred to Procurement</p>
              <p className="text-sm text-purple-700">PR Number: <span className="font-mono font-bold">{lastTransfer.prNumber}</span></p>
            </div>
          </div>
          <button onClick={() => setLastTransfer(null)} className="text-purple-600 hover:text-purple-800">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Pending Parts Requests</h2>
          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
            {active.length} pending
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {active.map((req) => (
            <div key={req.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium text-blue-600">{req.requisitionNumber}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    {req.hasStockNow && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        🟢 Stock Available
                      </span>
                    )}
                    {req.jobCard && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {req.jobCard.jobCardNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {req.vehicle?.registrationNumber} • {new Date(req.requestedDate).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {req.items.map((item) => {
                  const shortage = item.quantityRequested - (item.quantityAvailable || 0);
                  const isTransferred = item.quantityAvailable === 0 && !item.issued && item.quantityIssued === 0;
                  const hasStock = item.quantityAvailable > 0;
                  return (
                    <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg p-3 ${
                      isTransferred ? "bg-purple-50" : hasStock ? "bg-green-50" : "bg-amber-50"
                    }`}>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-900">
                          {item.partsMaster?.partNumber} — {item.partsMaster?.partName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Requested: {item.quantityRequested} | In Stock:{" "}
                          <span className={`font-bold ${hasStock ? "text-green-600" : "text-red-600"}`}>
                            {item.quantityAvailable || 0}
                          </span>
                          {isTransferred && <span className="text-purple-600 font-bold ml-2">🔄 Transferred to Procurement</span>}
                          {!isTransferred && hasStock && <span className="text-green-600 font-bold ml-2">✓ Ready to issue</span>}
                          {!isTransferred && !hasStock && <span className="text-amber-600 font-bold ml-2">⚠ Short {shortage}</span>}
                        </div>
                      </div>

                      {item.issued ? (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                          ✓ Issued ({item.quantityIssued})
                        </span>
                      ) : isTransferred ? (
                        <span className="text-xs text-purple-600 bg-purple-100 px-3 py-1 rounded-full">⏳ Awaiting PO & GRN</span>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {hasStock ? (
                            <>
                              <input
                                type="number"
                                min="1"
                                max={item.quantityAvailable}
                                defaultValue={Math.min(item.quantityRequested, item.quantityAvailable)}
                                onChange={(e) =>
                                  setIssueQuantities({
                                    ...issueQuantities,
                                    [item.id]: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                              />
                              <button
                                onClick={() => handleIssue(req.id, item.id, item.partId, issueQuantities[item.id] || Math.min(item.quantityRequested, item.quantityAvailable))}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500"
                              >
                                ✓ Issue
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full">No stock</span>
                          )}
                          <button
                            onClick={() =>
                              setTransferModal({
                                itemId: item.id,
                                partId: item.partId,
                                qty: item.quantityRequested,
                                requisitionId: req.id,
                                partName: item.partsMaster?.partName || "",
                              })
                            }
                            className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200"
                          >
                            ↗ Transfer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {req.remarks && <p className="text-xs text-slate-500 mt-3 italic">📝 {req.remarks}</p>}
            </div>
          ))}
          {active.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              <div className="text-4xl mb-2">✅</div>
              <p>No pending parts requests</p>
            </div>
          )}
        </div>
      </div>

      {fulfilled.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Recently Fulfilled</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {fulfilled.slice(0, 5).map((req) => (
              <div key={req.id} className="p-4">
                <span className="font-mono text-sm text-green-600">{req.requisitionNumber}</span>
                <span className="text-xs text-slate-500 ml-3">{req.vehicle?.registrationNumber} — {req.jobCard?.jobCardNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Transfer to Procurement</h2>
              <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-sm text-purple-800">
                🔄 <strong>{transferModal.partName}</strong> ko Procurement ko transfer karny se Auto-PR create hoga. Procurement PO banaye ga, vendor ko bhejega, GRN pe stock store mein add hoga, phir aap issue kar sakein gay.
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for transfer</label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                  placeholder="e.g. Out of stock, low stock, special order needed"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setTransferModal(null)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleTransfer} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500">Transfer Now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
