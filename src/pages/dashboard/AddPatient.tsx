import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function AddPatient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
    condition: "",
    assigned_agent_id: "",
    phone_number: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAgents() {
      if (!user) return;
      const { data } = await supabase.from("agents").select("id, name").eq("docuuid", user.id);
      if (data) setAgents(data);
    }
    void fetchAgents();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("patients").insert([
      {
        ...formData,
        assigned_agent_id: formData.assigned_agent_id || null,
        docuuid: user.id,
      },
    ]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Patient added successfully!");
      navigate("/dashboard/patients");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <Link
        to="/dashboard/patients"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Patients
      </Link>

      <div className="bg-card border border-border/60 shadow-card rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <h1 className="text-2xl font-display font-extrabold text-foreground mb-6">Add New Patient</h1>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
            <input
              required
              type="text"
              className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</label>
              <input
                type="date"
                className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground transition-all"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Condition</label>
              <input
                required
                type="text"
                className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground transition-all"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="e.g. Hypertension, Diabetes"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Phone Number (E.164 format)</label>
              <input
                type="tel"
                className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium text-foreground transition-all"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="e.g. +917982404800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assign Care Agent</label>
              <div className="relative">
                <select
                  className="w-full h-10 px-4 bg-background border border-border/80 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-xs font-semibold text-foreground cursor-pointer appearance-none"
                  value={formData.assigned_agent_id}
                  onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                >
                  <option value="">-- No Agent (Manual Care) --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-10 px-6 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
