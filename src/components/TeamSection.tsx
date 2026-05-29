import { GraduationCap } from "lucide-react";

const members = [
  { name: "Aryan Saini", role: "Team Leader" },
  { name: "Darshita Gupta", role: "Member" },
  { name: "Aryan Gusain", role: "Member" },
  { name: "Archee Sinha", role: "Member" },
];

const colors = ["bg-primary", "bg-secondary", "bg-tertiary", "bg-quaternary"];

const TeamSection = () => {
  return (
    <section className="relative py-20 md:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground font-heading font-bold text-sm border-2 border-foreground shadow-pop">
            Team V.I.T.A.L.S
          </span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl">
            Meet the <span className="text-secondary">Team</span>
          </h2>
          <p className="text-muted-foreground text-lg flex items-center justify-center gap-2">
            <GraduationCap className="w-5 h-5" strokeWidth={2.5} />
            V.I.T.A.L.S.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {members.map((member, i) => (
            <div
              key={member.name}
              className="group bg-card border-2 border-foreground rounded-xl p-5 shadow-pop hover:-rotate-1 hover:scale-[1.02] transition-all duration-300 ease-bounce text-center space-y-3"
            >
              <div className={`w-16 h-16 mx-auto ${colors[i]} rounded-full border-2 border-foreground flex items-center justify-center font-heading font-extrabold text-xl text-card group-hover:animate-wiggle`}>
                {member.name.charAt(0)}
              </div>
              <h3 className="font-heading font-bold text-sm">{member.name}</h3>
              <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
