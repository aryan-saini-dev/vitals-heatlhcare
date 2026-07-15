import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created successfully!");
      void navigate({ to: "/dashboard", replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background overflow-hidden p-4 animate-fade-in">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 dot-pattern opacity-[0.12] z-0" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-float" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10 animate-float" style={{ animationDelay: "1.5s" }} />

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-md bg-card/85 backdrop-blur-md border border-border/60 shadow-card rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Create Account</h1>
          <p className="text-xs text-muted-foreground font-medium">Join Vitals to manage AI care monitors for your patients.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-background border border-border/80 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary/50 transition-all placeholder-muted-foreground"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-background border border-border/80 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary/50 transition-all placeholder-muted-foreground"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow hover:scale-[1.01] transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
          >
            {loading ? "Creating account..." : "Sign Up"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground font-medium pt-2">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-bold transition-all">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
