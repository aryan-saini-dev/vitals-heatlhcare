import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Sparkles } from "lucide-react";

export default function CreateAgent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    const { error } = await supabase.from("agents").insert([{
      ...formData,
      docuuid: user.id
    }]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Agent activated successfully!");
      navigate("/dashboard/agents");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/dashboard/agents" className="inline-flex items-center text-muted-foreground hover:text-foreground font-bold transition-colors mb-4">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Agents
      </Link>

      <div className="bg-card border-2 border-border shadow-soft rounded-xl p-6 md:p-10 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-accent rounded-full mix-blend-multiply opacity-10 blur-3xl pointer-events-none"></div>
         <div className="absolute top-10 right-10 w-20 h-20 bg-secondary blob-radius mix-blend-multiply opacity-20 blur-xl pointer-events-none"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-10">
           <div className="w-16 h-16 rounded-full bg-accent border-2 border-border shadow-pop flex items-center justify-center text-white shrink-0 animate-wiggle">
             <Sparkles className="w-7 h-7" />
           </div>
           <div>
             <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Configure New Agent</h1>
             <p className="text-muted-foreground font-medium mt-1">Define the specialty and persona of this AI monitor.</p>
           </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Agent Name</label>
               <input required type="text" className="w-full h-14 px-4 bg-input border-2 border-border rounded-lg focus:outline-none focus:border-accent focus:shadow-pop transition-all font-bold text-foreground text-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dr. CardioBot" />
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Specialty Domain</label>
               <input required type="text" className="w-full h-14 px-4 bg-input border-2 border-border rounded-lg focus:outline-none focus:border-tertiary focus:shadow-pop transition-all font-bold text-foreground text-lg" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="e.g. Chronic Heart Failure" />
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Operating Instructions / Profile</label>
             <textarea required className="w-full h-40 p-5 bg-input border-2 border-border rounded-lg focus:outline-none focus:border-secondary focus:shadow-pop transition-all font-medium text-foreground resize-none text-base leading-relaxed" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe what this agent should strictly monitor. e.g. 'This agent calls the patient daily checking for fluid retention, rapid weight gain, and shortness of breath...'" />
           </div>

           <div className="pt-8 flex justify-end border-t-2 border-border border-dashed">
             <button type="submit" disabled={loading} className="w-full md:w-auto inline-flex items-center justify-center gap-3 h-16 px-10 bg-accent text-white font-heading font-extrabold rounded-full border-2 border-border shadow-pop hover:-translate-y-1 hover:-translate-x-1 hover:shadow-pop-hover active:translate-y-1 active:translate-x-1 active:shadow-pop-active transition-all text-xl tracking-wide uppercase">
                <Save className="w-6 h-6" strokeWidth={3} /> {loading ? "Deploying..." : "Activate Agent"}
             </button>
           </div>
         </form>
      </div>
    </div>
  );
}
