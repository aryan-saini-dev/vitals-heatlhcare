import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import { Bell, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { safeRender } from "@/lib/renderUtils";


export default function Alerts() {
  const { user, session, isLoading: authLoading } = useAuth();
  const location = useLocation();
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
    if (authLoading) return;
    if (!user || !session) {
      setLoading(false);
      setAlerts([]);
      return;
    }
    void fetchAlerts();
  }, [authLoading, fetchAlerts, user, session]);

  useEffect(() => {
    const fn = () => void fetchAlerts(true);
    window.addEventListener("vitals:invalidate-lists", fn);
    return () => window.removeEventListener("vitals:invalidate-lists", fn);
  }, [fetchAlerts]);

  const markResolved = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const { error } = await supabase.from("alerts").update({ status: 'resolved' }).eq("id", id).eq("docuuid", user.id);
    if (!error) {
       toast.success("Alert marked as resolved.");
       setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
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
    fetchAlerts();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">Triage & Alerts</h1>
           <p className="mt-1.5 text-muted-foreground font-medium text-sm sm:text-base">Real-time flags raised by your AI agents during check-ins.</p>
         </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-card border-2 border-border rounded-xl shadow-soft p-16 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-border mb-6 shadow-soft">
            <Bell className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-3xl font-heading font-extrabold text-foreground mb-3">All clear!</h3>
          <p className="text-muted-foreground font-medium max-w-sm text-lg leading-relaxed">There are no health flags requiring your attention right now.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {alerts.map((alert) => {
             const isFocusedFromCallFlow =
               (location.state as any)?.focusPatientId &&
               (location.state as any)?.focusPatientId === alert.patient_id;
             const isOpen = alert.status === 'open';
             const isHigh = alert.severity === 'high';
             const isValidHigh = isHigh && isOpen;
             const isApproved = alert.status === "approved";
             const isDenied = alert.status === "denied";
             
             // Playful geometric specific active states
             const highlightColor = isValidHigh 
               ? 'bg-primary text-white border-2 border-border shadow-pop -translate-y-1' 
               : isApproved
                 ? 'bg-quaternary/10 text-foreground border-2 border-border shadow-soft'
                 : isDenied
                   ? 'bg-destructive/10 text-foreground border-2 border-border shadow-soft'
               : isOpen 
                 ? 'bg-card text-foreground border-2 border-border shadow-soft'
                 : 'bg-muted/30 text-muted-foreground border-2 border-dashed border-border opacity-70';
                 
             const pillColor = isValidHigh ? 'bg-white text-primary' : 'bg-background text-foreground border-2 border-border';

             return (
              <div
                key={alert.id}
                className={`p-4 sm:p-6 rounded-xl transition-all duration-300 relative overflow-hidden group ${highlightColor} ${isFocusedFromCallFlow ? "ring-4 ring-primary/50" : ""}`}
              >
                
                {isValidHigh && <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>}
                
                <div className="flex flex-col gap-5 sm:gap-6 relative z-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                       <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full shadow-pop ${pillColor}`}>
                         {alert.severity} Priority
                       </span>
                       <span className={`text-xs font-bold uppercase tracking-widest ${isValidHigh ? 'text-white/80' : 'text-muted-foreground'}`}>{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                    
                    <h3 className={`text-xl sm:text-2xl font-heading font-extrabold mb-1.5 tracking-tight ${isValidHigh ? 'text-white' : 'text-foreground'}`}>{alert.alert_type}</h3>
                    
                    <p className={`font-medium text-base ${isValidHigh ? 'text-white/90' : 'text-muted-foreground'}`}>
                      Patient: <Link to={`/dashboard/patients/${alert.patient_id}`} className={`font-bold underline decoration-2 underline-offset-4 ${isValidHigh ? 'hover:text-white' : 'hover:text-accent'}`}>
                        {alert.patient_name}
                      </Link> 
                      &nbsp;&bull;&nbsp; Agent: {alert.agent_name}
                    </p>
                    {alert.call && (
                      <div className="mt-3 space-y-1">
                        <p className={`text-xs font-semibold ${isValidHigh ? 'text-white/90' : 'text-muted-foreground'}`}>
                          Summary: {safeRender(alert.call.vitals_data?.Summary || "N/A")}
                        </p>
                        <p className={`text-xs font-semibold ${isValidHigh ? 'text-white/90' : 'text-muted-foreground'}`}>
                          Diagnosis: {safeRender(alert.call.vitals_data?.Diagnosis || "N/A")}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex items-start sm:items-center justify-start w-full">
                     {isOpen ? (
                       <div className="flex flex-wrap gap-2">
                        {alert.call && (
                          <>
                            <button
                              onClick={(e) => setDecision(alert.call.id, "approved", e)}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 font-bold text-xs rounded-xl border-2 border-border bg-quaternary/15 hover:bg-quaternary/25 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => setDecision(alert.call.id, "denied", e)}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 font-bold text-xs rounded-xl border-2 border-border bg-destructive/10 hover:bg-destructive/15 transition-colors"
                            >
                              Deny
                            </button>
                            <button
                              onClick={(e) => downloadReport(alert.call.id, e)}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 font-bold text-xs rounded-xl border-2 border-border bg-background hover:bg-muted transition-colors"
                            >
                              Download PDF
                            </button>
                            <Link
                              to={`/dashboard/calls/${alert.call.id}`}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 font-bold text-xs rounded-xl border-2 border-border bg-primary text-white"
                            >
                              View Details
                            </Link>
                          </>
                        )}
                        <button 
                          onClick={(e) => markResolved(alert.id, e)}
                          className={`inline-flex items-center justify-center gap-2 h-10 px-3 font-heading font-extrabold text-xs uppercase tracking-wide rounded-xl border-2 transition-all shadow-pop hover:-translate-y-0.5 active:translate-y-0 active:shadow-pop-active ${isValidHigh ? 'bg-white text-primary border-transparent hover:bg-muted' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                        >
                          <CheckCircle2 className="w-4 h-4" strokeWidth={2.5}/> Resolve
                        </button>
                       </div>
                     ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-background border-2 border-border rounded-full text-xs font-bold uppercase text-muted-foreground tracking-widest">
                          <CheckCircle2 className="w-4 h-4" /> {isApproved ? "Approved" : isDenied ? "Denied" : "Resolved"}
                        </span>
                     )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
