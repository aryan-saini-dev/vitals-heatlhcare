import { Link } from "react-router-dom";
import { LogIn, ArrowRight, Sparkles } from "lucide-react";
import vitalsLogo from "@/assets/Vitals-logo.png";

import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkflowSection from "@/components/WorkflowSection";
import ImpactSection from "@/components/ImpactSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";

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
          className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-background px-5 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-glow cursor-pointer"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </nav>
    </header>
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

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar />
      <main>
        <HeroSection />
        <section id="solution" className="sr-only" aria-hidden />
        <FeaturesSection />
        <WorkflowSection />
        <ImpactSection />
        <TeamSection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
