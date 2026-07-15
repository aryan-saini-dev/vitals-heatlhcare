import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Save, Sparkles } from "lucide-react";

export default function CreateAgent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("agents").insert([
      {
        ...formData,
        docuuid: user.id,
      },
    ]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Agent activated successfully!");
      navigate("/dashboard/agents");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <Link
        to="/dashboard/agents"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Agents
      </Link>

      <div className="bg-card border border-border/60 shadow-card rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-3.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Deploy Care Agent</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Define instructions and specialty contexts for the conversational voice monitor.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agent Name</label>
              <input
                required
                type="text"
                className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. CardioBot"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Specialty Domain</label>
              <input
                required
                type="text"
                className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground transition-all"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="e.g. Chronic Heart Failure"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instructions / Prompt Profile</label>
            <textarea
              required
              className="w-full h-36 p-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground resize-none leading-relaxed transition-all"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what questions the agent should ask. e.g., 'Check if the patient has fluid retention, sudden weight gain (e.g., more than 2 lbs in 24 hours), or severe shortness of breath.'"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-10 px-6 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {loading ? "Deploying..." : "Deploy Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
