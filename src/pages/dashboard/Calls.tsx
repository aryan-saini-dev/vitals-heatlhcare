import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import { Phone, Search, FileText, CheckCircle2, XCircle, RefreshCw, Bot, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Calls() {
  const { user, session } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCalls = useCallback(
    async (silent = false) => {
      if (!user || !session) return;
      if (!silent) setLoading(true);
      try {
        const resp = await fetch(apiUrl("/api/calls/list"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          toast.error(typeof data?.error === "string" ? data.error : "Failed to load calls");
          setCalls([]);
          return;
        }
        setCalls(Array.isArray(data.calls) ? data.calls : []);
      } catch {
        toast.error("Failed to load calls");
        setCalls([]);
      } finally {
        setLoading(false);
      }
    },
    [user, session]
  );

  async function downloadReport(callId: string) {
    if (!session) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${callId}/report/download`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "Report download failed");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doctor-report-${callId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report download failed");
    }
  }

  async function setDecision(call: any, decision: "approved" | "denied") {
    if (!session) return;
    try {
      const resp = await fetch(apiUrl(`/api/calls/${call.id}/decision`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Failed to update decision");
      setCalls((prev) =>
        prev.map((c) =>
          c.id === call.id
            ? { ...c, vitals_data: { ...(c.vitals_data || {}), DoctorDecision: decision } }
            : c
        )
      );
      toast.success(`Report ${decision}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decision update failed");
    }
  }

  useEffect(() => {
    if (!user || !session) {
      setLoading(false);
      setCalls([]);
      return;
    }
    void loadCalls();
  }, [loadCalls, user, session]);

  useEffect(() => {
    const fn = () => void loadCalls(true);
    window.addEventListener("vitals:invalidate-lists", fn);
    return () => window.removeEventListener("vitals:invalidate-lists", fn);
  }, [loadCalls]);

  const filteredCalls = calls.filter(
    (c) =>
      c.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.agent_name?.toLowerCase().includes(search.toLowerCase())
  );

  const decisionBadge = (d: string | undefined) => {
    if (!d) return null;
    const isApproved = d.toLowerCase() === "approved";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          isApproved
            ? "bg-success/10 text-success border-success/15"
            : "bg-destructive/10 text-destructive border-destructive/15"
        }`}
      >
        {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
        {d.charAt(0).toUpperCase() + d.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">Call Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Review detailed medical summaries, transcripts, and prescriptions generated from active conversations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCalls()}
          className="self-start shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Container */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-border/50 bg-secondary/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by patient or agent name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-background border border-border/80 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground font-medium text-sm animate-pulse">
            Loading call records...
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center border border-border/60 mb-4 text-muted-foreground">
              <Phone className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-base font-display font-bold text-foreground mb-1.5">No Calls Recorded</h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              No continuous care checks have occurred. You can simulate a live patient voice session.
            </p>
            <Link
              to="/dashboard/calls/simulate"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/50 px-4 py-2 text-xs font-semibold text-primary backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground"
            >
              Simulate First Call
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/15">
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Date / Time</th>
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Patient</th>
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground hidden lg:table-cell">Agent</th>
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Duration</th>
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Decision</th>
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">PDF</th>
                    <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-foreground text-sm">
                          {new Date(call.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                          {new Date(call.created_at).toLocaleTimeString()}
                        </div>
                        {call.transcript && (
                          <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                            Transcript available ({call.transcript.length} chars)
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-bold text-foreground text-sm">{call.patient_name}</td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info/10 text-info border border-info/15">
                          <Bot className="w-3.5 h-3.5" /> {call.agent_name || "Care Agent"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold text-muted-foreground bg-secondary rounded-lg">
                          {call.duration_seconds
                            ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                            : call.duration || "N/A"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {call.vitals_data?.DoctorDecision ? (
                          decisionBadge(call.vitals_data.DoctorDecision)
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => void setDecision(call, "approved")}
                              className="px-2 py-1 text-xs font-bold border border-success/30 rounded-lg bg-success/10 text-success hover:bg-success hover:text-success-foreground transition-all cursor-pointer"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => void setDecision(call, "denied")}
                              className="px-2 py-1 text-xs font-bold border border-destructive/30 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          disabled={!call.vitals_data?.ReportData}
                          onClick={() => void downloadReport(call.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold border border-border/80 rounded-lg bg-secondary disabled:opacity-40 hover:bg-border/60 transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> PDF
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/dashboard/calls/${call.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground rounded-lg font-bold text-xs border border-border/80 hover:border-transparent transition-all whitespace-nowrap cursor-pointer"
                        >
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-border">
              {filteredCalls.map((call) => (
                <div key={call.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-foreground text-sm">
                        {new Date(call.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(call.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold bg-secondary rounded-lg text-muted-foreground">
                      {call.duration_seconds
                        ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                        : call.duration || "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Patient:</span>{" "}
                      <span className="font-bold text-foreground">{call.patient_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agent:</span>{" "}
                      <span className="font-semibold text-foreground truncate block">{call.agent_name || "Care Bot"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <div className="flex gap-2">
                      {call.vitals_data?.DoctorDecision ? (
                        decisionBadge(call.vitals_data.DoctorDecision)
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void setDecision(call, "approved")}
                            className="px-2.5 py-1.5 text-xs font-bold border border-success/30 rounded-lg bg-success/10 text-success cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void setDecision(call, "denied")}
                            className="px-2.5 py-1.5 text-xs font-bold border border-destructive/30 rounded-lg bg-destructive/10 text-destructive cursor-pointer"
                          >
                            Deny
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!call.vitals_data?.ReportData}
                        onClick={() => void downloadReport(call.id)}
                        className="p-1.5 border border-border/80 rounded-lg bg-secondary disabled:opacity-40 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <Link
                        to={`/dashboard/calls/${call.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-foreground rounded-lg font-bold text-xs border border-border/80 cursor-pointer"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
