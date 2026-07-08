"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface Mechanic {
  id: number;
  name: string;
  specialization: string | null;
  status: string | null;
  branch: { name: string } | null;
}
interface Branch { id: number; name: string }

export default function StaffPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [user, setUser] = useState<{ role: string } | null>(null);

  const [newMech, setNewMech] = useState({ name: "", specialization: "", branchId: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mData, bData] = await Promise.all([
        fetchAuth("/api/staff?type=mechanics").then((r) => r.json()),
        fetchAuth("/api/branches").then((r) => r.json()),
      ]);
      setMechanics(mData.mechanics || []);
      setBranches(bData.branches || []);
      if (bData.branches?.length > 0 && !newMech.branchId) {
        setNewMech((p) => ({ ...p, branchId: String(bData.branches[0].id) }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/staff", { method: "POST", body: JSON.stringify({ type: "mechanics", ...newMech }) });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.mechanic.name} added!`);
      setShowAdd(false);
      setNewMech({ name: "", specialization: "", branchId: branches[0] ? String(branches[0].id) : "" });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    if (user?.role === "fleet_manager") {
      const res = await fetchAuth(`/api/manager-actions?type=mechanic&id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${name} removed`);
        loadData();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } else {
      alert("Only Fleet Manager can remove mechanics");
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Mechanics & Staff ({mechanics.length})</h1>
        {user?.role === "fleet_manager" && (
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">
            + Add Mechanic
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mechanics.map((m) => (
          <div key={m.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                {m.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{m.name}</div>
                <div className="text-sm text-slate-500">{m.specialization || "General"}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">📍 {m.branch?.name}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{m.status}</span>
                {user?.role === "fleet_manager" && (
                  <button onClick={() => handleRemove(m.id, m.name)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">🗑</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {mechanics.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">No mechanics yet</div>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Mechanic</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={newMech.name} onChange={(e) => setNewMech({ ...newMech, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Ravi Kumar" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation (type any)</label>
                <input type="text" value={newMech.specialization} onChange={(e) => setNewMech({ ...newMech, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Engine Specialist, Senior Mechanic, Helper, Apprentice" />
                <p className="text-xs text-slate-500 mt-1">Type any designation — not restricted to fixed list</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
                <select value={newMech.branchId} onChange={(e) => setNewMech({ ...newMech, branchId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
