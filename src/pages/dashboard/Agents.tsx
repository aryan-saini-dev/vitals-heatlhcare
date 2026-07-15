import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Bot, Fingerprint, ChevronRight } from "lucide-react";

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      if (!user) return;
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("docuuid", user.id)
        .order("created_at", { ascending: false });
      if (data) setAgents(data);
      setLoading(false);
    }
    void fetchAgents();
  }, [user]);

  const colorClasses = [
    { bg: "bg-primary/10", border: "border-primary/20", icon: "text-primary" },
    { bg: "bg-info/10", border: "border-info/20", icon: "text-info" },
    { bg: "bg-success/10", border: "border-success/20", icon: "text-success" },
    { bg: "bg-warning/10", border: "border-warning/20", icon: "text-[color:var(--warning)]" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">AI Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Configure specialized conversational voice monitors to automatically check in with chronic patients.
          </p>
        </div>
        <Link
          to="/dashboard/agents/create"
          className="self-start shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow transition-all hover:scale-[1.03]"
        >
          <Plus className="w-3.5 h-3.5" /> Deploy Agent
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-medium text-sm animate-pulse">
          Loading AI agents...
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-card border border-dashed border-border/80 rounded-3xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 ring-1 ring-primary/20">
            <Bot className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">No Active AI Agents</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            Create a care agent with target instructions to begin automating patient symptom surveys.
          </p>
          <Link
            to="/dashboard/agents/create"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/50 px-5 py-2.5 text-xs font-semibold text-primary backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground"
          >
            Setup First Agent
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, i) => {
            const style = colorClasses[i % colorClasses.length];
            return (
              <article
                key={agent.id}
                className="group relative bg-card border border-border/60 rounded-2xl p-6 shadow-card hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full pointer-events-none`}></div>

                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center ${style.icon} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <h3 className="font-display font-bold text-sm text-foreground truncate">{agent.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                      <Fingerprint className="w-3 h-3 text-primary/60" /> {agent.specialty}
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mb-6">
                  {agent.description}
                </p>

                <div className="pt-4 border-t border-border/50 flex justify-between items-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>ID: {agent.id.substring(0, 8)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Active
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
