import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t-2 border-foreground py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-heading font-bold text-lg">
          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-foreground">
            <Heart className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          VITALS
        </div>
        <p className="text-muted-foreground text-sm text-center">
          Agentic AI Healthcare • Team V.I.T.A.L.S • All rights reserved.
        </p>
        <div className="flex gap-3">
          {["Privacy", "Terms", "Contact"].map((link) => (
            <a key={link} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
