import { Link } from "react-router-dom";
import {
  Shield, Phone, Heart, Users, ArrowRight, CheckCircle2, Sparkles
} from "lucide-react";

import heroImage from "@/assets/hero-robot-patient.jpg";

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

export default function HeroSection() {
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
