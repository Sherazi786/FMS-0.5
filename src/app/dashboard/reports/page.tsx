"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface ReportData {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  totalRevenue: string;
  avgCompletionTime: string;
  topMechanics: { name: string; completed: number }[];
  partsConsumed: { name: string; quantity: number }[];
  monthlyJobs: { month: string; count: number }[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData>({
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    totalRevenue: "0",
    avgCompletionTime: "N/A",
    topMechanics: [],
    partsConsumed: [],
    monthlyJobs: [],
  });
  const [loading, setLoading] = useState(true);
  const [jobCards, setJobCards] = useState<any[]>([]);

  useEffect(() => {
    fetchAuth("/api/job-cards")
      .then((r) => r.json())
      .then((data) => {
        const jobs = data.jobCards || [];
        setJobCards(jobs);

        const completed = jobs.filter((j: any) => j.status === "completed").length;
        const pending = jobs.filter((j: any) => j.status !== "completed" && j.status !== "cancelled").length;

        const mechanics: Record<string, number> = {};
        jobs.forEach((j: any) => {
          if (j.status === "completed" && j.mechanic?.name) {
            mechanics[j.mechanic.name] = (mechanics[j.mechanic.name] || 0) + 1;
          }
        });

        const topMechanics = Object.entries(mechanics)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, completed: count }));

        const monthly: Record<string, number> = {};
        jobs.forEach((j: any) => {
          const d = new Date(j.reportedDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthly[key] = (monthly[key] || 0) + 1;
        });

        const monthlyJobs = Object.entries(monthly)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, count]) => ({ month, count }));

        setReport({
          totalJobs: jobs.length,
          completedJobs: completed,
          pendingJobs: pending,
          totalRevenue: "0",
          avgCompletionTime: "N/A",
          topMechanics,
          partsConsumed: [],
          monthlyJobs,
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="text-sm opacity-90">Total Jobs</div>
          <div className="text-3xl font-bold mt-1">{report.totalJobs}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="text-sm opacity-90">Completed</div>
          <div className="text-3xl font-bold mt-1">{report.completedJobs}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="text-sm opacity-90">Pending</div>
          <div className="text-3xl font-bold mt-1">{report.pendingJobs}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="text-sm opacity-90">Completion Rate</div>
          <div className="text-3xl font-bold mt-1">
            {report.totalJobs > 0 ? Math.round((report.completedJobs / report.totalJobs) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Monthly Job Trends</h2>
          {report.monthlyJobs.length > 0 ? (
            <div className="space-y-3">
              {report.monthlyJobs.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 w-20">{m.month}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((m.count / Math.max(...report.monthlyJobs.map((x) => x.count))) * 100, 100)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{m.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Top Mechanics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Top Mechanics</h2>
          {report.topMechanics.length > 0 ? (
            <div className="space-y-3">
              {report.topMechanics.map((m, i) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-slate-900">{m.name}</span>
                  <span className="text-sm font-semibold text-slate-900">{m.completed} jobs</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Vehicle Downtime Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Vehicle Downtime Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {jobCards.filter((j: any) => j.status === "open" || j.status === "pending_parts").length}
            </div>
            <div className="text-sm text-red-500">Vehicles Awaiting Service</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {jobCards.filter((j: any) => j.status === "in_progress").length}
            </div>
            <div className="text-sm text-amber-500">Vehicles In Workshop</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {jobCards.filter((j: any) => j.status === "completed").length}
            </div>
            <div className="text-sm text-green-500">Vehicles Released</div>
          </div>
        </div>
      </div>
    </div>
  );
}
