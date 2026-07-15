import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import {
  Activity,
  Users,
  Bot,
  Bell,
  Phone,
  LogOut,
  Menu,
  X,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Overview", to: "/dashboard", icon: Activity, exact: true },
  { name: "Patients", to: "/dashboard/patients", icon: Users, exact: false },
  { name: "Agents", to: "/dashboard/agents", icon: Bot, exact: false },
  { name: "Alerts", to: "/dashboard/alerts", icon: Bell, exact: false },
  { name: "Calls", to: "/dashboard/calls", icon: Phone, exact: true },
  { name: "Simulate Web-Call", to: "/dashboard/calls/simulate", icon: Mic, exact: false },
  { name: "Misdiagnosis Solution", to: "/dashboard/misdiagnosis-solution", icon: ShieldCheck, exact: false },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/20">
        <div className="h-full w-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-base">V</div>
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-extrabold tracking-tight text-foreground">VITALS</div>
        <div className="text-[9px] font-medium tracking-wide text-muted-foreground">AI Healthcare</div>
      </div>
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
    if (!isLoading && !user) {
      navigate("/login", { replace: true });
    }
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
        setOpenAlertsCount(list.filter((a: { status?: string }) => a.status?.toLowerCase() === "open" || a.status?.toLowerCase() === "active").length);
      } catch {
        setOpenAlertsCount(0);
      }
    };
    void load();
    const t = window.setInterval(load, 20000);
    const onInv = () => void load();
    window.addEventListener("vitals:invalidate-lists", onInv);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("vitals:invalidate-lists", onInv);
    };
  }, [session?.access_token]);

  // Close mobile menu on path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getPageTitle = () => {
    if (currentPath === "/dashboard") return "Overview";
    return currentPath
      .split("/")
      .slice(2)
      .join(" / ")
      .replace(/-/g, " ") || "Dashboard";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/60 bg-card z-20 shrink-0">
        <div className="p-5 h-16 flex items-center border-b border-border/50">
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? currentPath === item.to
              : currentPath.startsWith(item.to) && currentPath !== "/dashboard";
            return (
              <Link
                key={item.name}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-250 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow scale-[1.02]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 min-w-0 truncate">{item.name}</span>
                {item.to === "/dashboard/alerts" && openAlertsCount > 0 ? (
                  <span className={`shrink-0 h-5 min-w-[1.25rem] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none ${
                    isActive ? "bg-white text-primary" : "bg-destructive text-destructive-foreground animate-pulse"
                  }`}>
                    {openAlertsCount > 9 ? "9+" : openAlertsCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 font-semibold rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive border border-border/50 hover:border-destructive/20 transition-all text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Decorative grids */}
        <div className="pointer-events-none absolute inset-0 dot-pattern opacity-[0.15] z-0" />

        {/* Top Header */}
        <header className="h-16 border-b border-border/60 bg-card/75 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Menu"
              className="md:hidden p-1.5 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="font-display font-bold text-base sm:text-lg text-foreground capitalize truncate">
              {getPageTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                {user?.email}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">Clinician Portal</div>
            </div>
            <div className="w-9 h-9 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-primary uppercase text-sm">
                {user?.email?.[0] || "D"}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border/60 flex flex-col animate-fade-in shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b border-border/50">
                <Logo />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? currentPath === item.to
                    : currentPath.startsWith(item.to) && currentPath !== "/dashboard";
                  return (
                    <Link
                      key={item.name}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl font-medium text-sm transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {item.to === "/dashboard/alerts" && openAlertsCount > 0 ? (
                        <span className="h-5 min-w-[1.25rem] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {openAlertsCount > 9 ? "9+" : openAlertsCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-border/50">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 font-semibold rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive border border-border/50 transition-all text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outlet container */}
        <main className="flex-1 overflow-auto p-6 z-0 relative">
          <div className="max-w-7xl mx-auto h-full animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
