import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import { Phone, PhoneCall, Search, FileText, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Calls() {
  const { user, session, isLoading: authLoading } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCalls = useCallback(async (silent = false) => {
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
  }, [user, session]);

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
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
    if (authLoading) return;
    if (!user || !session) { setLoading(false); setCalls([]); return; }
    void loadCalls();
  }, [authLoading, loadCalls, user, session]);

  useEffect(() => {
    const fn = () => void loadCalls(true);
    window.addEventListener("vitals:invalidate-lists", fn);
    return () => window.removeEventListener("vitals:invalidate-lists", fn);
  }, [loadCalls]);

  const filteredCalls = calls.filter(c =>
    c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    c.agent_name.toLowerCase().includes(search.toLowerCase())
  );

  const decisionBadge = (d: string | undefined) => {
    if (!d) return null;
    const isApproved = d === "approved";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${isApproved ? "bg-quaternary/15 text-foreground border-quaternary/30" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
        {isApproved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {d.charAt(0).toUpperCase() + d.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">Call Logs</h1>
          <p className="mt-1.5 text-muted-foreground font-medium text-sm sm:text-base">
            Stored after each completed call. PDF summary includes symptoms, diagnosis, history and plan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadCalls()}
          className="self-start shrink-0 px-4 py-2.5 rounded-xl border-2 border-border bg-background font-bold text-sm hover:bg-muted transition-colors"
        >
          Refresh list
        </button>
      </div>

      <div className="bg-card border-2 border-border rounded-xl shadow-soft overflow-hidden">
        {/* Search */}
        <div className="p-3 sm:p-4 border-b-2 border-border border-dashed bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by patient or agent name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-12 pl-10 pr-4 bg-input border-2 border-border rounded-lg text-foreground font-bold focus:outline-none focus:border-quaternary transition-all text-sm sm:text-base"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading calls...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="p-12 sm:p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center border-2 border-border mb-4">
              <PhoneCall className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg sm:text-xl font-heading font-bold text-foreground mb-2">No call records found</h3>
            <p className="text-muted-foreground text-sm">Agents have not yet completed any phone check-ins.</p>
          </div>
        ) : (
          <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/10">
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground">Date / Time</th>
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground">Patient</th>
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground hidden lg:table-cell">Agent</th>
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground text-center">Duration</th>
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground text-center">Decision</th>
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground text-center">PDF</th>
                    <th className="p-4 font-heading font-extrabold uppercase tracking-wide text-xs text-foreground text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-border divide-dashed">
                  {filteredCalls.map(call => (
                    <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-foreground">{new Date(call.created_at).toLocaleDateString()}</div>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{new Date(call.created_at).toLocaleTimeString()}</div>
                        {(() => {
                          const t = String(call.transcript || call.vitals_data?.CallTranscript || "").trim();
                          return t
                            ? <div className="text-xs font-bold text-foreground mt-1">Transcript · {t.length.toLocaleString()} chars</div>
                            : <div className="text-xs font-bold text-foreground mt-1">No transcript text</div>;
                        })()}
                      </td>
                      <td className="p-4 font-extrabold text-foreground">{call.patient_name}</td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-quaternary/20 border-2 border-border rounded-full text-xs font-bold">
                          <BotIcon /> {call.agent_name}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-2.5 py-1 font-heading font-extrabold text-xs border-2 border-border rounded bg-background text-muted-foreground">
                          {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {call.vitals_data?.DoctorDecision ? (
                          decisionBadge(call.vitals_data.DoctorDecision)
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => setDecision(call, "approved")} className="px-2.5 py-1 text-xs font-bold border-2 border-border rounded bg-quaternary/15 hover:bg-quaternary/25 transition-colors">✓</button>
                            <button type="button" onClick={() => setDecision(call, "denied")} className="px-2.5 py-1 text-xs font-bold border-2 border-border rounded bg-destructive/10 hover:bg-destructive/15 transition-colors">✕</button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          disabled={!call.vitals_data?.ReportData}
                          onClick={() => downloadReport(call.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold border-2 border-border rounded bg-background disabled:opacity-40 hover:bg-muted transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <Link to={`/dashboard/calls/${call.id}`} className="inline-block px-4 py-2 bg-primary text-white font-heading font-bold rounded-full border-2 border-border hover:-translate-y-0.5 hover:shadow-pop-hover transition-all text-xs whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — hidden on md+ */}
            <div className="md:hidden divide-y-2 divide-border divide-dashed">
              {filteredCalls.map(call => (
                <div key={call.id} className="p-4 space-y-3">
                  {/* Row 1: date + duration */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-foreground text-sm">{new Date(call.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground font-bold mt-0.5">{new Date(call.created_at).toLocaleTimeString()}</div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 font-heading font-extrabold text-xs border-2 border-border rounded bg-muted text-muted-foreground">
                      {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                    </span>
                  </div>
                  {/* Row 2: patient */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Patient</span>
                    <span className="font-extrabold text-foreground text-sm">{call.patient_name}</span>
                  </div>
                  {/* Row 3: agent */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-quaternary/20 border border-border rounded-full text-xs font-bold">
                      <BotIcon /> {call.agent_name}
                    </span>
                    {call.vitals_data?.DoctorDecision && decisionBadge(call.vitals_data.DoctorDecision)}
                  </div>
                  {/* Row 4: transcript info */}
                  {(() => {
                    const t = String(call.transcript || call.vitals_data?.CallTranscript || "").trim();
                    return t
                      ? <div className="text-xs font-bold text-foreground">Transcript · {t.length.toLocaleString()} chars</div>
                      : <div className="text-xs font-bold text-foreground">No transcript text</div>;
                  })()}
                  {/* Row 5: actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!call.vitals_data?.DoctorDecision && (
                      <>
                        <button type="button" onClick={() => setDecision(call, "approved")} className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-quaternary/15 hover:bg-quaternary/25 transition-colors">Approve</button>
                        <button type="button" onClick={() => setDecision(call, "denied")} className="px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-destructive/10 hover:bg-destructive/15 transition-colors">Deny</button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={!call.vitals_data?.ReportData}
                      onClick={() => downloadReport(call.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-2 border-border rounded bg-background disabled:opacity-40 hover:bg-muted transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </button>
                    <Link to={`/dashboard/calls/${call.id}`} className="ml-auto inline-block px-4 py-1.5 bg-primary text-white font-heading font-bold rounded-full border-2 border-border text-xs whitespace-nowrap">
                      View →
                    </Link>
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

const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);
