import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Bot, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      if (!user) return;
      const { data } = await supabase.from("agents").select("*").eq("docuuid", user.id).order("created_at", { ascending: false });
      if (data) setAgents(data);
      setLoading(false);
    }
    fetchAgents();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h1 className="text-4xl font-heading font-extrabold text-foreground tracking-tight">AI Agents</h1>
           <p className="mt-2 text-muted-foreground font-medium">Configure specialized conversational monitors.</p>
         </div>
         <Link to="/dashboard/agents/create" className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-accent text-white font-heading font-bold rounded-full border-2 border-border shadow-pop hover:-translate-y-1 hover:-translate-x-1 hover:shadow-pop-hover active:translate-y-1 active:translate-x-1 active:shadow-pop-active transition-all whitespace-nowrap">
            <Plus className="w-5 h-5" strokeWidth={2.5}/> New Agent
         </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="bg-card border-2 border-border rounded-xl shadow-soft p-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center border-2 border-border mb-4">
            <Bot className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-2xl font-heading font-extrabold text-foreground mb-2">No AI Agents Active</h3>
          <p className="text-muted-foreground font-medium max-w-sm mb-6">Create an agent to begin automating routine patient check-ins and vitals extraction.</p>
          <Link to="/dashboard/agents/create" className="text-accent hover:text-secondary font-bold underline transition-colors">Setup first agent -&gt;</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, i) => {
             // Rotate colors
             const colors = ["bg-accent", "bg-tertiary", "bg-secondary", "bg-quaternary"];
             const highlight = colors[i % colors.length];

             return (
              <div key={agent.id} className="relative bg-card border-2 border-border rounded-xl p-6 shadow-soft group hover:-translate-y-1 hover:rotate-[1deg] hover:shadow-sticker-elevated transition-all duration-300">
                <div className={`absolute top-0 right-0 w-24 h-24 ${highlight} opacity-10 rounded-bl-full pointer-events-none`}></div>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-full ${highlight} border-2 border-border shadow-pop flex items-center justify-center text-white shrink-0 group-hover:animate-wiggle`}>
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-heading font-extrabold text-foreground line-clamp-1">{agent.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      <Fingerprint className="w-3 h-3" /> {agent.specialty}
                    </span>
                  </div>
                </div>

                <p className="text-foreground font-medium text-sm line-clamp-3 mb-6 relative z-10 leading-relaxed">{agent.description}</p>
                
                <div className="pt-4 border-t-2 border-border border-dashed flex justify-between items-center relative z-10">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ID: {agent.id.substring(0,8)}</span>
                   <button className="text-accent font-bold hover:text-secondary transition-colors underline decoration-2 underline-offset-4">Edit</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
