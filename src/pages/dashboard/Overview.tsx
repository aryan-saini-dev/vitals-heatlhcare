import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Users, Bot, Bell, Phone, Sparkles, ArrowRight, Activity, TrendingUp, Zap, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: 0, agents: 0, alerts: 0, calls: 0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const [p, ag, al, c] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("docuuid", user.id),
        supabase.from("agents").select("*", { count: "exact", head: true }).eq("docuuid", user.id),
        supabase.from("alerts").select("*", { count: "exact", head: true }).eq("docuuid", user.id).eq("status", "open"),
        supabase.from("calls").select("*", { count: "exact", head: true }).eq("docuuid", user.id),
      ]);
      setStats({ patients: p.count || 0, agents: ag.count || 0, alerts: al.count || 0, calls: c.count || 0 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchStats(); }, [user]);

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const { data: agentData, error: agentErr } = await supabase.from("agents").insert({
        docuuid: user.id, name: "VITALS Chronic Care AI AGENT", specialty: "Chronic Illness Monitoring",
        description: "Initiates casual 5-minute check-in calls to identify subtle symptoms ignored by patients.",
      }).select().single();
      if (agentErr) throw agentErr;
      const agentId = agentData.id;
      const { data: patsData, error: patErr } = await supabase.from("patients").insert([
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
      const p1 = patsData[0].id, p2 = patsData[1].id;
      await supabase.from("alerts").insert([
        { docuuid: user.id, patient_id: p1, agent_id: agentId, alert_type: "HIGH RISK: Stage 3 Kidney Disease Progression", severity: "High", status: "Open" },
        { docuuid: user.id, patient_id: p2, agent_id: agentId, alert_type: "Missed Medication check-in", severity: "Medium", status: "Open" },
      ]);
      await supabase.from("calls").insert([
        { docuuid: user.id, patient_id: p1, agent_id: agentId, duration_seconds: 300, duration: "5:00", status: "completed", patient_name: "Anita", agent_name: "VITALS Chronic Care AI AGENT", transcript: "Agent: Hi Anita, this is your VITALS care assistant checking in.\n\nPatient: I'm fine, though my tea tasted metallic yesterday.\n\nAgent: A metallic taste alongside Type 2 Diabetes is clinically significant. I'm flagging this for your doctor.", vitals_data: { Symptom_Tags: ["Metallic Taste", "Fatigue"], AI_Diagnosis_Risk: "Stage 3 Kidney Disease Progression", Patient_Status: "HIGH RISK" } },
        { docuuid: user.id, patient_id: p2, agent_id: agentId, duration_seconds: 90, duration: "1:30", status: "completed", patient_name: "Jude Smith", agent_name: "VITALS Chronic Care AI AGENT", transcript: "Agent: Hi Jude, have you taken your morning carvedilol?\n\nPatient: No, I forgot to pick it up.\n\nAgent: I've flagged this for your clinical team.", vitals_data: { Symptom_Tags: ["Missed Medication"], Patient_Status: "NEEDS ATTENTION" } },
      ]);
      await fetchStats();
    } catch (err: any) { alert(`Supabase Error:\n\n${err?.message || JSON.stringify(err)}`); }
    finally { setSeeding(false); }
  };

  // Color scheme - solid high-contrast numbers with vibrant badges
  const statCards = [
    { name: "Total Patients", value: stats.patients, icon: Users,  link: "/dashboard/patients", colorClass: "bg-blue-600/10 text-blue-700",   ringClass: "ring-blue-600/15",   numClass: "text-blue-700 font-black",     badge: "Active",  badgeClass: "bg-blue-100 text-blue-800",     TrendIcon: TrendingUp },
    { name: "Open Alerts",    value: stats.alerts,   icon: Bell,   link: "/dashboard/alerts",   colorClass: "bg-red-600/10 text-red-700",       ringClass: "ring-red-600/15",    numClass: "text-red-700 font-black",      badge: "Urgent",  badgeClass: "bg-red-100 text-red-800",       TrendIcon: Activity },
    { name: "Care Agents",    value: stats.agents,   icon: Bot,    link: "/dashboard/agents",   colorClass: "bg-cyan-600/10 text-cyan-700",     ringClass: "ring-cyan-600/15",   numClass: "text-cyan-700 font-black",     badge: "Online",  badgeClass: "bg-cyan-100 text-cyan-800",     TrendIcon: Zap },
    { name: "Total Calls",    value: stats.calls,    icon: Phone,  link: "/dashboard/calls",    colorClass: "bg-emerald-600/10 text-emerald-700", ringClass: "ring-emerald-600/15", numClass: "text-emerald-700 font-black", badge: "Logged",  badgeClass: "bg-emerald-100 text-emerald-800", TrendIcon: TrendingUp },
  ];

  const quickLinks = [
    { label: "Patients",      sublabel: "Manage patient records",   to: "/dashboard/patients",       colorClass: "bg-primary/10 text-primary",     hoverBg: "group-hover:bg-primary",     emoji: "👥" },
    { label: "Simulate Call", sublabel: "Launch AI check-in agent", to: "/dashboard/calls/simulate", colorClass: "bg-info/10 text-info",           hoverBg: "group-hover:bg-info",         emoji: "📞" },
    { label: "View Alerts",   sublabel: "Review clinical flags",    to: "/dashboard/alerts",         colorClass: "bg-destructive/10 text-destructive", hoverBg: "group-hover:bg-destructive", emoji: "🔔" },
    { label: "Agents",        sublabel: "Configure AI agents",      to: "/dashboard/agents",         colorClass: "bg-success/10 text-success",     hoverBg: "group-hover:bg-success",     emoji: "🤖" },
  ];

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ── Hero Banner — bg-gradient-primary with reduced padding & font-size for compact layout ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 shadow-glow">
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-primary-foreground ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" /> System Active
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-primary-foreground">
              Dashboard Overview
            </h1>
            <p className="max-w-sm text-xs leading-relaxed text-primary-foreground/75">
              Monitor patients, track clinical alerts, and review AI-driven chronic care insights.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end shrink-0">
            <button
              onClick={handleSeedData}
              disabled={loading || seeding}
              className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-[10px] font-semibold text-primary shadow-soft transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              {seeding ? "Generating…" : "Generate Demo Data"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards — with rich high-contrast colors and smaller paddings ── */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {statCards.map(({ name, value, icon: Icon, link, colorClass, ringClass, numClass, badge, badgeClass, TrendIcon }) => (
          <Link key={name} to={link} className="group block">
            <article className="relative rounded-2xl border border-border bg-card p-4.5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/30 flex flex-col gap-2.5">
              <div className="flex items-start justify-between">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ring-1 ${colorClass} ${ringClass}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${badgeClass}`}>
                  {badge}
                </span>
              </div>
              {loading
                ? <div className="h-8 w-14 animate-pulse rounded bg-muted" />
                : <p className={`font-display text-3xl font-extrabold leading-none ${numClass}`}>{value}</p>
              }
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{name}</p>
                <TrendIcon className="h-3 w-3 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/50" />
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* ── Empty state ── */}
      {!loading && stats.patients === 0 && stats.agents === 0 ? (
        <section className="rounded-2xl border border-dashed border-primary/20 bg-accent/30 p-10 text-center flex flex-col items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground mb-1">No Active Data</h3>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              No patients or agents yet. Click <strong>Generate Demo Data</strong> to populate with realistic clinical mock data.
            </p>
          </div>
          <button onClick={handleSeedData} disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">

          {/* Quick Actions */}
          <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <h3 className="font-display font-bold text-xs text-foreground">Quick Actions</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Navigate to key features</p>
              </div>
              <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                <Zap className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2.5">
              {quickLinks.map(({ label, sublabel, to, colorClass, emoji }) => (
                <Link key={to} to={to}
                  className="group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-border bg-secondary/20 p-3.5 transition-all duration-300 hover:border-primary/20 hover:shadow-soft cursor-pointer">
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-primary transition-all duration-500 group-hover:w-full" />
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ring-1 ${colorClass} transition-transform duration-300 group-hover:scale-105`}>
                    <span className="text-sm">{emoji}</span>
                  </div>
                  <span className="font-display font-bold text-xs text-foreground">{label}</span>
                  <span className="text-[9px] text-muted-foreground">{sublabel}</span>
                  <ChevronRight className="absolute bottom-2.5 right-2.5 h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </Link>
              ))}
            </div>
          </section>

          {/* System Health */}
          <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <h3 className="font-display font-bold text-xs text-foreground">System Health</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Live infrastructure status</p>
              </div>
              <div className="grid h-6 w-6 place-items-center rounded-lg bg-success/10 ring-1 ring-success/20">
                <Activity className="h-3 w-3 text-success" />
              </div>
            </div>
            <div className="flex flex-col gap-2 p-3 flex-1">
              {([
                { label: "RAG API Endpoint",   status: "Connected",   cls: "text-success bg-success/10 ring-success/20" },
                { label: "Vapi Voice Engine",  status: "Operational", cls: "text-primary bg-primary/10 ring-primary/15" },
                { label: "Supabase Database",  status: "Online",      cls: "text-info bg-info/10 ring-info/20" },
                { label: "WhatsApp Moderator", status: "Running",     cls: "text-success bg-success/10 ring-success/20" },
              ]).map(({ label, status, cls }) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full animate-pulse ${cls.split(" ")[0].replace("text-", "bg-")}`} />
                    <span className="text-[11px] font-semibold text-foreground">{label}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ring-1 ${cls}`}>
                    {status}
                  </span>
                </div>
              ))}
              <div className="mt-auto pt-2 border-t border-border/60">
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  VITALS uses RAG-grounded AI and NLG pipelines to contact chronic care patients and report directly to clinical dashboards.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
