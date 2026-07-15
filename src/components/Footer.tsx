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

export default function Footer() {
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
