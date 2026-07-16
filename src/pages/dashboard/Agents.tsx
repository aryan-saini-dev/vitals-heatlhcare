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

  // oklch based layout mappings for visual variety
  const colorClasses = [
    { bg: "bg-primary/10", border: "border-primary/20", icon: "text-primary" },
    { bg: "bg-info/10", border: "border-info/20", icon: "text-info" },
    { bg: "bg-success/10", border: "border-success/20", icon: "text-success" },
  ];

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ── Header Banner — Primary Indigo Gradient ── */}
      <div className="relative rounded-2xl overflow-hidden p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-primary shadow-glow">
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2 text-[9px] font-bold uppercase tracking-widest text-primary-foreground ring-1 ring-white/25 bg-white/10">
            <Bot className="w-3.5 h-3.5" /> Care Agents
          </div>
          <h1 className="text-xl md:text-2xl font-display font-extrabold text-primary-foreground tracking-tight">AI Voice Monitors</h1>
          <p className="text-xs mt-1 text-primary-foreground/75 leading-relaxed max-w-lg">
            Configure specialized conversational monitors to automatically check in with chronic illness patients.
          </p>
        </div>

        <Link
          to="/dashboard/agents/create"
          className="relative z-10 self-start sm:self-center inline-flex items-center gap-1.5 px-4.5 py-2.5 font-semibold rounded-full text-xs transition-all hover:scale-105 cursor-pointer shrink-0 bg-background text-primary shadow-soft"
        >
          <Plus className="w-3.5 h-3.5" /> Deploy Agent
        </Link>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading AI agents…</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center max-w-xl mx-auto flex flex-col items-center shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-1 ring-primary/25">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-display font-bold text-foreground mb-1">No Active AI Agents</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
            Create a care agent with target instructions to begin automating patient symptom surveys.
          </p>
          <Link
            to="/dashboard/agents/create"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:scale-105"
          >
            Setup First Agent
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => {
            const style = colorClasses[i % colorClasses.length];
            return (
              <article
                key={agent.id}
                className="group relative bg-card border border-border rounded-2xl p-5 shadow-card hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-glow transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[160px]"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full pointer-events-none"></div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center ${style.icon} shrink-0 group-hover:scale-105 transition-transform`}>
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="pt-0.5 min-w-0">
                      <h3 className="font-display font-bold text-xs text-foreground truncate">{agent.name}</h3>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                        <Fingerprint className="w-3 h-3 text-primary/60" /> {agent.specialty}
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                <div className="pt-3.5 mt-4 border-t border-border/70 flex justify-between items-center text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>ID: {agent.id.substring(0, 8)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Active Monitoring
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
