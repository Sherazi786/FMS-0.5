"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface ReqItem {
  id: number;
  partId: number;
  quantityRequested: number;
  quantityAvailable: number;
  issued: boolean;
  part: { partNumber: string; partName: string; category: string | null } | null;
}

interface Requisition {
  id: number;
  requisitionNumber: string;
  status: string;
  remarks: string | null;
  requestedDate: string;
  jobCard: { jobCardNumber: string; description: string } | null;
  vehicle: { registrationNumber: string } | null;
  requestedBy: { fullName: string } | null;
  items: ReqItem[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", approved: "Approved", rejected: "Rejected", fulfilled: "Fulfilled",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700", rejected: "bg-red-100 text-red-700", fulfilled: "bg-green-100 text-green-700",
};

export default function ApprovalsPage() {
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string; fullName: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    loadData();
  }, []);

  const loadData = () => {
    // Only fetch parts requisitions (job card approvals) for manager
    fetchAuth("/api/approvals?type=pending-job-approvals")
      .then((r) => r.json())
      .then((data) => {
        setReqs(data.requisitions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleAction = async (id: number, action: string) => {
    const res = await fetchAuth("/api/approvals", {
      method: "POST",
      body: JSON.stringify({ type: "parts-requisition", id, action }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Requisition ${action === "approve" ? "approved" : "rejected"}`);
      loadData();
    } else {
      alert("❌ " + (data.error || "Failed"));
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  const pending = reqs.filter((r) => r.status === "pending");
  const processed = reqs.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">✅ Job Card Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Approve parts requisitions from job cards. Purchase Requisitions (PRs) are handled directly by Procurement Executive.
        </p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">{pending.length}</span>
          Pending Approval
        </h2>
        <div className="space-y-4">
          {pending.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium text-blue-600">{req.requisitionNumber}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    {req.jobCard && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        Job: {req.jobCard.jobCardNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">{req.vehicle?.registrationNumber}</span> — by {req.requestedBy?.fullName} • {new Date(req.requestedDate).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-xs font-semibold text-slate-500 uppercase">Parts Requested:</div>
                {req.items.map((item) => {
                  const shortage = item.quantityRequested - (item.quantityAvailable || 0);
                  return (
                    <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg p-3 ${shortage > 0 ? "bg-red-50" : "bg-green-50"}`}>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-900">
                          {item.part?.partNumber} — {item.part?.partName}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Requested: <span className="font-bold">{item.quantityRequested}</span> | In Stock:{" "}
                          <span className={`font-bold ${shortage > 0 ? "text-red-600" : "text-green-600"}`}>
                            {item.quantityAvailable || 0}
                          </span>
                          {shortage > 0 && (
                            <span className="text-red-600 font-bold ml-2">⚠ Short {shortage} (procurement needed)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {req.remarks && <p className="text-xs text-slate-500 italic mb-3">📝 {req.remarks}</p>}

              <div className="flex gap-2 justify-end">
                <button onClick={() => handleAction(req.id, "reject")} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium">
                  ✕ Reject
                </button>
                <button onClick={() => handleAction(req.id, "approve")} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm font-medium">
                  ✓ Approve
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No pending job card approvals</p>
            </div>
          )}
        </div>
      </div>

      {/* Processed History */}
      {processed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Decisions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="divide-y divide-slate-100">
              {processed.slice(0, 10).map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm text-slate-700">{req.requisitionNumber}</span>
                    <span className="text-xs text-slate-500 ml-3">{req.vehicle?.registrationNumber} — {req.jobCard?.jobCardNumber}</span>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
