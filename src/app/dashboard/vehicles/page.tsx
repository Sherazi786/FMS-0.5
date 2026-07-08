"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface Vehicle {
  id: number;
  registrationNumber: string;
  vehicleType: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string | null;
  branchId?: number | null;
  branch: { id?: number; name: string; code: string } | null;
}

interface Branch { id: number; name: string; code: string }

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newV, setNewV] = useState({
    registrationNumber: "",
    vehicleType: "Bus",
    make: "",
    model: "",
    year: "",
    branchId: "",
  });

  useEffect(() => {
    loadData();
  }, [search]);

  const loadData = async () => {
    try {
      const params = search ? `?search=${search}` : "";
      const [vRes, bRes] = await Promise.all([
        fetchAuth(`/api/vehicles${params}`).then((r) => r.json()),
        fetchAuth("/api/branches").then((r) => r.json()),
      ]);
      setVehicles(vRes.vehicles || []);
      setBranches(bRes.branches || []);
      if (bRes.branches?.length > 0 && !newV.branchId) {
        setNewV((v) => ({ ...v, branchId: String(bRes.branches[0].id) }));
      }
      setLoading(false);
    } catch (err) {
      console.error("Load error:", err);
      setLoading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetchAuth("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(newV),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Vehicle ${data.vehicle.registrationNumber} added successfully!`);
        setShowAdd(false);
        setNewV({ registrationNumber: "", vehicleType: "Bus", make: "", model: "", year: "", branchId: branches[0] ? String(branches[0].id) : "" });
        loadData();
      } else {
        alert("❌ " + (data.error || "Failed to add vehicle"));
      }
    } catch (err) {
      alert("❌ Error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, reg: string) => {
    if (!confirm(`Delete vehicle ${reg}?`)) return;
    const res = await fetchAuth(`/api/vehicles?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Vehicle ${reg} deleted`);
      loadData();
    } else {
      alert("❌ " + (data.error || "Delete failed"));
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Vehicles ({vehicles.length})</h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center gap-2">
          <span>+</span> Add Vehicle
        </button>
      </div>

      <input type="text" placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full sm:w-80" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{v.registrationNumber}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{v.status}</span>
            </div>
            <div className="text-lg font-semibold text-slate-900 mb-1">{v.make} {v.model}</div>
            <div className="text-sm text-slate-500 mb-3">{v.vehicleType} • {v.year || "-"}</div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">📍 {v.branch?.name}</div>
              <button onClick={() => handleDelete(v.id, v.registrationNumber)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">🗑 Remove</button>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">No vehicles found</div>}
      </div>

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add New Vehicle</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number *</label>
                <input type="text" value={newV.registrationNumber}
                  onChange={(e) => setNewV({ ...newV, registrationNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. KZ-1790" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type *</label>
                <select value={newV.vehicleType} onChange={(e) => setNewV({ ...newV, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="Bus">Bus</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                  <input type="text" value={newV.make} onChange={(e) => setNewV({ ...newV, make: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Suzuki" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input type="text" value={newV.model} onChange={(e) => setNewV({ ...newV, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Mehran" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input type="number" value={newV.year} onChange={(e) => setNewV({ ...newV, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
                  <select value={newV.branchId} onChange={(e) => setNewV({ ...newV, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50">
                  {submitting ? "Adding..." : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
