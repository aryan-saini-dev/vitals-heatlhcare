import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { ArrowLeft, Activity, Phone, AlertTriangle, Calendar, Brain, Shield } from "lucide-react";

export const Route = createFileRoute("/dashboard/patients/$id")({
  component: PatientDetail,
});

export default function PatientDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;

      const [patientRes, callsRes, alertsRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).eq("docuuid", user.id).single(),
        supabase.from("calls").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(5),
        supabase.from("alerts").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(5),
      ]);

      if (patientRes.data) {
        if (patientRes.data.assigned_agent_id) {
          const { data: agData } = await supabase
            .from("agents")
            .select("name")
            .eq("id", patientRes.data.assigned_agent_id)
            .single();
          patientRes.data.agent_name = agData?.name || "Unknown";
        }
        setPatient(patientRes.data);
      }
      if (callsRes.data) setCalls(callsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      setLoading(false);
    }
    void fetchData();
  }, [user, id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground font-medium text-sm animate-pulse">
        Loading patient profile details...
      </div>
    );
  }
  if (!patient) {
    return <div className="p-12 text-center text-muted-foreground font-semibold text-sm">Patient chart not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-up">
      <Link
        to="/dashboard/patients"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Patients
      </Link>

      {/* Profile Header Card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 z-10">
          <span className="text-3xl font-display font-extrabold uppercase">{patient.name.charAt(0)}</span>
        </div>
        <div className="text-center md:text-left z-10">
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">{patient.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2.5 justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-foreground border border-border/80 rounded-full text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> DOB: {patient.date_of_birth || "Unknown"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/15 rounded-full text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" /> {patient.condition}
            </span>
            {patient.agent_name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-info/10 text-info border border-info/15 rounded-full text-xs font-semibold">
                <Brain className="w-3.5 h-3.5" /> Agent: {patient.agent_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-card p-6">
          <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-[color:var(--warning)]" />
            Recent Diagnostic Alerts
          </h2>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/80 rounded-xl bg-secondary/15">
              No recent alerts recorded.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="p-4 border border-border/60 rounded-xl bg-background flex justify-between items-center group hover:border-primary/20 transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-bold text-foreground text-sm truncate">{a.alert_type}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                      a.status?.toLowerCase() === "open" || a.status?.toLowerCase() === "active"
                        ? "bg-destructive/10 text-destructive border-destructive/25"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-card p-6">
          <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-primary" />
            Check-in History
          </h2>
          {calls.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/80 rounded-xl bg-secondary/15">
              No call history available.
            </p>
          ) : (
            <div className="space-y-3">
              {calls.map((c) => (
                <Link
                  to="/dashboard/calls/$id"
                  params={{ id: c.id }}
                  key={c.id}
                  className="block p-4 border border-border/60 rounded-xl bg-background hover:border-primary/30 transition-all group"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                        Automated AI Check-in
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg">
                      {c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : c.duration || "N/A"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
