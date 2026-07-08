"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface User { id: number; role: string; fullName: string; branchName?: string | null }
interface DashboardData {
  openJobs?: number; pendingJobs?: number; pendingParts?: number; mechanicJobs?: any[];
  totalOpenJobs?: number; totalVehicles?: number; totalMechanics?: number; totalUsers?: number;
  pendingPartRequests?: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    fetchAuth("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading dashboard...</div>;
  if (!user) return <div className="text-center py-12 text-red-500">Not authenticated</div>;

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-50 border-blue-200", amber: "bg-amber-50 border-amber-200",
      green: "bg-green-50 border-green-200", red: "bg-red-50 border-red-200", purple: "bg-purple-50 border-purple-200",
    };
    return (
      <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </div>
    );
  };

  if (user.role === "workshop_supervisor") return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Workshop Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Open Job Cards" value={data.openJobs || 0} icon="📋" color="blue" />
        <StatCard title="In Progress" value={data.pendingJobs || 0} icon="🔧" color="amber" />
        <StatCard title="Pending Parts" value={data.pendingParts || 0} icon="⏳" color="red" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200"><h2 className="font-semibold text-slate-900">Mechanic-wise Job Summary</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Mechanic</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Specialization</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Total</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Open</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">In Progress</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Completed</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {(data.mechanicJobs || []).map((m: any, i: number) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{m.mechanicname || "Unassigned"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{m.specialization || "-"}</td>
                  <td className="px-6 py-4 text-sm text-center font-semibold">{m.totaljobs}</td>
                  <td className="px-6 py-4 text-center"><span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{m.openjobs}</span></td>
                  <td className="px-6 py-4 text-center"><span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">{m.inprogressjobs}</span></td>
                  <td className="px-6 py-4 text-center"><span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">{m.completedjobs}</span></td>
                </tr>
              ))}
              {(!data.mechanicJobs || data.mechanicJobs.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No mechanic data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (user.role === "fleet_manager") return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Fleet Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Open Jobs" value={data.totalOpenJobs || 0} icon="📋" color="blue" />
        <StatCard title="Total Vehicles" value={data.totalVehicles || 0} icon="🚛" color="green" />
        <StatCard title="Active Mechanics" value={data.totalMechanics || 0} icon="👷" color="amber" />
        <StatCard title="Total Staff" value={data.totalUsers || 0} icon="👥" color="purple" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Module Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/dashboard/job-cards", icon: "🔧", label: "Workshop", sub: `${data.openJobs || 0} open jobs`, bg: "from-blue-50 to-blue-100", border: "border-blue-200" },
            { href: "/dashboard/inventory", icon: "📦", label: "Inventory", sub: "Stock management", bg: "from-emerald-50 to-emerald-100", border: "border-emerald-200" },
            { href: "/dashboard/purchase-orders", icon: "🛒", label: "Procurement", sub: "Purchase orders", bg: "from-amber-50 to-amber-100", border: "border-amber-200" },
            { href: "/dashboard/reports", icon: "📈", label: "Reports", sub: "Monthly reports", bg: "from-purple-50 to-purple-100", border: "border-purple-200" },
          ].map((m: any) => (
            <a key={m.href} href={m.href} className={`block p-4 bg-gradient-to-br ${m.bg} rounded-xl hover:shadow-md transition border ${m.border}`}>
              <span className="text-2xl mb-2 block">{m.icon}</span>
              <span className="font-medium">{m.label}</span>
              <p className="text-xs opacity-75 mt-1">{m.sub}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  if (user.role === "store_executive") return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Store Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Pending Part Requests" value={data.pendingPartRequests || 0} icon="📝" color="amber" />
        <StatCard title="Low Stock Items" value={0} icon="⚠️" color="red" />
        <StatCard title="Today&apos;s Receive" value={0} icon="📥" color="green" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/dashboard/inventory" className="block p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition">
            <span className="text-2xl mb-2 block">📦</span><span className="font-medium text-blue-900">View Inventory</span>
          </a>
          <a href="/dashboard/parts-issue" className="block p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition">
            <span className="text-2xl mb-2 block">📤</span><span className="font-medium text-amber-900">Issue Parts</span>
          </a>
          <a href="/dashboard/grn" className="block p-4 bg-green-50 rounded-xl hover:bg-green-100 transition">
            <span className="text-2xl mb-2 block">📥</span><span className="font-medium text-green-900">Receive Goods</span>
          </a>
        </div>
      </div>
    </div>
  );

  if (user.role === "procurement_executive") return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Procurement Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Pending Requisitions" value={0} icon="📋" color="amber" />
        <StatCard title="Active POs" value={0} icon="🛒" color="blue" />
        <StatCard title="Pending Deliveries" value={0} icon="🚚" color="purple" />
      </div>
    </div>
  );

  return <div className="text-center py-12">Welcome, {user.fullName}</div>;
}
