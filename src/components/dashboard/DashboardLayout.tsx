import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import {
  Activity, Users, Bot, Bell, Phone,
  LogOut, Menu, X, Mic, Link2,
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Overview", to: "/dashboard", icon: Activity, exact: true, color: "#2563eb" },
  { name: "Patients", to: "/dashboard/patients", icon: Users, exact: false, color: "#0369a1" },
  { name: "Agents", to: "/dashboard/agents", icon: Bot, exact: false, color: "#0e7490" },
  { name: "Alerts", to: "/dashboard/alerts", icon: Bell, exact: false, color: "#dc2626" },
  { name: "Calls", to: "/dashboard/calls", icon: Phone, exact: true, color: "#059669" },
  { name: "Simulate Call", to: "/dashboard/calls/simulate", icon: Mic, exact: false, color: "#2563eb" },
  { name: "MediLink", to: "/dashboard/medilink", icon: Link2, exact: false, color: "#0284c7", badge: "Soon" as const },
];

function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className="flex items-center justify-center w-full">
      <img src="/vitals-logo.png" alt="Vitals Logo" className={`${className} object-contain`} />
    </div>
  );
}

export default function DashboardLayout() {
  const { signOut, user, session, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);
  const currentPath = location.pathname;

  useEffect(() => {
    if (!isLoading && !user) navigate("/login", { replace: true });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!session?.access_token) return;
    const load = async () => {
      try {
        const r = await fetch(apiUrl("/api/alerts"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const d = await r.json().catch(() => ({}));
        const list = Array.isArray(d.alerts) ? d.alerts : [];
        setOpenAlertsCount(
          list.filter((a: { status?: string }) =>
            a.status?.toLowerCase() === "open" || a.status?.toLowerCase() === "active"
          ).length
        );
      } catch { setOpenAlertsCount(0); }
    };
    void load();
    const t = window.setInterval(load, 20000);
    window.addEventListener("vitals:invalidate-lists", load);
    return () => { window.clearInterval(t); window.removeEventListener("vitals:invalidate-lists", load); };
  }, [session?.access_token]);

  useEffect(() => { setMobileMenuOpen(false); }, [currentPath]);

  const [customTitle, setCustomTitle] = useState("");
  const [customLeftElement, setCustomLeftElement] = useState<React.ReactNode>(null);
  const [customRightElement, setCustomRightElement] = useState<React.ReactNode>(null);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const getPageTitle = () => {
    if (currentPath === "/dashboard") return "Overview";
    if (currentPath.includes("medilink")) return "MediLink";
    if (currentPath.includes("simulate")) return "Simulate Call";
    return currentPath.split("/").slice(2).join(" / ").replace(/-/g, " ") || "Dashboard";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  // Reusable nav list
  const NavList = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 px-2.5 pb-2 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = item.exact
          ? currentPath === item.to
          : currentPath.startsWith(item.to) && currentPath !== "/dashboard";
        return (
          <Link
            key={item.name}
            to={item.to}
            onClick={onLinkClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={
              isActive
                ? { background: "#4f46e5", color: "#fff", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }
                : { color: "#64748b", background: "transparent" }
            }
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={isActive ? { background: "rgba(255,255,255,0.2)" } : { background: `${item.color}15` }}
            >
              <item.icon className="w-3.5 h-3.5" style={{ color: isActive ? "#fff" : item.color }} />
            </div>
            <span className="flex-1 min-w-0 truncate font-semibold">
              {item.name}
            </span>
            {item.to === "/dashboard/alerts" && openAlertsCount > 0 && (
              <span
                className="shrink-0 h-4.5 min-w-[1.1rem] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={isActive ? { background: "rgba(255,255,255,0.25)", color: "#fff" } : { background: "#ef4444", color: "#fff" }}
              >
                {openAlertsCount > 9 ? "9+" : openAlertsCount}
              </span>
            )}
            {item.badge && (
              <span
                className="shrink-0 px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider"
                style={isActive
                  ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                  : { background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarFooter = () => (
    <div className="p-3 shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
      <div
        className="flex items-center gap-2 px-2 py-2 rounded-xl mb-2"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
          style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff" }}
        >
          {user?.email?.[0]?.toUpperCase() || "D"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold truncate" style={{ color: "#1e293b" }}>{user?.email?.split("@")[0]}</div>
          <div className="text-[8px] font-medium" style={{ color: "#94a3b8" }}>Clinician Portal</div>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center justify-center gap-1.5 w-full py-2 px-3 font-semibold rounded-xl text-xs transition-all cursor-pointer"
        style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}
      >
        <LogOut className="w-3.5 h-3.5" /> Sign Out
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-52 z-20 shrink-0"
        style={{ background: "#fff", borderRight: "1px solid #e9eef4", boxShadow: "4px 0 24px rgba(99,102,241,0.06)" }}
      >
        <div className="px-4 h-20 flex items-center justify-center shrink-0 w-full">
          <Link to="/" className="hover:opacity-90 transition-opacity w-full flex justify-center"><Logo className="h-16" /></Link>
        </div>
        <div className="pt-2" />
        <NavList />
        <SidebarFooter />
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">

        {/* Top Header */}
        <header
          className="h-12 flex items-center justify-between px-4 z-10 shrink-0 gap-3"
          style={{ background: "rgba(255,255,255,0.97)", borderBottom: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button aria-label="Menu" className="md:hidden p-1 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-4 h-4 text-foreground" />
            </button>
            <div className="md:hidden">
              <Link to="/" className="hover:opacity-90 transition-opacity"><Logo className="h-10" /></Link>
            </div>
            <div className="hidden md:block">
              {customLeftElement || (
                <>
                  <h2 className="font-display font-extrabold text-sm text-foreground capitalize tracking-tight leading-none">
                    {getPageTitle()}
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    VITALS AI Healthcare Platform
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {openAlertsCount > 0 && (
              <Link
                to="/dashboard/alerts"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-[1.02] cursor-pointer"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}
              >
                <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                {openAlertsCount} Alert{openAlertsCount > 1 ? "s" : ""}
              </Link>
            )}
            {customRightElement}
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="fixed inset-y-0 left-0 w-56 flex flex-col animate-fade-in shadow-2xl"
              style={{ background: "#fff" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <Logo className="h-8" />
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg" style={{ color: "#94a3b8" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 pt-3 pb-1.5">
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "#cbd5e1" }}>Navigation</p>
              </div>
              <NavList onLinkClick={() => setMobileMenuOpen(false)} />
              <SidebarFooter />
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-5 bg-background">
          <div className="max-w-7xl mx-auto animate-fade-up">
            <Outlet context={{ setCustomLeftElement, setCustomRightElement }} />
          </div>
        </main>
      </div>
    </div>
  );
}
