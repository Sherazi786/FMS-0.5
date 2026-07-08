"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getToken, removeToken, setStoredUser, User } from "@/lib/local-auth";

const ROLE_LABELS: Record<string, string> = {
  workshop_supervisor: "Workshop Supervisor",
  store_executive: "Store Executive",
  procurement_executive: "Procurement Executive",
  fleet_manager: "Fleet Manager",
  mechanic: "Mechanic",
  accountant: "Accountant",
};

const ROLE_ICONS: Record<string, string> = {
  workshop_supervisor: "🔧",
  store_executive: "📦",
  procurement_executive: "🛒",
  fleet_manager: "📊",
  mechanic: "⚙️",
  accountant: "💰",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const pathname = usePathname();

  useEffect(() => {
    // ALWAYS fetch fresh user data from server to ensure correct role
    const token = getToken();
    if (!token) {
      removeToken();
      window.location.replace("/login");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user && data.user.id) {
          setUser(data.user);
          setStoredUser(data.user); // Sync localStorage with fresh server data
          setLoading(false);
        } else {
          removeToken();
          window.location.replace("/login");
        }
      })
      .catch(() => {
        removeToken();
        window.location.replace("/login");
      });
  }, []);

  // Global 10s real-time refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (confirm("Sign out?")) {
      removeToken();
      window.location.replace("/login");
    }
  };

  const getNavItems = () => {
    const common = [{ href: "/dashboard", label: "Dashboard", icon: "📊" }];
    const role = user?.role;

    // Strict role check
    if (role === "workshop_supervisor") {
      return [
        ...common,
        { href: "/dashboard/job-cards", label: "Job Cards", icon: "📋" },
        { href: "/dashboard/requisitions", label: "Requisitions", icon: "📝" },
        { href: "/dashboard/vehicles", label: "Vehicles", icon: "🚛" },
        { href: "/dashboard/staff", label: "Mechanics", icon: "👷" },
      ];
    }
    if (role === "store_executive") {
      return [
        ...common,
        { href: "/dashboard/inventory", label: "Inventory", icon: "📦" },
        { href: "/dashboard/parts-issue", label: "Parts Issue", icon: "📤" },
        { href: "/dashboard/lubrication", label: "Lubrication", icon: "🛢️" },
        { href: "/dashboard/grn", label: "GRN / Receive", icon: "📥" },
      ];
    }
    if (role === "procurement_executive") {
      return [
        ...common,
        { href: "/dashboard/purchase-requisitions", label: "Purchase Req", icon: "📋" },
        { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: "🛒" },
        { href: "/dashboard/purchase-records", label: "Records", icon: "📊" },
        { href: "/dashboard/grn", label: "Goods Receipt", icon: "📥" },
        { href: "/dashboard/vendors", label: "Vendors", icon: "🏪" },
        { href: "/dashboard/lubrication", label: "Lubrication", icon: "🛢️" },
      ];
    }
    if (role === "fleet_manager") {
      return [
        ...common,
        { href: "/dashboard/job-cards", label: "Job Cards", icon: "📋" },
        { href: "/dashboard/completed-jobs", label: "Completed Jobs", icon: "✅" },
        { href: "/dashboard/approvals", label: "Approvals", icon: "👍" },
        { href: "/dashboard/inventory", label: "Inventory", icon: "📦" },
        { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: "🛒" },
        { href: "/dashboard/purchase-records", label: "Purchase Records", icon: "📊" },
        { href: "/dashboard/vouchers", label: "Debit Vouchers", icon: "💰" },
        { href: "/dashboard/staff-list", label: "Staff List", icon: "👥" },
        { href: "/dashboard/vehicles", label: "Vehicles", icon: "🚛" },
        { href: "/dashboard/staff", label: "Mechanics", icon: "👷" },
        { href: "/dashboard/lubrication", label: "Lubrication", icon: "🛢️" },
        { href: "/dashboard/reports", label: "Reports", icon: "📈" },
      ];
    }
    if (role === "accountant") {
      return [
        ...common,
        { href: "/dashboard/vouchers", label: "Debit Vouchers", icon: "💰" },
        { href: "/dashboard/purchase-records", label: "Purchase Records", icon: "📊" },
        { href: "/dashboard/job-cards", label: "Job Cards", icon: "📋" },
      ];
    }
    return common;
  };

  const navItems = getNavItems();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🔧</div>
          <p className="text-slate-600">Loading Workshop Management System...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-white transition-all duration-300 flex flex-col fixed h-full z-30`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🔧</span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h2 className="font-bold text-sm whitespace-nowrap">WMS</h2>
                <p className="text-xs text-slate-400 truncate">{user.branchName || "All Branches"}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                pathname === item.href ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
              {user.fullName?.charAt(0) || "U"}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="mt-3 w-full text-left text-xs text-slate-400 hover:text-white flex items-center gap-2 px-1 py-1.5 transition">
            <span>🚪</span>
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-slate-700 transition p-2 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live • {lastUpdate.toLocaleTimeString()}
            </span>
            <span className="text-sm text-slate-500 hidden md:block">
              {ROLE_ICONS[user.role]} {ROLE_LABELS[user.role] || user.role}
            </span>
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {user.branchName || "All"}
            </span>
          </div>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
