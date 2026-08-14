import Link from "next/link";
import { BarChart3, Calculator, ContactRound, Globe2, LayoutDashboard, PlugZap, Search, UsersRound } from "lucide-react";
import { signOut } from "./actions";

const links = [
  ["/dashboard", "Overview", LayoutDashboard], ["/websites", "Websites", Globe2],
  ["/seo-audits", "SEO Audits", Search], ["/crm", "CRM", ContactRound],
  ["/personas", "Personas", UsersRound],
  ["/finance", "Finance", Calculator], ["/connectors", "Connectors", PlugZap],
  ["/campaigns", "Campaigns", BarChart3],
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="shell"><aside className="sidebar">
    <div className="brand">MarketingMind <span>AI</span></div>
    <nav className="nav">{links.map(([href,label,Icon]) => <Link key={href} href={href}><Icon size={16} style={{verticalAlign:"-3px",marginRight:8}} />{label}</Link>)}</nav>
  </aside><main className="main"><div className="topbar"><span className="muted">Marketing workspace</span><form action={signOut}><button className="btn secondary">Sign out</button></form></div>{children}</main></div>;
}

