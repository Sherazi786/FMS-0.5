"use client";

import { fetchAuth } from "@/lib/local-auth";
import { useEffect, useState, FormEvent } from "react";

interface Vendor {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  rating: string | null;
  status: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [newVendor, setNewVendor] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    fetchAuth("/api/vendors")
      .then((r) => r.json())
      .then((data) => {
        setVendors(data.vendors || []);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetchAuth("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVendor),
    });
    setShowCreate(false);
    setNewVendor({ name: "", contactPerson: "", phone: "", email: "", address: "" });
    window.location.reload();
  };

  const renderStars = (rating: string | null) => {
    const r = parseFloat(rating || "0");
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    return (
      <span className="text-yellow-500">
        {"★".repeat(full)}
        {half ? "½" : ""}
        {"☆".repeat(5 - full - (half ? 1 : 0))}
      </span>
    );
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500"
        >
          + Add Vendor
        </button>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">Total Vendors</div>
          <div className="text-2xl font-bold text-slate-900">{vendors.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">Active Vendors</div>
          <div className="text-2xl font-bold text-green-600">{vendors.filter((v) => v.status === "active").length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">Top Rated (4+)</div>
          <div className="text-2xl font-bold text-yellow-600">{vendors.filter((v) => parseFloat(v.rating || "0") >= 4).length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">Avg Rating</div>
          <div className="text-2xl font-bold text-slate-900">
            {(vendors.reduce((a, v) => a + parseFloat(v.rating || "0"), 0) / (vendors.length || 1)).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Vendor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                vendor.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {vendor.status}
              </span>
            </div>
            <div className="text-yellow-500 text-lg mb-2">{renderStars(vendor.rating)}</div>
            <div className="space-y-1 text-sm text-slate-600">
              {vendor.contactPerson && <p>👤 {vendor.contactPerson}</p>}
              {vendor.phone && <p>📞 {vendor.phone}</p>}
              {vendor.email && <p>📧 {vendor.email}</p>}
              {vendor.address && <p>📍 {vendor.address}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Vendor</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Add Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
