import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import { Bell, CheckCircle2, FileText, Check, X, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Alerts() {
  const { user, session } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!session) return;
    try {
      if (!silent) setLoading(true);
      const resp = await fetch(apiUrl("/api/alerts"), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to load alerts");
        setAlerts([]); return;
      }
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load alerts");
      setAlerts([]);
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => {
    if (!user || !session) { setLoading(false); setAlerts([]); return; }
    void fetchAlerts();
  }, [fetchAlerts, user, session]);

  useEffect(() => {
    const fn = () => void fetchAlerts(true);
    window.addEventListener("vitals:invalidate-lists", fn);
    return () => window.removeEventListener("vitals:invalidate-lists", fn);
  }, [fetchAlerts]);

  const markResolved = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;
    const { error } = await supabase.from("alerts").update({ status: "Resolved" }).eq("id", id).eq("docuuid", user.id);
    if (!error) {
      toast.success("Alert marked as resolved.");
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
      window.dispatchEvent(new Event("vitals:invalidate-lists"));
    } else { toast.error("Failed to resolve alert"); }
  };

  const setDecision = async (callId: string, decision: "approved" | "denied", e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!session) return;
    const resp = await fetch(apiUrl(`/api/calls/${callId}/decision`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ decision }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) { toast.error(data?.error || "Decision update failed"); return; }
    toast.success(`Report ${decision}.`);
    void fetchAlerts();
  };

  const downloadReport = async (callId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!session) return;
    const resp = await fetch(apiUrl(`/api/calls/${callId}/report/download`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.ok) { const data = await resp.json().catch(() => ({})); toast.error(data?.error || "Download failed"); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `doctor-prescription-report-${callId}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const openAlerts = alerts.filter(a => a.status?.toLowerCase() === "open" || a.status?.toLowerCase() === "active");
  const resolvedAlerts = alerts.filter(a => a.status?.toLowerCase() !== "open" && a.status?.toLowerCase() !== "active");

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header — Crimson / Orange-Red semantic warning gradient ── */}
      <div className="relative rounded-3xl overflow-hidden p-6 md:p-7 bg-gradient-to-br from-destructive to-[oklch(0.68_0.19_40)] shadow-glow">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2 text-[9px] font-bold uppercase tracking-widest text-primary-foreground ring-1 ring-white/25 bg-white/10">
              <AlertTriangle className="w-3.5 h-3.5" /> Clinical Triage
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-primary-foreground tracking-tight">Triage & Alerts</h1>
            <p className="text-sm mt-1 text-primary-foreground/75">
              Real-time priority flags raised by AI monitors during patient sessions.
            </p>
          </div>
          {!loading && (
            <div className="flex gap-3 shrink-0">
              <div className="text-center px-4 py-3 rounded-2xl bg-white/15 border border-white/20">
                <div className="text-2xl font-display font-extrabold text-white">{openAlerts.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/70">Open</div>
              </div>
              <div className="text-center px-4 py-3 rounded-2xl bg-white/10 border border-white/15">
                <div className="text-2xl font-display font-extrabold text-white">{resolvedAlerts.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/70">Resolved</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-10 h-10 border-4 rounded-full animate-spin border-muted border-t-destructive" />
          <p className="text-sm text-muted-foreground font-medium">Loading alerts…</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="relative rounded-3xl overflow-hidden p-14 text-center flex flex-col items-center gap-5 bg-success/5 border border-dashed border-success/30">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-success/10 ring-1 ring-success/20">
            <Bell className="w-8 h-8 text-success" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-foreground mb-1">Inbox Clear</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              No triage alerts or high-risk cases flagged for review. All systems nominal.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const isOpen = alert.status?.toLowerCase() === "open" || alert.status?.toLowerCase() === "active";
            const isHigh = alert.severity?.toLowerCase() === "high";
            const isApproved = alert.status?.toLowerCase() === "approved";
            const isDenied = alert.status?.toLowerCase() === "denied";
            const isResolved = !isOpen && !isApproved && !isDenied;

            return (
              <div
                key={alert.id}
                className="relative rounded-2xl overflow-hidden transition-all bg-card border border-border shadow-card"
                style={{
                  opacity: isResolved ? 0.8 : 1,
                }}
              >
                {/* Severity left bar */}
                {isOpen && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                    style={{ background: isHigh ? "var(--destructive)" : "var(--warning)" }} />
                )}

                <div className="p-5 pl-6 space-y-4">
                  {/* Top row: severity + date */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ring-1"
                      style={
                        isHigh
                          ? { background: "rgba(239,68,68,0.07)", color: "var(--destructive)", border: "1px solid rgba(239,68,68,0.15)" }
                          : { background: "rgba(245,158,11,0.07)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.15)" }
                      }
                    >
                      {alert.severity || "Medium"} Priority
                    </span>
                    {isOpen ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/15">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" /> Open
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-success/10 text-success border border-success/15">
                        {isApproved ? "Approved" : isDenied ? "Denied" : "Resolved"}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-medium ml-auto">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Alert content */}
                  <div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{alert.alert_type}</h3>
                    <p className="text-xs text-muted-foreground">
                      Patient:{" "}
                      <Link to={`/dashboard/patients/${alert.patient_id}`}
                        className="font-semibold text-primary hover:underline underline-offset-2">
                        {alert.patient_name}
                      </Link>
                      {" · "} Agent: {alert.agent_name || "Care Bot"}
                    </p>

                    {alert.call && (
                      <div className="mt-3 p-3.5 rounded-xl space-y-1.5 bg-primary/5 border border-primary/10">
                        <div className="text-xs font-semibold text-foreground">
                          <span className="text-muted-foreground">AI Diagnosis: </span>
                          {alert.call.vitals_data?.Diagnosis || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Symptom Tags: </span>
                          {Array.isArray(alert.call.vitals_data?.Symptom_Tags)
                            ? alert.call.vitals_data.Symptom_Tags.join(", ")
                            : "N/A"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/70">
                    {isOpen ? (
                      <>
                        {alert.call && (
                          <>
                            <button onClick={(e) => setDecision(alert.call.id, "approved", e)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer bg-success/10 text-success ring-1 ring-success/20">
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={(e) => setDecision(alert.call.id, "denied", e)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer bg-destructive/10 text-destructive ring-1 ring-destructive/15">
                              <X className="w-3.5 h-3.5" /> Deny
                            </button>
                            <button onClick={(e) => downloadReport(alert.call.id, e)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer bg-primary/10 text-primary ring-1 ring-primary/15">
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                            <Link to={`/dashboard/calls/${alert.call.id}`}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-bold text-xs transition-all hover:scale-105 cursor-pointer bg-info/10 text-info ring-1 ring-info/15">
                              <FileText className="w-3.5 h-3.5" /> Call Details
                            </Link>
                          </>
                        )}
                        <button onClick={(e) => markResolved(alert.id, e)}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-semibold text-xs transition-all hover:scale-105 cursor-pointer bg-secondary text-muted-foreground ring-1 ring-border">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Mark Resolved
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase text-muted-foreground bg-secondary ring-1 ring-border">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        {isApproved ? "Approved" : isDenied ? "Denied" : "Resolved"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
