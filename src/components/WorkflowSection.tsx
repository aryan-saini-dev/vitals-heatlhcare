import {
  Phone, Mic, Database, Heart, ThumbsUp, Activity, Shield, Zap, UserCheck, Target
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

export default function WorkflowSection() {
  const steps = [
    { icon: Phone, title: "Voice Call", desc: "Twilio + Vapi initiate a multilingual AI call to the patient.", color: "primary" },
    { icon: Mic, title: "Voice Pipeline", desc: "Deepgram STT → GPT reasoning → ElevenLabs TTS in real time.", color: "info" },
    { icon: Database, title: "RAG Context", desc: "De-identified records grounded with retrieval for zero hallucinations.", color: "warning" },
    { icon: Heart, title: "Risk Evaluation", desc: "Scores risk, suggests dosage changes, escalates urgent cases.", color: "success" },
    { icon: ThumbsUp, title: "Doctor Approval", desc: "One-click approve or deny. AI-generated report is sent to the doctor via WhatsApp and changes are applied instantly.", color: "purple" },
    { icon: Activity, title: "Continuous Monitoring", desc: "Outcomes loop back to refine future patient interactions.", color: "primary" },
  ];

  const dotColor: Record<string, string> = {
    primary: "bg-primary text-primary-foreground ring-primary/20",
    info: "bg-info text-white ring-info/20",
    warning: "bg-[color:var(--warning)] text-white ring-[color:var(--warning)]/20",
    success: "bg-success text-white ring-success/20",
    purple: "bg-[#8b5cf6] text-white ring-[#8b5cf6]/20",
  };

  const textColor: Record<string, string> = {
    primary: "text-primary",
    info: "text-info",
    warning: "text-[color:var(--warning)]",
    success: "text-success",
    purple: "text-[#8b5cf6]",
  };

  return (
    <section id="how" className="relative bg-gradient-hero py-24">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 dot-pattern opacity-40" />
      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeader
          pill="Technical Workflow"
          pillIcon={Zap}
          title="End-to-End"
          accent="Patient Pipeline"
          sub="From a simple voice call to faster, smarter clinical decisions — powered by Agentic AI."
        />

        {/* Horizontal connected timeline (desktop / tablet) */}
        <div className="relative mt-16 hidden md:block">
          {/* Connector track */}
          <div className="absolute left-[5%] right-[5%] top-7 h-[2px] rounded-full bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10" />
          <div className="absolute left-[5%] right-[5%] top-7 h-[2px] rounded-full bg-[linear-gradient(to_right,transparent_50%,oklch(0.52_0.22_255/0.5)_50%)] bg-[length:12px_2px] opacity-60" />

          <ol className="relative grid grid-cols-6 gap-3">
            {steps.map((s, i) => (
              <li key={s.title} className="group relative flex flex-col items-center text-center">
                {/* Node */}
                <div className={`relative z-10 grid h-14 w-14 place-items-center rounded-full ${dotColor[s.color]} shadow-glow ring-8 ring-background transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110`}>
                  <s.icon className="h-6 w-6" strokeWidth={2.2} />
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-background text-[10px] font-bold text-foreground shadow-soft">
                    {i + 1}
                  </span>
                </div>

                {/* Drop line */}
                <div className="mt-2 h-4 w-px bg-gradient-to-b from-border to-transparent" />

                {/* Label card */}
                <div className="w-full rounded-xl border border-border/70 bg-card/80 p-3 shadow-soft backdrop-blur transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-card">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${textColor[s.color]}`}>
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-1 font-display text-sm font-bold leading-tight text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Vertical timeline (mobile) */}
        <ol className="relative mt-12 space-y-5 md:hidden">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-4">
              <div className={`relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full ${dotColor[s.color]} shadow-glow ring-4 ring-background`}>
                <s.icon className="h-5 w-5" strokeWidth={2.2} />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-background text-[10px] font-bold text-foreground shadow-soft">
                  {i + 1}
                </span>
              </div>
              <div className="flex-1 rounded-xl border border-border/70 bg-card/80 p-3 shadow-soft backdrop-blur">
                <div className={`text-[10px] font-semibold uppercase tracking-wider ${textColor[s.color]}`}>Step {String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-0.5 font-display text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-4 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Shield, color: "primary", title: "Secure by Design", desc: "HIPAA compliant & enterprise-grade security" },
            { icon: Zap, color: "success", title: "Real-time Intelligence", desc: "Fast, accurate & context-aware responses" },
            { icon: UserCheck, color: "info", title: "Human-in-the-Loop", desc: "Doctors stay in control, always" },
            { icon: Target, color: "warning", title: "Better Outcomes", desc: "Proactive care that prevents, not reacts" },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${b.color === "primary" ? "bg-primary/10 text-primary" :
                b.color === "success" ? "bg-success/10 text-success" :
                  b.color === "info" ? "bg-info/10 text-info" :
                    "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
                }`}>
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
