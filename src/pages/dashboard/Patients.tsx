import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, UserCircle, ChevronRight, Users } from "lucide-react";

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchPatients() {
      if (!user) return;
      const { data: patsData, error: patsErr } = await supabase
        .from("patients").select("*").eq("docuuid", user.id).order("created_at", { ascending: false });
      const { data: agentsData } = await supabase.from("agents").select("*").eq("docuuid", user.id);
      if (!patsErr && patsData) {
        setPatients(patsData.map((p) => {
          const agent = agentsData?.find((a) => a.id === p.assigned_agent_id);
          return { ...p, agent_name: agent ? agent.name : "Unassigned" };
        }));
      }
      setLoading(false);
    }
    void fetchPatients();
  }, [user]);

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Landing page color scheme gradient list for avatars (Primary, Info, Success, etc.)
  const avatarGradients = [
    "linear-gradient(135deg, oklch(0.52 0.22 255), oklch(0.65 0.2 245))", // Primary
    "linear-gradient(135deg, oklch(0.7 0.13 200), oklch(0.6 0.15 210))", // Info
    "linear-gradient(135deg, oklch(0.65 0.17 155), oklch(0.55 0.18 165))", // Success
    "linear-gradient(135deg, oklch(0.52 0.22 255), oklch(0.7 0.13 200))", // Primary to Info mix
  ];

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ── Header — Uses bg-gradient-primary exactly like Overview/Landing CTA ── */}
      <div className="relative rounded-2xl overflow-hidden p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-primary shadow-glow">
        {/* Grid pattern match */}
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2 text-[9px] font-bold uppercase tracking-widest text-primary-foreground ring-1 ring-white/25 bg-white/10">
            <Users className="w-3.5 h-3.5" /> Patient Registry
          </div>
          <h1 className="text-xl md:text-2xl font-display font-extrabold text-primary-foreground tracking-tight">Patients</h1>
          <p className="text-xs mt-1 text-primary-foreground/75">
            Manage and monitor individuals under continuous AI-driven care.
          </p>
        </div>

        <Link
          to="/dashboard/patients/add"
          className="relative z-10 self-start sm:self-center inline-flex items-center gap-1.5 px-4.5 py-2.5 font-semibold rounded-full text-xs transition-all hover:scale-105 cursor-pointer shrink-0 bg-background text-primary shadow-soft"
        >
          <Plus className="w-3.5 h-3.5" /> Add Patient
        </Link>
      </div>

      {/* ── Search + Table Card ── */}
      <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">

        {/* Search bar */}
        <div className="px-4.5 py-3 flex items-center gap-3 border-b border-border/70 bg-secondary/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl text-xs font-medium focus:outline-none transition-all bg-background border border-border focus:border-primary/50"
            />
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-primary/10 text-primary">
            {filtered.length} records
          </span>
        </div>

        {/* States */}
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 rounded-full animate-spin border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground font-medium">Loading patients…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 ring-1 ring-primary/15 shadow-glow">
              <UserCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-display font-bold text-foreground mb-1">No Patients Found</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                {search ? `No results for "${search}". Try a different name.` : "Register a patient and assign an AI agent to start care campaigns."}
              </p>
            </div>
            {!search && (
              <Link
                to="/dashboard/patients/add"
                className="inline-flex items-center gap-2 px-5 py-2.5 font-bold rounded-full text-sm cursor-pointer transition-all hover:scale-105 bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <Plus className="w-4 h-4" /> Add First Patient
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/10">
                  {["Patient", "Condition", "Assigned Agent", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${h === "" ? "w-24 text-right" : ""} ${h === "Condition" ? "hidden sm:table-cell" : ""} ${h === "Assigned Agent" ? "hidden md:table-cell" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient, idx) => (
                  <tr
                    key={patient.id}
                    className="group transition-colors border-b border-border/50 hover:bg-secondary/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
                          style={{ background: avatarGradients[idx % avatarGradients.length] }}
                        >
                          {patient.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{patient.name}</div>
                          <div className="text-[10px] text-muted-foreground sm:hidden">{patient.condition}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary ring-1 ring-primary/15">
                        {patient.condition || "Not specified"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs font-semibold text-muted-foreground">
                      {patient.agent_name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/dashboard/patients/${patient.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold text-xs transition-all hover:scale-105 cursor-pointer bg-gradient-primary text-primary-foreground shadow-glow"
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
