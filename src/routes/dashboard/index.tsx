import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { Users, Bot, Bell, Phone, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: 0, agents: 0, alerts: 0, calls: 0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
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
  };

  useEffect(() => {
    void fetchStats();
  }, [user]);

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
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
        { docuuid: user.id, patient_id: p1, agent_id: agentId, alert_type: "HIGH RISK: Stage 3 Kidney Disease Progression", severity: "High", status: "Open" },
        { docuuid: user.id, patient_id: p2, agent_id: agentId, alert_type: "Missed Medication check-in", severity: "Medium", status: "Open" },
      ]);

      await supabase.from("calls").insert([
        {
          docuuid: user.id,
          patient_id: p1,
          agent_id: agentId,
          duration_seconds: 300,
          duration: "5:00",
          status: "completed",
          patient_name: "Anita",
          agent_name: "VITALS Chronic Care AI AGENT",
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
          duration: "1:30",
          status: "completed",
          patient_name: "Jude Smith",
          agent_name: "VITALS Chronic Care AI AGENT",
          transcript:
            "Agent: Hi Jude. Have you safely taken your morning dose of carvedilol?\n\nPatient: No, I actually forgot to pick it up from the pharmacy.\n\nAgent: This is important for your recovery. I've flagged this for your clinical team.",
          vitals_data: {
            Symptom_Tags: ["Missed Medication"],
            Patient_Status: "NEEDS ATTENTION",
          },
        },
      ]);

      await fetchStats();
    } catch (err: any) {
      console.error("SEED RAW ERROR", err);
      alert(`Supabase Error Saving Data:\n\n${err?.message || JSON.stringify(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  const statCards = [
    { name: "Patients", value: stats.patients, icon: Users, color: "primary", link: "/dashboard/patients" },
    { name: "Active Alerts", value: stats.alerts, icon: Bell, color: "warning", link: "/dashboard/alerts" },
    { name: "Care Agents", value: stats.agents, icon: Bot, color: "info", link: "/dashboard/agents" },
    { name: "Total Calls", value: stats.calls, icon: Phone, color: "success", link: "/dashboard/calls" },
  ];

  const colorStyles: Record<string, { icon: string; text: string; bg: string }> = {
    primary: { icon: "text-primary", text: "text-primary", bg: "bg-primary/10" },
    warning: { icon: "text-[color:var(--warning)]", text: "text-[color:var(--warning)]", bg: "bg-[color:var(--warning)]/10" },
    info: { icon: "text-info", text: "text-info", bg: "bg-info/10" },
    success: { icon: "text-success", text: "text-success", bg: "bg-success/10" },
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Welcome back. Monitor calls, track alerts, and review continuous chronic care updates.
          </p>
        </div>
        <button
          onClick={handleSeedData}
          disabled={loading || seeding}
          className="self-start shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow transition-all hover:scale-[1.03] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {seeding ? "Generating..." : "Generate Demo Data"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const colors = colorStyles[stat.color] || colorStyles.primary;
          return (
            <Link key={stat.name} to={stat.link} className="group block">
              <article className="relative bg-card border border-border/60 rounded-2xl p-6 transition-all duration-300 shadow-card hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    {stat.name}
                  </p>
                  {loading ? (
                    <div className="h-9 w-16 bg-muted rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-3xl font-display font-extrabold text-foreground leading-none mt-1">
                      {stat.value}
                    </p>
                  )}
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${colors.bg} ${colors.icon} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {/* Content Section / Empty States */}
      {!loading && stats.patients === 0 && stats.agents === 0 ? (
        <section className="bg-card border border-dashed border-border/80 rounded-3xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 ring-1 ring-primary/20">
            <Bot className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">No Active Data</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            It looks like you don't have any patients or agents set up yet. Press the "Generate Demo Data" button above to populate the dashboard with realistic clinical mock data.
          </p>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/50 px-6 py-2.5 text-xs font-semibold text-primary backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-card">
            <h3 className="font-display font-bold text-base text-foreground mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/dashboard/patients"
                className="flex flex-col items-start gap-1 p-4 rounded-xl border border-border/60 bg-secondary/50 hover:bg-secondary transition-colors text-left"
              >
                <span className="font-display font-bold text-sm text-foreground">Patients Chart</span>
                <span className="text-[10px] text-muted-foreground">Manage and filter charts</span>
              </Link>
              <Link
                to="/dashboard/calls/simulate"
                className="flex flex-col items-start gap-1 p-4 rounded-xl border border-border/60 bg-secondary/50 hover:bg-secondary transition-colors text-left"
              >
                <span className="font-display font-bold text-sm text-foreground">Simulate Call</span>
                <span className="text-[10px] text-muted-foreground">Trigger active AI agent check-ins</span>
              </Link>
            </div>
          </section>

          {/* System Info */}
          <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-card flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-foreground mb-2">Agent Health Integration</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                VITALS uses RAG-grounded search models and natural language generation pipelines to contact chronic care patients at risk, assessing and reporting symptoms directly to clinical dashboards.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              RAG API Endpoint Connected
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
