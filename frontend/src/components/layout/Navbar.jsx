import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HomeIcon, HistoryIcon, ResultsIcon, InfoIcon } from "@/components/ui/icons";

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}

export function Navbar() {
  return (
    <nav className="flex items-center gap-1 rounded-xl border bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-sm dark:bg-slate-900/80">
      <NavItem to="/" icon={<HomeIcon size={18} />} label="Home" />
      <NavItem to="/results" icon={<ResultsIcon size={18} />} label="Results" />
      <NavItem to="/history" icon={<HistoryIcon size={18} />} label="History" />
      <NavItem to="/about" icon={<InfoIcon size={18} />} label="About" />
    </nav>
  );
}
