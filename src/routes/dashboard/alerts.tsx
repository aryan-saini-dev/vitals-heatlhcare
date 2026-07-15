import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { apiUrl } from "../../lib/api";
import { Bell, CheckCircle2, FileText, Check, X, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/alerts")({
  component: Alerts,
});

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
        console.error("Alerts API error", data);
        toast.error(typeof data?.error === "string" ? data.error : "Failed to load alerts");
        setAlerts([]);
        return;
      }
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load alerts");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!user || !session) {
      setLoading(false);
      setAlerts([]);
      return;
    }
    void fetchAlerts();
  }, [fetchAlerts, user, session]);

  useEffect(() => {
    const fn = () => void fetchAlerts(true);
    window.addEventListener("vitals:invalidate-lists", fn);
    return () => window.removeEventListener("vitals:invalidate-lists", fn);
  }, [fetchAlerts]);

  const markResolved = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const { error } = await supabase.from("alerts").update({ status: "Resolved" }).eq("id", id).eq("docuuid", user.id);
    if (!error) {
      toast.success("Alert marked as resolved.");
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
      window.dispatchEvent(new Event("vitals:invalidate-lists"));
    } else {
      toast.error("Failed to resolve alert");
    }
  };

  const setDecision = async (callId: string, decision: "approved" | "denied", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    const resp = await fetch(apiUrl(`/api/calls/${callId}/decision`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ decision }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      toast.error(data?.error || "Decision update failed");
      return;
    }
    toast.success(`Report ${decision}.`);
    void fetchAlerts();
  };

  const downloadReport = async (callId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    const resp = await fetch(apiUrl(`/api/calls/${callId}/report/download`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      toast.error(data?.error || "Download failed");
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-prescription-report-${callId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">Triage & Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground font-medium">
          Real-time priority flags raised by AI monitors during patient sessions.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-medium text-sm animate-pulse">
          Loading system alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card border border-dashed border-border/80 rounded-3xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center border border-border/60 mb-5 text-muted-foreground">
            <Bell className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">Inbox Clear</h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            There are no triage alerts or high-risk cases flagged for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const isOpen = alert.status?.toLowerCase() === "open" || alert.status?.toLowerCase() === "active";
            const isHigh = alert.severity?.toLowerCase() === "high";
            const isApproved = alert.status?.toLowerCase() === "approved";
            const isDenied = alert.status?.toLowerCase() === "denied";

            let cardStyles = "bg-card border-border/60";
            if (isOpen && isHigh) {
              cardStyles = "bg-gradient-to-br from-destructive/5 via-transparent to-transparent border-destructive/30 ring-1 ring-destructive/15";
            } else if (isApproved) {
              cardStyles = "bg-success/5 border-success/20 opacity-85";
            } else if (isDenied) {
              cardStyles = "bg-destructive/5 border-destructive/20 opacity-85";
            } else if (!isOpen) {
              cardStyles = "bg-secondary/40 border-border/40 opacity-75";
            }

            return (
              <div
                key={alert.id}
                className={`p-6 rounded-2xl border shadow-card transition-all duration-250 relative overflow-hidden ${cardStyles}`}
              >
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${
                        isHigh
                          ? "bg-destructive/10 text-destructive border-destructive/25"
                          : "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      {alert.severity || "Medium"} Priority
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-display font-bold text-foreground mb-1">
                      {alert.alert_type}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Patient:{" "}
                      <Link
                        to="/dashboard/patients/$id"
                        params={{ id: alert.patient_id }}
                        className="font-bold text-foreground hover:underline underline-offset-2"
                      >
                        {alert.patient_name}
                      </Link>{" "}
                      · Monitor Agent: {alert.agent_name || "Care Bot"}
                    </p>

                    {alert.call && (
                      <div className="mt-3 p-3 bg-secondary/30 border border-border/40 rounded-xl space-y-1.5 max-w-2xl">
                        <div className="text-xs font-semibold text-foreground">
                          <span className="text-muted-foreground">AI Diagnosis:</span>{" "}
                          {alert.call.vitals_data?.Diagnosis || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Symptom Tags:</span>{" "}
                          {Array.isArray(alert.call.vitals_data?.Symptom_Tags)
                            ? alert.call.vitals_data.Symptom_Tags.join(", ")
                            : "N/A"}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                    {isOpen ? (
                      <>
                        {alert.call && (
                          <>
                            <button
                              onClick={(e) => setDecision(alert.call.id, "approved", e)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-success/15 hover:bg-success hover:text-success-foreground border border-success/20 rounded-xl font-semibold text-xs text-success transition-all"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={(e) => setDecision(alert.call.id, "denied", e)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-xl font-semibold text-xs text-destructive transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Deny
                            </button>
                            <button
                              onClick={(e) => downloadReport(alert.call.id, e)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-secondary hover:bg-border/60 border border-border/80 rounded-xl font-semibold text-xs text-foreground transition-all"
                            >
                              <Download className="w-3.5 h-3.5" /> Prescription PDF
                            </button>
                            <Link
                              to="/dashboard/calls/$id"
                              params={{ id: alert.call.id }}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded-xl font-semibold text-xs text-primary transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" /> Call Details
                            </Link>
                          </>
                        )}
                        <button
                          onClick={(e) => markResolved(alert.id, e)}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-secondary hover:bg-border/60 border border-border/80 rounded-xl font-semibold text-xs text-foreground transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Mark Resolved
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary border border-border rounded-xl text-[10px] font-bold uppercase text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />{" "}
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
