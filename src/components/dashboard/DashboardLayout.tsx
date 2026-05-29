import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { apiUrl } from "@/lib/api";
import { Activity, Users, Bot, Bell, Phone, LogOut, Menu, X, Mic, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: Activity },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Calls", href: "/dashboard/calls", icon: Phone },
  { name: "Simulate Web-Call", href: "/dashboard/calls/simulate", icon: Mic },
  { name: "Misdiagnosis Solution", href: "/dashboard/misdiagnosis-solution", icon: ShieldCheck },
];

export default function DashboardLayout() {
  const { signOut, user, session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

  useEffect(() => {
    if (!session?.access_token) return;
    const load = async () => {
      try {
        const r = await fetch(apiUrl("/api/alerts"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const d = await r.json().catch(() => ({}));
        const list = Array.isArray(d.alerts) ? d.alerts : [];
        setOpenAlertsCount(list.filter((a: { status?: string }) => a.status === "open").length);
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const pageTitle = location.pathname === "/dashboard"
    ? "Overview"
    : location.pathname.split("/").slice(2).join(" / ").replace(/-/g, " ") || "Dashboard";

  return (
    <div className="flex h-screen bg-background font-body overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 border-r-2 border-border bg-card shadow-soft z-20 shrink-0">
        <Link
          to="/"
          className="p-5 h-18 flex items-center border-b-2 border-border border-dashed font-heading font-extrabold text-xl text-foreground hover:bg-muted/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center mr-3 shadow-pop animate-wiggle shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <span className="truncate">Vitals</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-all duration-200 text-sm ${
                  isActive
                    ? "bg-primary text-white border-2 border-border shadow-pop translate-x-1"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-2 border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span className="flex-1 min-w-0 truncate">{item.name}</span>
                {item.href === "/dashboard/alerts" && openAlertsCount > 0 ? (
                  <span className="shrink-0 min-w-[1.5rem] h-5 px-1.5 rounded-full bg-destructive text-white text-xs font-black flex items-center justify-center border border-border">
                    {openAlertsCount > 9 ? "9+" : openAlertsCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t-2 border-border border-dashed">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full p-3 font-bold rounded-lg text-foreground border-2 border-border hover:bg-tertiary transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Decorative Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
            backgroundSize: "16px 16px",
            color: "hsl(var(--foreground))",
          }}
        />

        {/* Top Header */}
        <header className="h-16 border-b-2 border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-10 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Menu"
              className="md:hidden p-1 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
            <h2 className="font-heading font-bold text-base sm:text-lg text-foreground capitalize truncate">
              {pageTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block text-xs font-bold text-muted-foreground truncate max-w-[180px]">
              {user?.email}
            </div>
            <div className="w-9 h-9 rounded-full border-2 border-border bg-quaternary flex items-center justify-center shadow-pop shrink-0">
              <span className="font-heading font-bold text-white uppercase text-sm">
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
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r-2 border-border flex flex-col animate-pop-in shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b-2 border-border border-dashed">
                <span className="font-heading font-extrabold text-xl">Vitals</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 p-3 rounded-lg font-bold border-2 text-sm transition-all ${
                        isActive
                          ? "bg-primary text-white border-border shadow-pop"
                          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {item.href === "/dashboard/alerts" && openAlertsCount > 0 ? (
                        <span className="min-w-[1.5rem] h-5 px-1.5 rounded-full bg-destructive text-white text-xs font-black flex items-center justify-center">
                          {openAlertsCount > 9 ? "9+" : openAlertsCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t-2 border-border border-dashed">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 w-full p-3 font-bold rounded-lg text-foreground border-2 border-border hover:bg-tertiary transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outlet container */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 z-0 relative">
          <div className="max-w-7xl mx-auto h-full space-y-6 md:space-y-8 animate-pop-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
