import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { Plus, Search, UserCircle, Shield, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/patients")({
  component: Patients,
});

export default function Patients() {
  const location = useLocation();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isExact = location.pathname === "/dashboard/patients" || location.pathname === "/dashboard/patients/";

  if (!isExact) {
    return <Outlet />;
  }

  useEffect(() => {
    async function fetchPatients() {
      if (!user) return;

      const { data: patsData, error: patsErr } = await supabase
        .from("patients")
        .select("*")
        .eq("docuuid", user.id)
        .order("created_at", { ascending: false });

      const { data: agentsData } = await supabase
        .from("agents")
        .select("*")
        .eq("docuuid", user.id);

      if (patsErr) {
        console.error("Failed fetching patients:", patsErr);
      }

      if (!patsErr && patsData) {
        const formatted = patsData.map((p) => {
          const agent = agentsData?.find((a) => a.id === p.assigned_agent_id);
          return { ...p, agent_name: agent ? agent.name : "Unassigned" };
        });
        setPatients(formatted);
      }
      setLoading(false);
    }
    void fetchPatients();
  }, [user]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Manage and monitor individuals under your continuous clinical care.
          </p>
        </div>
        <Link
          to="/dashboard/patients/add"
          className="self-start shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow transition-all hover:scale-[1.03]"
        >
          <Plus className="w-3.5 h-3.5" /> Add Patient
        </Link>
      </div>

      {/* List Container */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-border/50 bg-secondary/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-background border border-border/80 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground font-medium text-sm animate-pulse">
            Loading patients list...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center border border-border/60 mb-4 text-muted-foreground">
              <UserCircle className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-base font-display font-bold text-foreground mb-1.5">No Patients Found</h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Register a patient and assign an AI agent to initiate proactive check-in campaigns.
            </p>
            <Link
              to="/dashboard/patients/add"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/50 px-4 py-2 text-xs font-semibold text-primary backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground"
            >
              Add First Patient
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/15">
                  <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Name</th>
                  <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground hidden sm:table-cell">Condition</th>
                  <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground hidden md:table-cell">Agent</th>
                  <th className="p-4 font-display font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-foreground text-sm">{patient.name}</div>
                      <div className="text-[10px] text-muted-foreground sm:hidden mt-0.5">{patient.condition}</div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/15">
                        {patient.condition || "Not specified"}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-xs font-medium text-muted-foreground">
                      {patient.agent_name}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to="/dashboard/patients/$id"
                        params={{ id: patient.id }}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground rounded-lg font-bold text-xs border border-border/80 hover:border-transparent transition-all"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
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
