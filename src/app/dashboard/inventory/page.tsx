"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface Part {
  id: number;
  partNumber: string;
  partName: string;
  description: string | null;
  category: string | null;
  unit: string;
  minStockLevel: number;
}

interface InventoryItem {
  id: number;
  quantity: number;
  reservedQuantity: number;
  lastUpdated: string;
  part: Part | null;
  branch: { name: string; code: string } | null;
}

interface Branch { id: number; name: string }
interface AllPart { id: number; partNumber: string; partName: string }

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [partsList, setPartsList] = useState<AllPart[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [user, setUser] = useState<{ role: string; branchId: number | null } | null>(null);

  const [newPart, setNewPart] = useState({
    partNumber: "",
    partName: "",
    description: "",
    category: "",
    unit: "piece",
    minStockLevel: "5",
    branchId: "",
    initialStock: "0",
  });

  const [addStockForm, setAddStockForm] = useState({
    partId: "",
    quantity: "",
    branchId: "",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    loadData();
    loadBranchesAndParts();
  }, [search, lowStockOnly]);

  const loadData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (lowStockOnly) params.set("lowStock", "true");
    fetchAuth(`/api/inventory?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      });
  };

  const loadBranchesAndParts = () => {
    Promise.all([
      fetchAuth("/api/branches").then((r) => r.json()),
      fetchAuth("/api/inventory?allParts=true").then((r) => r.json()),
    ]).then(([bData, pData]) => {
      setBranches(bData.branches || []);
      setPartsList(pData.parts || []);
      if (bData.branches?.length > 0 && !newPart.branchId) {
        setNewPart((p) => ({ ...p, branchId: String(bData.branches[0].id) }));
      }
      if (bData.branches?.length > 0 && !addStockForm.branchId) {
        setAddStockForm((p) => ({ ...p, branchId: String(bData.branches[0].id) }));
      }
    });
  };

  const handleAddPart = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchAuth("/api/inventory", {
        method: "POST",
        body: JSON.stringify({ type: "add-part", ...newPart }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Part ${newPart.partNumber} added successfully!`);
        setShowAddPart(false);
        setNewPart({ partNumber: "", partName: "", description: "", category: "", unit: "piece", minStockLevel: "5", branchId: branches[0] ? String(branches[0].id) : "", initialStock: "0" });
        loadData();
        loadBranchesAndParts();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const handleAddStock = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchAuth("/api/inventory", {
        method: "POST",
        body: JSON.stringify({ type: "add-stock", ...addStockForm }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Stock added successfully!");
        setShowAddStock(false);
        setAddStockForm({ partId: "", quantity: "", branchId: branches[0] ? String(branches[0].id) : "" });
        loadData();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading inventory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">📦 Inventory Management</h1>
        {user?.role !== "accountant" && (
          <div className="flex gap-2">
            <button onClick={() => setShowAddPart(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 text-sm">+ Add Part</button>
            <button onClick={() => setShowAddStock(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 text-sm">+ Add Stock</button>
          </div>
        )}
      </div>
      {user?.role === "accountant" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
          👁️ View-only mode — use search to find parts and check availability
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search by part number, name, or category... (try P007, Oil Filter, Engine)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-4 py-2 rounded-lg border transition ${
            lowStockOnly ? "bg-red-100 border-red-300 text-red-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {lowStockOnly ? "⚠️ Low Stock Only" : "📦 All Items"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Part #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Part Name</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Category</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Quantity</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Min</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden lg:table-cell">Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLow = item.part ? item.quantity <= item.part.minStockLevel : false;
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? "bg-red-50/50" : ""}`}>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{item.part?.partNumber}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.part?.partName}</div>
                      {item.part?.description && <div className="text-xs text-slate-500">{item.part.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell">{item.part?.category}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-bold ${isLow ? "text-red-600" : "text-slate-900"}`}>{item.quantity}</span>
                      <span className="text-xs text-slate-500 ml-1">{item.part?.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-slate-500 hidden sm:table-cell">{item.part?.minStockLevel}</td>
                    <td className="px-6 py-4 text-center">
                      {isLow ? <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">⚠️ Low</span> : <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">In Stock</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">{item.branch?.name}</td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No inventory items</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add New Part</h2>
              <button onClick={() => setShowAddPart(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddPart} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Part Number *</label>
                  <input type="text" value={newPart.partNumber} onChange={(e) => setNewPart({ ...newPart, partNumber: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. ENG-004" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Part Name *</label>
                  <input type="text" value={newPart.partName} onChange={(e) => setNewPart({ ...newPart, partName: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Clutch Plate" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" value={newPart.description} onChange={(e) => setNewPart({ ...newPart, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input type="text" value={newPart.category} onChange={(e) => setNewPart({ ...newPart, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Engine" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <select value={newPart.unit} onChange={(e) => setNewPart({ ...newPart, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="piece">Piece</option>
                    <option value="set">Set</option>
                    <option value="liter">Liter</option>
                    <option value="pack">Pack</option>
                    <option value="kg">KG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock</label>
                  <input type="number" value={newPart.minStockLevel} onChange={(e) => setNewPart({ ...newPart, minStockLevel: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
                  <select value={newPart.branchId} onChange={(e) => setNewPart({ ...newPart, branchId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                  <input type="number" value={newPart.initialStock} onChange={(e) => setNewPart({ ...newPart, initialStock: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" min="0" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddPart(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Add Part</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Stock</h2>
              <button onClick={() => setShowAddStock(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Part *</label>
                <select value={addStockForm.partId} onChange={(e) => setAddStockForm({ ...addStockForm, partId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">Select part</option>
                  {partsList.map((p) => <option key={p.id} value={p.id}>{p.partNumber} — {p.partName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Add *</label>
                <input type="number" value={addStockForm.quantity} onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
                <select value={addStockForm.branchId} onChange={(e) => setAddStockForm({ ...addStockForm, branchId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddStock(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
