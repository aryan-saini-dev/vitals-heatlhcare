import {
  Users, Stethoscope, HeartPulse, CheckCircle2, Heart, Activity, AlertTriangle, Sparkles
} from "lucide-react";

function Pill({ icon: Icon, children, color = "primary" }: { icon: any; children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10 ring-primary/15",
    success: "text-success bg-success/10 ring-success/20",
    info: "text-info bg-info/10 ring-info/20",
    warning: "text-[color:var(--warning)] bg-[color:var(--warning)]/10 ring-[color:var(--warning)]/20",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ${colorMap[color]}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function SectionHeader({ pill, pillIcon, pillColor, title, accent, sub }: any) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Pill icon={pillIcon} color={pillColor}>{pill}</Pill>
      <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {title} <span className="text-gradient-primary">{accent}</span>
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">{sub}</p>
    </div>
  );
}

export default function ImpactSection() {
  const groups = [
    {
      icon: Users, color: "primary", title: "Nurses & Hospital Staff",
      points: ["Eliminates manual monitoring overload", "Automated repetitive follow-ups reduce burnout", "Real-time alerts for critical situations", "More time for high-value patient care"],
    },
    {
      icon: Stethoscope, color: "info", title: "Doctors",
      points: ["Recovers 80%+ of consultation time", "AI reports help in faster, accurate diagnosis", "Easy dosage change approvals", "Automated appointment scheduling"],
    },
    {
      icon: HeartPulse, color: "success", title: "Chronic Patients",
      points: ["Prevents emergencies via early detection", "Continuous, proactive health support", "Multilingual voice conversations", "Better health outcomes & peace of mind"],
    },
  ];

  const iconBg: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    info: "bg-info text-white",
    success: "bg-success text-white",
  };

  const check: Record<string, string> = {
    primary: "text-primary", info: "text-info", success: "text-success",
  };

  return (
    <section id="impact" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          pill="Impact & Benefits"
          pillIcon={Heart}
          pillColor="info"
          title="Who"
          accent="Benefits?"
          sub="VITALS AI creates measurable impact across your entire care ecosystem."
        />

        {/* Dashboard preview */}
        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> AI Dashboard
            </div>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--warning)]/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Patient Trends", value: "+24%", icon: Activity, color: "primary" },
              { label: "Check-ins", value: "98%", icon: CheckCircle2, color: "success" },
              { label: "High Priority Alerts", value: "3", icon: AlertTriangle, color: "warning" },
              { label: "Satisfaction", value: "4.8/5", icon: Heart, color: "info" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-4 hover-lift">
                <c.icon className={`h-4 w-4 ${c.color === "primary" ? "text-primary" :
                  c.color === "success" ? "text-success" :
                    c.color === "warning" ? "text-[color:var(--warning)]" : "text-info"
                  }`} />
                <div className="mt-2 font-display text-2xl font-bold text-foreground">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {groups.map((g) => (
            <article key={g.title} className="group rounded-2xl border border-border bg-card p-7 shadow-card hover-lift">
              <div className="flex items-center gap-3">
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconBg[g.color]} shadow-soft transition-transform group-hover:rotate-6`}>
                  <g.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">{g.title}</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {g.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${check[g.color]}`} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
