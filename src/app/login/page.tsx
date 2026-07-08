"use client";

import { useState, FormEvent } from "react";
import { setToken, setStoredUser } from "@/lib/local-auth";

const DEMO_ACCOUNTS = [
  { user: "supervisor1", name: "Saleem Akhtar", role: "Workshop Supervisor", icon: "🔧" },
  { user: "store1", name: "Aqib Sherazi", role: "Store Executive", icon: "📦" },
  { user: "procurement1", name: "Bashir Ahmad", role: "Procurement", icon: "🛒" },
  { user: "fleetmanager", name: "Hamza Warich", role: "Fleet Manager", icon: "📊" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (u: string, p: string) => {
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u.trim(), password: p }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Invalid server response" };
      }

      if (res.ok && data.success) {
        setToken(data.token);
        setStoredUser(data.user);
        // Use replace to avoid back-button issues
        window.location.replace("/dashboard");
      } else {
        setError(data.error || `Login failed (${res.status})`);
        setLoading(false);
      }
    } catch (err) {
      console.error("Login network error:", err);
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-4xl">🔧</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Workshop Management System</h1>
          <p className="text-slate-400 text-sm">Fleet & Workshop Management</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your username"
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-400 text-center mb-3">
              Quick login (password: <span className="text-slate-300 font-mono">password123</span>)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.user}
                  onClick={() => doLogin(demo.user, "password123")}
                  disabled={loading}
                  className="bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg text-slate-300 transition text-left"
                >
                  <div className="text-sm font-medium flex items-center gap-1">
                    <span>{demo.icon}</span>
                    <span>{demo.name}</span>
                  </div>
                  <div className="text-xs text-slate-500">{demo.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">© Workshop Management System</p>
      </div>
    </div>
  );
}
