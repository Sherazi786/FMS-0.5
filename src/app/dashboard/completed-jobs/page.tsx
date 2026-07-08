"use client";

import { useEffect, useState } from "react";
import { fetchAuth } from "@/lib/local-auth";

interface JobCard {
  id: number;
  jobCardNumber: string;
  description: string;
  status: string;
  priority: string;
  reportedDate: string;
  startDate: string | null;
  completedDate: string | null;
  vehicle: { registrationNumber: string; make: string; model: string } | null;
  mechanic: { name: string; specialization: string } | null;
  supervisor: { fullName: string } | null;
}

export default function CompletedJobsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [jobDetail, setJobDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    fetchAuth("/api/job-cards?status=completed")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobCards || []);
        setLoading(false);
      });
  };

  const viewJob = async (job: JobCard) => {
    setSelectedJob(job);
    setLoadingDetail(true);
    try {
      const res = await fetchAuth(`/api/job-cards/history?id=${job.id}`).then((r) => r.json());
      setJobDetail(res);
    } catch {
      setJobDetail(null);
    }
    setLoadingDetail(false);
  };

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return j.jobCardNumber.toLowerCase().includes(s) || (j.vehicle?.registrationNumber.toLowerCase().includes(s)) || j.description.toLowerCase().includes(s);
  });

  const totalCost = jobs.length; // Placeholder for cost calculation
  const totalParts = 0; // Will be calculated in detail

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">✅ Completed Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">All completed job cards with full history — Parts Requisition, Issue, PO, GRN, and costs</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-sm text-green-600">Total Completed</div>
          <div className="text-2xl font-bold text-green-900">{jobs.length}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm text-blue-600">This Month</div>
          <div className="text-2xl font-bold text-blue-900">
            {jobs.filter((j) => j.completedDate && new Date(j.completedDate).getMonth() === new Date().getMonth()).length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="text-sm text-purple-600">With Requisitions</div>
          <div className="text-2xl font-bold text-purple-900">{jobs.length}</div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by job number, vehicle, or description..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-96 px-4 py-2 border border-slate-300 rounded-lg"
      />

      {/* Jobs List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Job #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Vehicle</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Issue</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden lg:table-cell">Mechanic</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Completed</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{job.jobCardNumber}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-slate-900">{job.vehicle?.registrationNumber}</div>
                    <div className="text-slate-500 text-xs">{job.vehicle?.make} {job.vehicle?.model}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate hidden md:table-cell">{job.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 hidden lg:table-cell">{job.mechanic?.name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center">
                    {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <button onClick={() => viewJob(job)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200">
                        📋 Full Details
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`⚠️ PERMANENTLY DELETE this COMPLETED job card?\n\nThis will:\n- Remove ${job.jobCardNumber} from database\n- Delete all related requisitions\n- Sync across all users (Saleem, Aqib, Bashir, Adnan)\n\nThis cannot be undone. Continue?`)) {
                            const res = await fetchAuth(`/api/manager-actions?type=job-card&id=${job.id}`, { method: "DELETE" });
                            const data = await res.json();
                            if (data.success) {
                              alert("✅ " + data.message);
                              loadData();
                            } else {
                              alert("❌ " + (data.error || "Failed"));
                            }
                          }
                        }}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No completed jobs yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">📋 Complete Job Details</h2>
                <p className="text-sm text-slate-500">{selectedJob.jobCardNumber} — {selectedJob.vehicle?.registrationNumber}</p>
              </div>
              <button onClick={() => { setSelectedJob(null); setJobDetail(null); }} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Job Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Vehicle</div>
                  <div className="font-medium">{selectedJob.vehicle?.registrationNumber}</div>
                  <div className="text-xs text-slate-500">{selectedJob.vehicle?.make} {selectedJob.vehicle?.model}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Mechanic</div>
                  <div className="font-medium">{selectedJob.mechanic?.name || "Unassigned"}</div>
                  <div className="text-xs text-slate-500">{selectedJob.mechanic?.specialization}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Reported</div>
                  <div className="font-medium">{new Date(selectedJob.reportedDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Completed</div>
                  <div className="font-medium">{selectedJob.completedDate ? new Date(selectedJob.completedDate).toLocaleDateString() : "-"}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Issue Description</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded">{selectedJob.description}</p>
              </div>

              {loadingDetail ? (
                <div className="text-center py-8 text-slate-500">Loading history...</div>
              ) : jobDetail ? (
                <>
                  {/* Parts Requisitions */}
                  {jobDetail.requisitions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <span>📋 Parts Requisitions</span>
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{jobDetail.requisitions.length}</span>
                      </h3>
                      {jobDetail.requisitions.map((req: any) => (
                        <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-medium text-amber-900">{req.requisitionNumber}</span>
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{req.status}</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            {req.items?.map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded">
                                <span>{item.part?.partNumber} — {item.part?.partName}</span>
                                <span className="text-xs">
                                  Req: <span className="font-bold">{item.quantityRequested}</span> | Issued:{" "}
                                  <span className={item.issued ? "text-green-600 font-bold" : "text-amber-600"}>
                                    {item.issued ? `✓ ${item.quantityIssued}` : "Pending"}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Purchase Requisitions */}
                  {jobDetail.purchaseRequisitions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <span>🛒 Purchase Requisitions</span>
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{jobDetail.purchaseRequisitions.length}</span>
                      </h3>
                      {jobDetail.purchaseRequisitions.map((pr: any) => (
                        <div key={pr.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-medium text-purple-900">{pr.prNumber}</span>
                            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{pr.status}</span>
                          </div>
                          <div className="text-xs text-slate-600 mb-2">📝 {pr.remarks}</div>
                          {pr.items?.map((item: any) => (
                            <div key={item.id} className="text-sm bg-white p-2 rounded mb-1">
                              {item.part?.partName} — Qty: {item.quantity}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Purchase Orders */}
                  {jobDetail.purchaseOrders?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <span>📋 Purchase Orders</span>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{jobDetail.purchaseOrders.length}</span>
                      </h3>
                      {jobDetail.purchaseOrders.map((po: any) => (
                        <div key={po.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-medium text-blue-900">{po.poNumber}</span>
                            <span className="font-bold text-blue-900">Rs. {Number(po.totalAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-slate-600">Vendor: {po.vendor?.name} • Status: {po.status}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GRNs */}
                  {jobDetail.grns?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <span>📥 Goods Receipt Notes</span>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{jobDetail.grns.length}</span>
                      </h3>
                      {jobDetail.grns.map((g: any) => (
                        <div key={g.id} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium text-green-900">{g.grnNumber}</span>
                            <span className="text-xs text-slate-600">{new Date(g.receivedDate).toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">By: {g.receivedBy?.fullName}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cost Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">💰 Cost Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Total PO Cost</div>
                        <div className="font-bold text-lg">
                          Rs. {jobDetail.purchaseOrders?.reduce((sum: number, po: any) => sum + Number(po.totalAmount || 0), 0).toLocaleString() || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Parts Issued</div>
                        <div className="font-bold text-lg">
                          {jobDetail.requisitions?.reduce((sum: number, req: any) => sum + (req.items?.filter((i: any) => i.issued).length || 0), 0) || 0} parts
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
