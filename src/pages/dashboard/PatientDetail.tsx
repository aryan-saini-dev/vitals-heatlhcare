import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, UserCircle, Activity, Phone, AlertCircle } from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
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
        supabase.from("alerts").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(5)
      ]);

      if (patientRes.data) {
        if (patientRes.data.assigned_agent_id) {
           const { data: agData } = await supabase.from("agents").select("name").eq("id", patientRes.data.assigned_agent_id).single();
           patientRes.data.agent_name = agData?.name || "Unknown";
        }
        setPatient(patientRes.data);
      }
      if (callsRes.data) setCalls(callsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      setLoading(false);
    }
    fetchData();
  }, [user, id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading patient profile...</div>;
  if (!patient) return <div className="p-8 text-center text-muted-foreground font-bold">Patient not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/dashboard/patients" className="inline-flex items-center text-muted-foreground hover:text-foreground font-bold transition-colors mb-2">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Patients
      </Link>

      {/* Profile Header */}
      <div className="bg-card border-2 border-border rounded-xl shadow-soft p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent opacity-10 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
        <div className="w-24 h-24 rounded-full bg-secondary border-2 border-border shadow-pop flex items-center justify-center text-white shrink-0 z-10 animate-pop-in">
          <span className="text-4xl font-heading font-extrabold uppercase">{patient.name.charAt(0)}</span>
        </div>
        <div className="text-center md:text-left z-10">
          <h1 className="text-4xl font-heading font-extrabold text-foreground tracking-tight">{patient.name}</h1>
          <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
            <span className="px-3 py-1 bg-quaternary/20 text-foreground border-2 border-border rounded-full text-sm font-bold shadow-pop">
              DOB: {patient.date_of_birth || "Unknown"}
            </span>
            <span className="px-3 py-1 bg-tertiary/20 text-foreground border-2 border-border rounded-full text-sm font-bold shadow-pop">
              Condition: {patient.condition}
            </span>
            <span className="px-3 py-1 bg-accent/20 text-foreground border-2 border-border rounded-full text-sm font-bold shadow-pop">
              Agent: {patient.agent_name || "None"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-card border-2 border-border rounded-xl shadow-soft p-6">
           <h2 className="text-2xl font-heading font-extrabold flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-foreground border-2 border-border shadow-pop"><AlertCircle className="w-5 h-5" /></div>
             Recent Alerts
           </h2>
           {alerts.length === 0 ? (
             <p className="text-muted-foreground font-medium text-center py-8 border-2 border-dashed border-border rounded-lg">No recent alerts recorded.</p>
           ) : (
             <div className="space-y-4">
               {alerts.map(a => (
                 <div key={a.id} className="p-4 border-2 border-border rounded-lg bg-background flex justify-between items-center group hover:border-secondary transition-colors">
                   <div>
                     <p className="font-bold text-foreground text-lg">{a.alert_type}</p>
                     <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{new Date(a.created_at).toLocaleDateString()}</p>
                   </div>
                   <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border-2 border-border ${a.status === 'open' ? 'bg-primary text-white shadow-pop' : 'bg-muted text-muted-foreground'}`}>{a.status}</span>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Recent Calls */}
        <div className="bg-card border-2 border-border rounded-xl shadow-soft p-6">
           <h2 className="text-2xl font-heading font-extrabold flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center text-foreground border-2 border-border shadow-pop"><Phone className="w-5 h-5" /></div>
             Recent Calls
           </h2>
           {calls.length === 0 ? (
             <p className="text-muted-foreground font-medium text-center py-8 border-2 border-dashed border-border rounded-lg">No call history available.</p>
           ) : (
             <div className="space-y-4">
               {calls.map(c => (
                 <Link to={`/dashboard/calls/${c.id}`} key={c.id} className="block p-4 border-2 border-border rounded-lg bg-background hover:-translate-y-1 hover:shadow-pop hover:border-accent transition-all group">
                   <div className="flex justify-between items-center">
                     <div>
                       <p className="font-bold text-foreground text-lg group-hover:text-accent transition-colors">Automated Check-in</p>
                       <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{new Date(c.created_at).toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                       <span className="block text-sm font-bold text-foreground bg-accent/10 px-2 py-1 rounded inline-block">
                         {Math.floor(c.duration_seconds / 60)}m {c.duration_seconds % 60}s
                       </span>
                     </div>
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
