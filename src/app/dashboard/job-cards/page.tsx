"use client";

import { useEffect, useState, FormEvent } from "react";
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
  remarks: string | null;
  vehicle: { registrationNumber: string; make: string; model: string } | null;
  mechanic: { name: string; specialization: string } | null;
  supervisor?: { fullName: string } | null;
}

interface Vehicle { id: number; registrationNumber: string; vehicleType: string; make: string; model: string }
interface Mechanic { id: number; name: string; specialization: string }

const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", pending_parts: "Pending Parts", completed: "Completed", cancelled: "Cancelled",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600", medium: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", pending_parts: "bg-orange-100 text-orange-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showHistory, setShowHistory] = useState<JobCard | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [user, setUser] = useState<{ role: string; fullName: string } | null>(null);

  const [newJob, setNewJob] = useState({ vehicleId: "", mechanicId: "", description: "", priority: "medium", remarks: "" });
  const [newVehicle, setNewVehicle] = useState({ registrationNumber: "", vehicleType: "Bus", make: "", model: "", year: "", branchId: "" });
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  const commonIssues = [
    "Engine overheating", "Brake noise / vibration", "Steering problem", "Electrical fault - no start",
    "Oil leakage", "Suspension making noise", "Tyre wear uneven", "AC not working",
    "Gear shifting problem", "Battery not charging", "Clutch slipping", "Excessive smoke from exhaust",
    "Alternator belt broken", "Radiator leak", "Fuel pump issue",
  ];

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("auth_user") || "{}");
    setUser(u);
    loadData();
  }, [search, statusFilter]);

  const loadData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    Promise.all([
      fetchAuth(`/api/job-cards?${params}`).then((r) => r.json()),
      fetchAuth("/api/vehicles").then((r) => r.json()),
      fetchAuth("/api/staff?type=mechanics").then((r) => r.json()),
      fetchAuth("/api/branches").then((r) => r.json()),
    ]).then(([jcData, vData, mData, bData]) => {
      setJobCards(jcData.jobCards || []);
      setVehicles(vData.vehicles || []);
      setMechanics(mData.mechanics || []);
      const brList = bData.branches || [];
      setBranches(brList);
      if (brList.length > 0 && !newVehicle.branchId) {
        setNewVehicle((v) => ({ ...v, branchId: String(brList[0].id) }));
      }
      setLoading(false);
    });
  };

  const handleCreateJob = async (e: FormEvent) => {
    e.preventDefault();
    await fetchAuth("/api/job-cards", { method: "POST", body: JSON.stringify(newJob) });
    setShowModal(false);
    setNewJob({ vehicleId: "", mechanicId: "", description: "", priority: "medium", remarks: "" });
    loadData();
  };

  const handleAddVehicle = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchAuth("/api/vehicles", { method: "POST", body: JSON.stringify(newVehicle) });
      const data = await res.json();
      if (data.success) {
        setNewJob({ ...newJob, vehicleId: String(data.vehicle.id) });
        setNewVehicle({ registrationNumber: "", vehicleType: "Bus", make: "", model: "", year: "", branchId: branches[0] ? String(branches[0].id) : "" });
        setShowAddVehicle(false);
        const vRes = await fetchAuth("/api/vehicles").then((r) => r.json());
        setVehicles(vRes.vehicles || []);
        alert(`✅ Vehicle ${data.vehicle.registrationNumber} added successfully!`);
      } else {
        alert("❌ " + (data.error || "Failed to add vehicle"));
      }
    } catch (err) {
      alert("❌ Error: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const addIssue = (issue: string) => {
    setNewJob((prev) => ({ ...prev, description: prev.description ? prev.description + "\n• " + issue : "• " + issue }));
  };

  const updateStatus = async (id: number, status: string) => {
    if (status === "cancelled" && user?.role !== "fleet_manager") {
      alert("Only Fleet Manager can cancel");
      return;
    }
    await fetchAuth("/api/job-cards", { method: "PATCH", body: JSON.stringify({ id, status }) });
    loadData();
  };

  const viewHistory = async (job: JobCard) => {
    setShowHistory(job);
    const res = await fetchAuth(`/api/job-cards/history?id=${job.id}`).then((r) => r.json()).catch(() => null);
    setHistoryData(res);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  const isManager = user?.role === "fleet_manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Job Cards</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition flex items-center gap-2">
          <span>+</span> Create Job Card
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Search job cards..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="pending_parts">Pending Parts</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Job #</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Vehicle</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden md:table-cell">Issue</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden lg:table-cell">Mechanic</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Priority</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3 hidden sm:table-cell">Date</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobCards.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">
                    <button onClick={() => viewHistory(job)} className="hover:underline">{job.jobCardNumber}</button>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-slate-900">{job.vehicle?.registrationNumber}</div>
                    <div className="text-slate-500 text-xs">{job.vehicle?.make} {job.vehicle?.model}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate hidden md:table-cell whitespace-pre-line">{job.description}</td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell">
                    <div className="text-slate-900">{job.mechanic?.name || "Unassigned"}</div>
                    <div className="text-slate-500 text-xs">{job.mechanic?.specialization || "-"}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[job.priority]}`}>{job.priority}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center hidden sm:table-cell">{new Date(job.reportedDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      {job.status === "open" && (
                        <button onClick={() => updateStatus(job.id, "in_progress")} className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full hover:bg-amber-200">Start</button>
                      )}
                      {job.status === "in_progress" && (
                        <button onClick={() => updateStatus(job.id, "completed")} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200">Complete</button>
                      )}
                      {job.status === "pending_parts" && <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full">Waiting Parts</span>}
                      {job.status === "completed" && <span className="text-xs text-green-600 font-medium">✓ Done</span>}
                      {job.status === "cancelled" && <span className="text-xs text-red-500">✕ Cancelled</span>}
                      {isManager && job.status !== "cancelled" && (
                        <button onClick={() => { if (confirm("Cancel this job card?")) updateStatus(job.id, "cancelled"); }} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-0.5 rounded-full hover:bg-red-100 mt-1">
                          Cancel
                        </button>
                      )}
                      {isManager && (
                        <button
                          onClick={async () => {
                            if (confirm(`⚠️ PERMANENTLY DELETE this job card?\n\n${job.status === "completed" ? "This is a COMPLETED job card." : "This is an " + job.status.toUpperCase() + " job card."}\n\nThis will:\n- Remove from database completely\n- Delete all related requisitions\n- Sync across all users\n\nContinue?`)) {
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
                          className="text-xs bg-red-600 text-white px-3 py-0.5 rounded-full hover:bg-red-700 mt-1"
                        >
                          🗑 Delete Permanently
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {jobCards.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No job cards found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create Job Card</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Vehicle *</label>
                  <button type="button" onClick={() => setShowAddVehicle(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add New Vehicle</button>
                </div>
                <select value={newJob.vehicleId} onChange={(e) => setNewJob({ ...newJob, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model} ({v.vehicleType})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mechanic</label>
                <select value={newJob.mechanicId} onChange={(e) => setNewJob({ ...newJob, mechanicId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Assign mechanic</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.specialization}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Common Issues (click to add)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {commonIssues.map((issue) => (
                    <button key={issue} type="button" onClick={() => addIssue(issue)} className="text-xs bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition">
                      + {issue}
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Issue Description *</label>
                <textarea value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={4} required placeholder="Describe the issue or click common issues above..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <input type="text" value={newJob.remarks} onChange={(e) => setNewJob({ ...newJob, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Additional notes..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select value={newJob.priority} onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Create Job Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add New Vehicle</h2>
              <button onClick={() => setShowAddVehicle(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number *</label>
                <input type="text" value={newVehicle.registrationNumber}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. KZ-1790" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type *</label>
                <select value={newVehicle.vehicleType} onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
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
                  <input type="text" value={newVehicle.make} onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Toyota" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input type="text" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="HiAce" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input type="number" value={newVehicle.year} onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="2024" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
                <select value={newVehicle.branchId} onChange={(e) => setNewVehicle({ ...newVehicle, branchId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddVehicle(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Add & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Job Card History</h2>
                <p className="text-sm text-slate-500">{showHistory.jobCardNumber} — {showHistory.vehicle?.registrationNumber}</p>
              </div>
              <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              {historyData ? (
                <>
                  {/* Timeline */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">📋 Timeline</h3>
                    <div className="space-y-3 border-l-2 border-blue-200 pl-4">
                      <div className="relative">
                        <div className="absolute -left-[19px] top-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div className="text-sm font-medium">Job Card Created</div>
                        <div className="text-xs text-slate-500">{new Date(showHistory.reportedDate).toLocaleString()} • By {showHistory.supervisor?.fullName || "Workshop Supervisor"}</div>
                      </div>
                      {showHistory.startDate && (
                        <div className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-amber-500 rounded-full"></div>
                          <div className="text-sm font-medium">Started</div>
                          <div className="text-xs text-slate-500">{new Date(showHistory.startDate).toLocaleString()}</div>
                        </div>
                      )}
                      {historyData.requisitions?.map((req: any) => (
                        <div key={req.id} className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-orange-500 rounded-full"></div>
                          <div className="text-sm font-medium">Parts Requisition: {req.requisitionNumber}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(req.requestedDate).toLocaleString()} • Status: {req.status}
                            {req.fulfilledDate && ` • Fulfilled: ${new Date(req.fulfilledDate).toLocaleString()}`}
                          </div>
                        </div>
                      ))}
                      {historyData.purchaseRequisitions?.map((pr: any) => (
                        <div key={pr.id} className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-purple-500 rounded-full"></div>
                          <div className="text-sm font-medium">Purchase Requisition: {pr.prNumber}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(pr.requestedDate).toLocaleString()} • Status: {pr.status} • {pr.remarks}
                          </div>
                        </div>
                      ))}
                      {historyData.purchaseOrders?.map((po: any) => (
                        <div key={po.id} className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-indigo-500 rounded-full"></div>
                          <div className="text-sm font-medium">Purchase Order: {po.poNumber}</div>
                          <div className="text-xs text-slate-500">
                            Vendor: {po.vendor?.name} • Rs. {po.totalAmount} • Status: {po.status}
                          </div>
                        </div>
                      ))}
                      {historyData.grns?.map((g: any) => (
                        <div key={g.id} className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-green-500 rounded-full"></div>
                          <div className="text-sm font-medium">Goods Received: {g.grnNumber}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(g.receivedDate).toLocaleString()} • By {g.receivedBy?.fullName}
                          </div>
                        </div>
                      ))}
                      {showHistory.completedDate && (
                        <div className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-green-700 rounded-full"></div>
                          <div className="text-sm font-medium">Job Completed</div>
                          <div className="text-xs text-slate-500">{new Date(showHistory.completedDate).toLocaleString()}</div>
                        </div>
                      )}
                      {showHistory.status === "cancelled" && (
                        <div className="relative">
                          <div className="absolute -left-[19px] top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="text-sm font-medium">Cancelled</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs text-slate-500">Requisitions</div>
                      <div className="text-lg font-bold">{historyData.requisitions?.length || 0}</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-xs text-slate-500">Purchase Reqs</div>
                      <div className="text-lg font-bold">{historyData.purchaseRequisitions?.length || 0}</div>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded">
                      <div className="text-xs text-slate-500">Purchase Orders</div>
                      <div className="text-lg font-bold">{historyData.purchaseOrders?.length || 0}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-xs text-slate-500">GRNs</div>
                      <div className="text-lg font-bold">{historyData.grns?.length || 0}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-8">Loading history...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
