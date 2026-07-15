import {
  Phone, Brain, FileText, AlertTriangle, CheckCircle2, Clock, Mic, Globe, Sparkles, Activity, Shield
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

export default function FeaturesSection() {
  const features = [
    { n: "01", icon: Phone, color: "primary", title: "Voice Check-in", desc: "AI calls patients in their preferred language and collects structured symptoms naturally before consultations." },
    { n: "02", icon: Brain, color: "info", title: "Symptom Intelligence", desc: "Context-aware AI asks adaptive follow-up questions to identify clinically relevant symptom patterns." },
    { n: "03", icon: FileText, color: "warning", title: "Medical History", desc: "RAG retrieves reports, medications, and historical records instantly from multiple sources." },
    { n: "04", icon: AlertTriangle, color: "success", title: "Risk Assessment", desc: "AI evaluates severity, prioritizes patients, and recommends escalation based on clinical context." },
    { n: "05", icon: CheckCircle2, color: "primary", title: "Doctor Approval", desc: "Clinicians review AI-generated summaries and approve recommendations with one click." },
    { n: "06", icon: Activity, color: "info", title: "Continuous Monitoring", desc: "VITALS continuously follows up with patients to detect deterioration before emergencies occur." },
  ];

  const colorClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    warning: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
    success: "bg-success/10 text-success",
  };

  const conversation = [
    { who: "VITALS AI", role: "ai", msg: "Hi Sarah, how have you been feeling lately?" },
    { who: "PATIENT", role: "patient", msg: "I've been feeling unusually tired for about two weeks." },
    { who: "VITALS AI", role: "ai", msg: "Have you experienced increased thirst or metallic taste?" },
    { who: "PATIENT", role: "patient", msg: "Yes — both, actually." },
  ];

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          pill="Core Capabilities"
          pillIcon={Shield}
          title="How VITALS"
          accent="Works for You"
          sub="See VITALS in action — from a natural voice check-in to a doctor-ready medical summary."
        />

        {/* ROW 1: Conversation + Summary */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Conversation card */}
          <article className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
            <header className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-foreground">AI Voice Conversation</div>
                  <div className="text-xs text-muted-foreground">Real-time multilingual call</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                Live
              </span>
            </header>

            <div className="flex-1 space-y-3 py-5">
              {conversation.map((c, i) => (
                <div key={i} className={`flex ${c.role === "patient" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${c.role === "ai"
                    ? "rounded-tl-sm bg-primary/8 text-foreground ring-1 ring-primary/15"
                    : "rounded-tr-sm bg-secondary text-foreground ring-1 ring-border"
                    }`}>
                    <div className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${c.role === "ai" ? "text-primary" : "text-muted-foreground"}`}>
                      {c.who}
                    </div>
                    <div className="leading-snug">{c.msg}</div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Voice completed</span>
              <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-info" /> Multilingual</span>
              <span className="inline-flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-primary" /> AI reasoning active</span>
            </footer>
          </article>

          {/* Summary card */}
          <article className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
            <header className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-foreground">AI Medical Summary</div>
                  <div className="text-xs text-muted-foreground">Auto-generated, doctor-ready</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> Draft AI
              </span>
            </header>

            <div className="flex-1 space-y-4 py-5 text-sm">
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Patient</div>
                  <div className="mt-0.5 font-medium text-foreground">Sarah M., 58 · Type 2 Diabetes</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Symptoms</div>
                  <div className="mt-0.5 text-foreground">Fatigue (2 weeks) · Polydipsia · Metallic taste</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--warning)]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Insight</div>
                  <div className="mt-0.5 text-foreground">Possible progression toward Type 3 Diabetes</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recommended</div>
                  <div className="mt-0.5 text-foreground">HbA1c check · Medication review · Lifestyle assessment</div>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-between border-t border-border/70 pt-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Generated in 1.2s</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Ready for Review</span>
            </footer>
          </article>
        </div>

        {/* ROW 2: 2x3 feature grid */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="absolute right-4 top-4 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
                {f.n}
              </span>
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${colorClass[f.color]} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                <f.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="absolute -bottom-1 left-0 h-1 w-0 bg-gradient-primary transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
