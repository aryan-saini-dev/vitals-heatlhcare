import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import TechStackMarquee from "@/components/TechStackMarquee";
import WorkflowSection from "@/components/WorkflowSection";
import ImpactSection from "@/components/ImpactSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { LogOut, LogIn, LayoutDashboard } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground font-body relative">
      {/* Top Header for Auth */}
      <header className="absolute top-0 right-0 p-6 z-50 flex gap-4">
         {!user ? (
           <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-border bg-card font-heading font-bold shadow-pop hover:-translate-y-1 hover:shadow-pop-hover transition-all text-primary whitespace-nowrap">
             <LogIn className="w-5 h-5" /> Sign In
           </Link>
         ) : (
           <>
             <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-border bg-accent text-white font-heading font-bold shadow-pop hover:-translate-y-1 hover:shadow-pop-hover transition-all whitespace-nowrap">
               <LayoutDashboard className="w-5 h-5" /> Dashboard
             </Link>
             <button onClick={() => signOut()} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-border bg-card font-heading font-bold shadow-pop hover:-translate-y-1 hover:shadow-pop-hover transition-all text-destructive whitespace-nowrap">
               <LogOut className="w-5 h-5" /> Log Out
             </button>
           </>
         )}
      </header>

      <HeroSection />
      <TechStackMarquee />
      <FeaturesSection />
      <WorkflowSection />
      <ImpactSection />
      <TeamSection />
      <Footer />
    </div>
  );
};

export default Index;
