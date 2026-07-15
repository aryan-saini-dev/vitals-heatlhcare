import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, Shield, Phone, Brain, FileText, AlertTriangle, CheckCircle2, Clock,
  Mic, Database, Heart, ThumbsUp, Users, Stethoscope, HeartPulse, ArrowRight,
  LogIn, Linkedin, Sparkles, Zap, UserCheck, Target, ChevronRight, Globe
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VITALS — Agentic AI Healthcare Platform" },
      { name: "description", content: "VITALS is a proactive AI system that autonomously monitors chronic patients through human-like voice calls, freeing overburdened healthcare staff." },
      { property: "og:title", content: "VITALS — Agentic AI Healthcare" },
      { property: "og:description", content: "Closing the care gap between staff and patients with agentic AI voice check-ins." },
    ],
  }),
  component: Landing,
});

import heroImage from "@/assets/hero-robot-patient.jpg";
import vitalsLogo from "@/assets/Vitals-logo.png";

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-3 group">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-primary/20 transition-all group-hover:bg-primary/15 group-hover:scale-105">
        <img
          src={vitalsLogo}
          alt="VITALS logo"
          className="h-full w-full object-contain p-0.5"
        />
      </div>
      <div className="leading-tight">
        <div className="font-display text-xl font-extrabold tracking-tight text-foreground">VITALS</div>
        <div className="text-[11px] font-medium tracking-wide text-muted-foreground">AI Healthcare</div>
      </div>
    </a>
  );
}

function Navbar() {
  const links = [
    { label: "Home", href: "#top" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how" },
    { label: "Impact", href: "#impact" },
    { label: "Team", href: "#team" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 glass">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <Logo />
        <ul className="hidden items-center gap-2 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative rounded-md px-4 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-primary
                  after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all hover:after:w-6"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-background px-5 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-glow"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </nav>
    </header>
  );
}

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

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-hero">
      {/* Decorative background layers */}
      <div className="pointer-events-none absolute inset-0 medical-grid opacity-60" />
      <div className="pointer-events-none absolute right-10 top-24 h-40 w-40 dot-pattern opacity-50" />
      <div className="pointer-events-none absolute left-6 bottom-24 h-32 w-32 dot-pattern opacity-40" />
      <div className="pointer-events-none absolute -right-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-info/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-72 w-72 rounded-full bg-primary-glow/10 blur-3xl" />

      {/* Abstract connecting lines (SVG) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.52 0.22 255)" stopOpacity="0.0" />
            <stop offset="50%" stopColor="oklch(0.52 0.22 255)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="oklch(0.52 0.22 255)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d="M0,420 C200,360 360,500 600,420 S1000,300 1440,400" stroke="url(#lineGrad)" strokeWidth="1.2" fill="none" />
        <path d="M0,520 C260,460 420,600 720,500 S1140,400 1440,500" stroke="url(#lineGrad)" strokeWidth="1" fill="none" />
      </svg>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        {/* LEFT */}
        <div className="animate-fade-up">
          <Pill icon={Shield}>AI-Powered Healthcare</Pill>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[4.25rem]">
            Closing the <span className="text-primary">Care Gap</span>
            <br />
            Between Staff &amp; Patients
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            VITALS is a proactive AI system that autonomously monitors chronic patients through
            human-like voice calls, freeing overburdened healthcare staff.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.03] hover:shadow-[0_14px_40px_-10px_oklch(0.52_0.22_255/0.55)]"
            >
              Request a Demo
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-background/70 px-7 py-3.5 text-sm font-semibold text-primary backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground"
            >
              See Dashboard
              <span className="grid h-6 w-6 place-items-center rounded-full border border-primary/30 transition-transform group-hover:translate-x-1 group-hover:border-primary-foreground/40">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> HIPAA Compliant</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> SOC 2 Certified</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Enterprise Ready</span>
          </div>
        </div>

        {/* RIGHT: Image with floating cards */}
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="relative mx-auto aspect-square w-full max-w-xl">
            {/* Soft halo behind image */}
            <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-info/10 to-transparent blur-2xl" />
            {/* Dotted decoration */}
            <div className="absolute right-2 top-8 h-24 w-24 dot-pattern opacity-60" />
            <div className="absolute bottom-12 left-0 h-20 w-20 dot-pattern opacity-50" />

            {/* Hero image */}
            <img
              src={heroImage}
              alt="VITALS AI healthcare robot assisting an elderly patient"
              width={1024}
              height={1024}
              className="relative z-10 h-full w-full rounded-[2rem] object-cover mix-blend-multiply"
            />

            {/* 98% card */}
            <div className="absolute -right-2 top-6 z-20 rounded-2xl border border-border bg-card/95 p-4 shadow-card backdrop-blur animate-float hover:scale-105 transition-transform">
              <div className="flex flex-col items-start gap-1.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display text-3xl font-extrabold text-primary leading-none">98%</div>
                <div className="text-[11px] font-medium text-muted-foreground leading-tight">
                  Successful Check-ins<br />This Month
                </div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                  ↑ 18% from last month
                </div>
              </div>
            </div>

            {/* Voice Check-in card */}
            <div className="absolute bottom-10 left-2 z-20 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur animate-float [animation-delay:0.8s] hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                {/* mini waveform */}
                <div className="flex h-8 items-end gap-0.5">
                  {[6, 12, 18, 10, 22, 14, 8, 16, 10].map((h, i) => (
                    <span key={i} className="w-0.5 rounded-full bg-primary/70" style={{ height: `${h}px`, animation: `float 1.${i}s ease-in-out infinite` }} />
                  ))}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Voice Check-in</div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Active Session
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative border-t border-border/60 bg-background/50 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
          {[
            { icon: Users, value: "10K+", label: "Patients Monitored", sub: "Across 200+ Care Networks" },
            { icon: Phone, value: "2M+", label: "Voice Interactions", sub: "Handled by AI" },
            { icon: Heart, value: "95%", label: "Patient Satisfaction", sub: "Improved Engagement" },
            { icon: Shield, value: "50%", label: "Reduction in Staff Load", sub: "More Time for Critical Care" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 hover-lift rounded-xl p-2">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/15">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <div className="truncate text-xs text-muted-foreground">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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

function Features() {
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

function Pipeline() {
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

function Benefits() {
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

        {/* Dashboard preview — illustrative, NOT a large image */}
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

function Team() {
  const members = [
    { name: "Aryan Saini", role: "Team Leader", desc: "Leads product vision and strategy to drive impactful healthcare innovation.", color: "primary" },
    { name: "Archee Sinha", role: "Member", desc: "AI & NLP specialist focused on building intelligent, human-like voice experiences.", color: "info" },
    { name: "Aryan Gusain", role: "Member", desc: "Backend engineer ensuring scalable, reliable & secure healthcare solutions.", color: "warning" },
    { name: "Darshita Gupta", role: "Member", desc: "Product & design thinker crafting seamless and intuitive user experiences.", color: "success" },
  ];
  const dotMap: Record<string, string> = {
    primary: "bg-primary/15 text-primary ring-primary/30",
    info: "bg-info/15 text-info ring-info/30",
    warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] ring-[color:var(--warning)]/30",
    success: "bg-success/15 text-success ring-success/30",
  };
  const barMap: Record<string, string> = {
    primary: "bg-primary", info: "bg-info", warning: "bg-[color:var(--warning)]", success: "bg-success",
  };
  const badgeMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    warning: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
    success: "bg-success/10 text-success",
  };

  return (
    <section id="team" className="relative bg-gradient-hero py-24">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeader
          pill="Team V.I.T.A.L.S"
          pillIcon={Users}
          title="Meet the"
          accent="Team"
          sub="A passionate team of innovators and healthcare enthusiasts building the future of AI-powered care."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, i) => (
            <article
              key={m.name}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 text-center shadow-card hover-lift"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative mx-auto h-24 w-24">
                <div className={`absolute inset-0 rounded-full ring-2 ${dotMap[m.color]} transition-transform duration-500 group-hover:rotate-180`} style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%, 50% 50%)" }} />
                <div className={`grid h-full w-full place-items-center rounded-full ${dotMap[m.color]} font-display text-4xl font-bold transition-transform group-hover:scale-110`}>
                  {m.name.charAt(0)}
                </div>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">{m.name}</h3>
              <div className={`mx-auto mt-2 h-0.5 w-10 rounded-full ${barMap[m.color]}`} />
              <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${badgeMap[m.color]}`}>
                {m.role}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              <a
                href="#"
                aria-label={`${m.name} on LinkedIn`}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${badgeMap[m.color]} hover:scale-[1.03] hover:shadow-soft`}
              >
                <Linkedin className="h-4 w-4" />
                Connect
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="demo" className="py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center shadow-glow sm:p-14">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <Sparkles className="mx-auto h-8 w-8 text-primary-foreground" />
            <h2 className="mt-4 font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to transform patient care?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85">
              Join leading hospitals using VITALS to deliver proactive, AI-powered chronic care.
            </p>
            <a
              href="#"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary shadow-soft transition-transform hover:scale-105"
            >
              Request a Demo
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <Logo />
        <div className="text-center text-xs text-muted-foreground">
          Agentic AI Healthcare · Team V.I.T.A.L.S · All rights reserved.
        </div>
        <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground">
          <a href="#" className="transition-colors hover:text-primary">Privacy</a>
          <span className="text-border">|</span>
          <a href="#" className="transition-colors hover:text-primary">Terms</a>
          <span className="text-border">|</span>
          <a href="#" className="transition-colors hover:text-primary">Contact</a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <section id="solution" className="sr-only" aria-hidden />
        <Features />
        <Pipeline />
        <Benefits />
        <Team />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
