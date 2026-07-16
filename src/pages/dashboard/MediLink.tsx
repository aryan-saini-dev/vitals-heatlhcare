import { Link2, Sparkles, ArrowLeft, Shield, Check, Heart, Server, Network } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MediLink() {
  const [joined, setJoined] = useState(false);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoined(true);
    
    const recipient = "aryansaini2004feb@gmail.com";
    const subject = encodeURIComponent("Request Beta Support & Sandbox Access");
    const body = encodeURIComponent(`Hello Vitals Team,

I would like to request beta support and priority sandbox access for the MediLink EHR integration module.

Best regards,
Clinician`);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
    toast.success("Opening Gmail in a new tab to send your beta access request...");
  };

  const steps = [
    { label: "Connect EHR", desc: "One-click connection to Epic, Cerner, or local medical databases.", icon: Server, color: "text-blue-500 bg-blue-500/10" },
    { label: "AI Translation", desc: "Raw clinical records are converted into structured diagnostic datasets.", icon: Sparkles, color: "text-primary bg-primary/10" },
    { label: "Patient Security", desc: "Fully HIPAA-compliant end-to-end encrypted medical pipeline.", icon: Shield, color: "text-emerald-500 bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-4 animate-fade-up max-w-4xl mx-auto">
      {/* Back button */}
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </a>

      {/* Hero Interoperability Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 shadow-glow">
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-white/15 text-white ring-1 ring-white/20">
              <Network className="w-3 h-3" /> Core Pipeline
            </div>
            <h1 className="text-xl md:text-2xl font-display font-extrabold text-white tracking-tight">
              MediLink Health Network
            </h1>
            <p className="max-w-md text-xs text-primary-foreground/75 leading-relaxed">
              Autonomously bridging the gap between electronic health records (EHR) and continuous AI check-in agents.
            </p>
          </div>
          
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white text-primary shadow-soft">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Module Coming Soon
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3.5">
        {steps.map((s, idx) => (
          <div key={idx} className="bg-card border border-border rounded-xl p-4.5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Phase {idx + 1}</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-display font-bold text-foreground">{s.label}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Pipeline Mock Flowchart */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card md:col-span-3 space-y-4">
          <div>
            <h3 className="font-display font-bold text-xs text-foreground">Interoperability Flow</h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Real-time EHR sync pipeline simulation</p>
          </div>

          <div className="space-y-3">
            {[
              { source: "Epic Systems / Cerner", action: "Record retrieval request", status: "Pending EHR Connection", color: "text-muted-foreground" },
              { source: "Vitals AI Agent", action: "Check-in transcript analysis", status: "Awaiting trigger", color: "text-muted-foreground" },
              { source: "MediLink Hub", action: "HL7 / FHIR data bundle packaging", status: "Blueprint ready", color: "text-primary" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/70 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div>
                    <p className="font-bold text-foreground">{item.source}</p>
                    <p className="text-[9px] text-muted-foreground">{item.action}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Access Waitlist Signup */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card md:col-span-2 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-display font-bold text-xs text-foreground">Priority Beta List</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Get notified first and test the Epic/Cerner sync module in sandbox mode as soon as it launches.
            </p>
          </div>

          {joined ? (
            <div className="p-3.5 bg-success/10 border border-success/15 rounded-xl text-center flex flex-col items-center gap-1.5 animate-fade-in">
              <Check className="w-5 h-5 text-success" />
              <p className="text-xs font-bold text-success">Request Initiated!</p>
              <p className="text-[9px] text-muted-foreground">Please send the prewritten email to finish setup.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleJoin()}
              className="w-full h-9 bg-gradient-primary text-white font-bold rounded-xl text-xs shadow-glow hover:scale-105 transition-all cursor-pointer"
            >
              Request Beta Access
            </button>
          )}

          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Heart className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Built by clinicians, for clinicians.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
