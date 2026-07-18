import {
  Users, Linkedin
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

export default function TeamSection() {
  const members = [
    {
      name: "Aryan Saini",
      role: "Team Leader",
      desc: "Leads product vision and strategy to drive impactful healthcare innovation.",
      color: "primary",
      linkedin: "https://www.linkedin.com/in/aryan-saini-o9000/"
    },
    {
      name: "Archee Sinha",
      role: "Member",
      desc: "AI & NLP specialist focused on building intelligent, human-like voice experiences.",
      color: "info",
      linkedin: "https://www.linkedin.com/in/archee-sinha-904695297"
    },
    {
      name: "Aryan Gusain",
      role: "Member",
      desc: "Backend engineer ensuring scalable, reliable & secure healthcare solutions.",
      color: "warning",
      linkedin: "https://www.linkedin.com/in/aryan-gusain-086664295/"
    },
    {
      name: "Darshita Gupta",
      role: "Member",
      desc: "Product & design thinker crafting seamless and intuitive user experiences.",
      color: "success",
      linkedin: "https://www.linkedin.com/in/darshita-gupta-86b458358/"
    },
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
                href={m.linkedin}
                target="_blank"
                rel="noopener noreferrer"
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
