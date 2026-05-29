import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchPatients() {
      if (!user) return;
      
      const { data: patsData, error: patsErr } = await supabase
        .from("patients")
        .select("*")
        .eq("docuuid", user.id)
        .order("created_at", { ascending: false });

      const { data: agentsData, error: agentsErr } = await supabase
        .from("agents")
        .select("*")
        .eq("docuuid", user.id);

      if (patsErr) {
        console.error("Failed fetching patients:", patsErr);
      }

      if (!patsErr && patsData) {
        // Map agents manually to avoid postgREST relation errors on foreign keys
        const formatted = patsData.map(p => {
           const agent = agentsData?.find(a => a.id === p.assigned_agent_id);
           return { ...p, agent_name: agent ? agent.name : "Unassigned" };
        });
        setPatients(formatted);
      }
      setLoading(false);
    }
    fetchPatients();
  }, [user]);

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
         <div>
           <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">Patients</h1>
           <p className="mt-1.5 text-muted-foreground font-medium text-sm sm:text-base">Manage and monitor individuals under your care.</p>
         </div>
         <Link to="/dashboard/patients/add" className="self-start shrink-0 inline-flex items-center justify-center gap-2 h-10 sm:h-12 px-4 sm:px-6 bg-accent text-white font-heading font-bold rounded-full border-2 border-border shadow-pop hover:-translate-y-1 hover:-translate-x-1 hover:shadow-pop-hover active:translate-y-1 active:translate-x-1 active:shadow-pop-active transition-all whitespace-nowrap text-sm">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Add Patient
         </Link>
      </div>

      <div className="bg-card border-2 border-border rounded-xl shadow-soft overflow-hidden">
        <div className="p-4 border-b-2 border-border border-dashed bg-muted/30">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
             <input 
               type="text" 
               placeholder="Search patients..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full h-12 pl-10 pr-4 bg-input border-2 border-border rounded-lg text-foreground font-body focus:outline-none focus:border-accent focus:shadow-pop transition-all"
             />
           </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading patients...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center border-2 border-border mb-4">
              <UserCircle className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-heading font-bold text-foreground mb-2">No patients found</h3>
            <p className="text-muted-foreground">Get started by adding your first patient.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/10">
                  <th className="p-4 font-heading font-bold uppercase tracking-wider text-xs text-muted-foreground">Name</th>
                  <th className="p-4 font-heading font-bold uppercase tracking-wider text-xs text-muted-foreground hidden sm:table-cell">Condition</th>
                  <th className="p-4 font-heading font-bold uppercase tracking-wider text-xs text-muted-foreground hidden md:table-cell">Agent</th>
                  <th className="p-4 font-heading font-bold uppercase tracking-wider text-xs text-muted-foreground text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-border divide-dashed">
                {filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-foreground text-lg">{patient.name}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{patient.condition}</div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-3 py-1 bg-quaternary/20 text-foreground border-2 border-border rounded-full text-sm font-bold whitespace-nowrap">
                        {patient.condition || "Not specified"}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell font-medium text-muted-foreground">
                      {patient.agent_name}
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/dashboard/patients/${patient.id}`} className="inline-block px-4 py-2 bg-primary text-white font-bold rounded-full border-2 border-border hover:-translate-y-1 hover:shadow-pop-hover transition-all">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
