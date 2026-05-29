import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Users, Bot, Bell, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: 0, agents: 0, alerts: 0, calls: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      const docuuid = user.id;
      try {
        const [patientsQuery, agentsQuery, alertsQuery, callsQuery] = await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }).eq("docuuid", docuuid),
          supabase.from("agents").select("*", { count: "exact", head: true }).eq("docuuid", docuuid),
          supabase.from("alerts").select("*", { count: "exact", head: true }).eq("docuuid", docuuid).eq("status", "open"),
          supabase.from("calls").select("*", { count: "exact", head: true }).eq("docuuid", docuuid),
        ]);
        setStats({
          patients: patientsQuery.count || 0,
          agents: agentsQuery.count || 0,
          alerts: alertsQuery.count || 0,
          calls: callsQuery.count || 0,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  const handleSeedData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agentData, error: agentErr } = await supabase.from("agents").insert({
        docuuid: user.id,
        name: "VITALS Chronic Care AI AGENT",
        specialty: "Chronic Illness Monitoring",
        description:
          "Initiates casual 5-minute check-in calls to identify subtle symptoms ignored by patients. Cross-references conversation data with patient history to flag early disease progression.",
      }).select().single();
      if (agentErr) throw agentErr;
      const agentId = agentData.id;

      const { data: patientsData, error: patErr } = await supabase.from("patients").insert([
        { docuuid: user.id, assigned_agent_id: agentId, name: "Anita", condition: "Type 2 Diabetes", date_of_birth: "1982-05-14" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "Jude Smith", condition: "Post-Op CABG", date_of_birth: "1958-11-04" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "Penny Lane", condition: "Heart Failure", date_of_birth: "1960-02-14" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "Marcus Thorne", condition: "COPD", date_of_birth: "1951-09-02" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "Sarah Connor", condition: "Hypertension", date_of_birth: "1975-03-22" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "David Bowman", condition: "Atrial Fibrillation", date_of_birth: "1968-12-10" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "Ellen Ripley", condition: "Post-Op Appendectomy", date_of_birth: "1980-07-25" },
        { docuuid: user.id, assigned_agent_id: agentId, name: "James Kirk", condition: "Asthma", date_of_birth: "1990-01-01" },
      ]).select();
      if (patErr) throw patErr;

      const p1 = patientsData[0].id;
      const p2 = patientsData[1].id;

      await supabase.from("alerts").insert([
        { docuuid: user.id, patient_id: p1, agent_id: agentId, alert_type: "HIGH RISK: Stage 3 Kidney Disease Progression", severity: "high", status: "open" },
        { docuuid: user.id, patient_id: p2, agent_id: agentId, alert_type: "Missed Medication check-in", severity: "medium", status: "open" },
      ]);

      await supabase.from("calls").insert([
        {
          docuuid: user.id,
          patient_id: p1,
          agent_id: agentId,
          duration_seconds: 300,
          transcript:
            "Agent: Hi Anita, this is your VITALS care assistant checking in. How have you been feeling lately?\n\nPatient: Oh, I'm perfectly fine! Nothing big to report.\n\nAgent: That's great to hear. Have you noticed any small changes, maybe related to your appetite or energy?\n\nPatient: Actually, my tea tasted quite metallic yesterday. I just assumed the milk had gone bad.\n\nAgent: A metallic taste, especially alongside your Type 2 Diabetes history, is a medical pattern we should note. Have you experienced any fatigue?\n\nPatient: A little more tired than usual, but I thought I was just working too hard.\n\nAgent: Thank you for sharing, Anita. I'm going to tag this and format a symptom report for your doctor.",
          vitals_data: {
            Blood_Sugar: "Unknown - Pending Visit",
            Symptom_Tags: ["Metallic Taste", "Fatigue"],
            AI_Diagnosis_Risk: "Stage 3 Kidney Disease Progression",
            Patient_Status: "HIGH RISK",
          },
        },
        {
          docuuid: user.id,
          patient_id: p2,
          agent_id: agentId,
          duration_seconds: 90,
          transcript:
            "Agent: Hi Jude. Have you safely taken your morning dose of carvedilol?\n\nPatient: No, I actually forgot to pick it up from the pharmacy.\n\nAgent: This is important for your recovery. I've flagged this for your clinical team.",
          vitals_data: {},
        },
      ]);

      window.location.reload();
    } catch (err: any) {
      console.error("SEED RAW ERROR", err);
      const msg = err?.message || err?.details || JSON.stringify(err);
      alert(
        `Supabase Error Saving Data:\n\n${msg}\n\nPlease copy this and send it back to me.`
      );
      setLoading(false);
    }
  };

  const statCards = [
    { name: "Patients", value: stats.patients, icon: Users, color: "bg-tertiary", shadowHover: "hover:shadow-sticker-elevated", link: "/dashboard/patients" },
    { name: "Active Alerts", value: stats.alerts, icon: Bell, color: "bg-secondary", shadowHover: "hover:shadow-sticker-elevated", link: "/dashboard/alerts" },
    { name: "Care Agents", value: stats.agents, icon: Bot, color: "bg-accent", shadowHover: "hover:shadow-sticker-elevated", link: "/dashboard/agents" },
    { name: "Total Calls", value: stats.calls, icon: Phone, color: "bg-quaternary", shadowHover: "hover:shadow-sticker-elevated", link: "/dashboard/calls" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-1.5 text-muted-foreground font-medium text-sm sm:text-base">
            Welcome back. Here is the pulse of your patients today.
          </p>
        </div>
        <button
          onClick={handleSeedData}
          disabled={loading}
          className="self-start shrink-0 px-5 py-2.5 bg-tertiary text-foreground font-heading font-bold uppercase tracking-widest text-xs sm:text-sm rounded-full border-2 border-border shadow-pop hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Demo Data"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, i) => (
          <Link key={stat.name} to={stat.link} className="block group">
            <div
              className={`relative bg-card border-2 border-border rounded-xl p-4 sm:p-6 transition-all duration-300 shadow-soft group-hover:-translate-y-1 group-hover:rotate-[1deg] ${stat.shadowHover}`}
            >
              {/* Icon badge — shifted in so it doesn't clip off small screens */}
              <div
                className={`absolute -top-3 -right-3 w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-full border-2 border-border shadow-pop flex items-center justify-center text-white z-10 animate-wiggle`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 pr-6">
                {stat.name}
              </p>
              {loading ? (
                <div className="h-8 w-12 bg-muted rounded animate-pulse mt-1" />
              ) : (
                <p className="text-4xl sm:text-5xl font-heading font-extrabold text-foreground leading-none">
                  {stat.value}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Decorative divider */}
      <div className="w-full h-6 flex overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-border mx-1.5 mt-3 opacity-50 shrink-0" />
        ))}
      </div>

      {/* Empty state */}
      {stats.patients === 0 && stats.agents === 0 && !loading && (
        <div className="bg-card border-4 border-border border-dashed rounded-xl p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center border-2 border-border mb-4 animate-wiggle">
            <Bot className="w-7 h-7" />
          </div>
          <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground mb-2">
            Looks Empty!
          </h3>
          <p className="text-muted-foreground font-medium max-w-sm text-sm sm:text-base">
            You don't have any patients or agents set up yet. Click the button above to generate
            realistic mock data.
          </p>
        </div>
      )}
    </div>
  );
}
