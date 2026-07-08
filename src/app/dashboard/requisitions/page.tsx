"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface Requisition {
  id: number;
  requisitionNumber: string;
  status: string;
  remarks: string | null;
  requestedDate: string;
  jobCard: { jobCardNumber: string; description: string } | null;
  vehicle: { registrationNumber: string } | null;
  requestedBy: { fullName: string } | null;
}

interface Part {
  id: number;
  partNumber: string;
  partName: string;
  category: string | null;
  unit: string;
  inStock?: number;
}

interface JobCard {
  id: number;
  jobCardNumber: string;
  description: string;
  status: string;
  vehicle: { registrationNumber: string } | null;
}

interface CustomPartItem {
  partId?: number;
  customName?: string;
  customPartNumber?: string;
  customCategory?: string;
  quantity: string;
  isCustom: boolean;
}

export default function PartsRequisitionPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newReq, setNewReq] = useState<{
    jobCardId: string;
    remarks: string;
    items: CustomPartItem[];
  }>({
    jobCardId: "",
    remarks: "",
    items: [{ partId: undefined, customName: "", customPartNumber: "", customCategory: "", quantity: "1", isCustom: false }],
  });

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("dashboard-refresh", handleRefresh);
    return () => window.removeEventListener("dashboard-refresh", handleRefresh);
  }, []);

  const loadData = async () => {
    try {
      const [reqData, jcData, partData, invData] = await Promise.all([
        fetchAuth("/api/requisition?type=requisitions").then((r) => r.json()),
        fetchAuth("/api/job-cards").then((r) => r.json()),
        fetchAuth("/api/inventory?allParts=true").then((r) => r.json()),
        fetchAuth("/api/inventory").then((r) => r.json()),
      ]);

      const stockMap: Record<number, number> = {};
      (invData.items || []).forEach((i: any) => {
        if (i.part?.id) stockMap[i.part.id] = i.quantity;
      });

      const partsWithStock = (partData.parts || []).map((p: any) => ({
        ...p,
        inStock: stockMap[p.id] || 0,
      }));

      setRequisitions(reqData.requisitions || []);
      setJobCards(jcData.jobCards || []);
      setParts(partsWithStock);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const addItem = () => {
    setNewReq({ ...newReq, items: [...newReq.items, { partId: undefined, customName: "", customPartNumber: "", customCategory: "", quantity: "1", isCustom: false }] });
  };

  const removeItem = (i: number) => {
    setNewReq({ ...newReq, items: newReq.items.filter((_, idx) => idx !== i) });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newReq.items];
    items[index] = { ...items[index], [field]: value };
    setNewReq({ ...newReq, items });
  };

  const toggleCustomMode = (index: number) => {
    const items = [...newReq.items];
    items[index] = {
      ...items[index],
      isCustom: !items[index].isCustom,
      partId: undefined,
      customName: "",
      customPartNumber: "",
      customCategory: "",
    };
    setNewReq({ ...newReq, items });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

      try {
      // Process items: existing parts and custom parts
      const processedItems: any[] = [];
      const failedParts: string[] = [];
      for (const item of newReq.items) {
        if (item.isCustom) {
          if (!item.customName || !item.customPartNumber) continue;
          // Create a new part first
          try {
            const res = await fetchAuth("/api/inventory", {
              method: "POST",
              body: JSON.stringify({
                type: "add-part",
                partNumber: item.customPartNumber,
                partName: item.customName,
                category: item.customCategory || "Custom",
                unit: "piece",
                minStockLevel: 5,
                initialStock: 0,
                branchId: "1",
              }),
            });
            const data = await res.json();
            if (data.success) {
              processedItems.push({ partId: data.partId, quantity: parseInt(item.quantity) });
            } else {
              failedParts.push(`${item.customPartNumber}: ${data.error || "Failed"}`);
            }
          } catch (err) {
            failedParts.push(`${item.customPartNumber}: ${err instanceof Error ? err.message : "Error"}`);
          }
        } else {
          if (item.partId) {
            processedItems.push({ partId: item.partId, quantity: parseInt(item.quantity) });
          }
        }
      }

      if (failedParts.length > 0) {
        alert("⚠️ Some custom parts failed:\n" + failedParts.join("\n"));
      }

      if (processedItems.length === 0) {
        alert("⚠️ Please add at least one part");
        setSubmitting(false);
        return;
      }

      const res = await fetchAuth("/api/requisition", {
        method: "POST",
        body: JSON.stringify({
          type: "parts-requisition",
          jobCardId: parseInt(newReq.jobCardId),
          remarks: newReq.remarks,
          items: processedItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Requisition created! Store executive can now see it.");
        setShowCreate(false);
        setNewReq({ jobCardId: "", remarks: "", items: [{ partId: undefined, customName: "", customPartNumber: "", customCategory: "", quantity: "1", isCustom: false }] });
        loadData();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParts = parts.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.partNumber.toLowerCase().includes(s) || p.partName.toLowerCase().includes(s);
  });

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Parts Requisition</h1>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live sync (10s)
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Requisitions</h2>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">
            + New Requisition
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Req #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Vehicle</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Description</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">By</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requisitions.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{req.requisitionNumber}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{req.vehicle?.registrationNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate hidden md:table-cell">{req.jobCard?.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{req.requestedBy?.fullName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      req.status === "pending" ? "bg-amber-100 text-amber-700" :
                      req.status === "approved" ? "bg-blue-100 text-blue-700" :
                      req.status === "fulfilled" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>{req.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center hidden sm:table-cell">{new Date(req.requestedDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {requisitions.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No requisitions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-slate-900">Create Parts Requisition</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Card *</label>
                <select value={newReq.jobCardId} onChange={(e) => setNewReq({ ...newReq, jobCardId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">Select job card</option>
                  {jobCards.filter((j) => j.status === "open" || j.status === "in_progress").map((jc) => (
                    <option key={jc.id} value={jc.id}>{jc.jobCardNumber} — {jc.vehicle?.registrationNumber}</option>
                  ))}
                </select>
              </div>

              {/* Search Parts */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Existing Parts</label>
                <input
                  type="text"
                  placeholder="🔍 Search by part number or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2"
                />
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Parts to Requisition</label>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700">+ Add Row</button>
                </div>
                <div className="space-y-2">
                  {newReq.items.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Item {index + 1}</span>
                          <button type="button" onClick={() => toggleCustomMode(index)} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {item.isCustom ? "✓ Custom Part" : "Custom Part"}
                          </button>
                        </div>
                        {newReq.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-xs">Remove</button>
                        )}
                      </div>

                      {item.isCustom ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Custom Part Number (e.g. SPEC-001)"
                            value={item.customPartNumber || ""}
                            onChange={(e) => updateItem(index, "customPartNumber", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Part Name (e.g. Special Bearing)"
                            value={item.customName || ""}
                            onChange={(e) => updateItem(index, "customName", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Category (optional)"
                              value={item.customCategory || ""}
                              onChange={(e) => updateItem(index, "customCategory", e.target.value)}
                              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Quantity"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              min="1"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-12 gap-2">
                          <select
                            value={item.partId || ""}
                            onChange={(e) => updateItem(index, "partId", e.target.value ? parseInt(e.target.value) : undefined)}
                            className="col-span-9 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                            required
                          >
                            <option value="">Select part from inventory</option>
                            {filteredParts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.partNumber} — {p.partName} (Stock: {p.inStock || 0})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            min="1"
                            required
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea value={newReq.remarks} onChange={(e) => setNewReq({ ...newReq, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} placeholder="Optional notes..." />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
                💡 Toggle "Custom Part" button to add any part that's not in inventory. It will be added to inventory and then included in your requisition.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50">
                  {submitting ? "Creating..." : "Create Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
