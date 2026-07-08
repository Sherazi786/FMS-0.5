"use client";

import { useEffect, useState, FormEvent } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface Staff {
  id: number;
  name: string;
  designation: string;
  phone: string | null;
  email: string | null;
  status: string | null;
  branch: { name: string } | null;
}

interface Branch { id: number; name: string }

export default function StaffListPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [user, setUser] = useState<{ role: string } | null>(null);

  const [newS, setNewS] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    branchId: "",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sRes, bRes] = await Promise.all([
        fetchAuth("/api/vouchers?type=staff").then((r) => r.json()),
        fetchAuth("/api/branches").then((r) => r.json()),
      ]);
      setStaff(sRes.staff || []);
      setBranches(bRes.branches || []);
      if (bRes.branches?.length > 0 && !newS.branchId) {
        setNewS((s) => ({ ...s, branchId: String(bRes.branches[0].id) }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetchAuth("/api/vouchers", {
      method: "POST",
      body: JSON.stringify({ type: "add-staff", ...newS }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.staff.name} added!`);
      setShowAdd(false);
      setNewS({ name: "", designation: "", phone: "", email: "", branchId: branches[0] ? String(branches[0].id) : "" });
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    const res = await fetchAuth("/api/vouchers", {
      method: "POST",
      body: JSON.stringify({ type: "delete-staff", id }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${name} removed`);
      loadData();
    } else {
      alert("❌ Failed");
    }
  };

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.designation.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">👥 Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">Add any staff member with custom designation. All changes sync to Manager's panel.</p>
        </div>
        {user?.role !== "accountant" && (
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">+ Add Staff</button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name or designation..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-96 px-4 py-2 border border-slate-300 rounded-lg"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{s.name}</div>
                <div className="text-sm text-slate-500">{s.designation}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="text-slate-400">
                {s.phone && <div>📞 {s.phone}</div>}
                {s.branch?.name && <div>📍 {s.branch.name}</div>}
              </div>
              <button onClick={() => handleRemove(s.id, s.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">🗑</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">No staff added yet</div>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Staff</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={newS.name} onChange={(e) => setNewS({ ...newS, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Adnan Ali" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation *</label>
                <input type="text" value={newS.designation} onChange={(e) => setNewS({ ...newS, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Accountant / Manager / Helper" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="text" value={newS.phone} onChange={(e) => setNewS({ ...newS, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="+92-300-1234567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={newS.email} onChange={(e) => setNewS({ ...newS, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <select value={newS.branchId} onChange={(e) => setNewS({ ...newS, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
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
