"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Cpu,
  Database,
  FileText,
  Menu,
  X,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BrandMark } from "@/components/ui/BrandMark";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { href: "/analyze", label: "Analyze", icon: <Cpu className="w-[18px] h-[18px]" /> },
  { href: "/datasets", label: "Datasets", icon: <Database className="w-[18px] h-[18px]" /> },
  { href: "/reports", label: "Reports", icon: <FileText className="w-[18px] h-[18px]" /> },
];

function headerLabelFor(pathname: string) {
  if (pathname === "/") return "Overview";
  if (pathname.startsWith("/analyze")) return "Analyze Workbench";
  if (pathname.startsWith("/datasets")) return "Datasets";
  if (pathname.startsWith("/reports")) return "Production Reports";
  if (pathname.startsWith("/analysis/")) return "Live Run Analysis";
  return "Fibrion AI";
}

const AUTH_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      router.replace("/login");
    }
  }, [loading, user, isAuthRoute, router]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="auth-gate-loading">
        <div className="run-loading-mark" />
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${mobileOpen ? "app-sidebar-open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-brand">
            <Link href="/" className="brand-lockup" onClick={() => setMobileOpen(false)}>
              <BrandMark className="brand-mark" />
              <span>
                <span className="brand-name">Fibrion AI</span>
                <div className="brand-caption">Production Intelligence</div>
              </span>
            </Link>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${active ? "sidebar-nav-item-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-foot">
            <div className="profile-menu">
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileOpen((value) => !value)}
                aria-label="Open account menu"
                aria-expanded={profileOpen}
              >
                <UserRound />
                <span>Account</span>
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <span className="profile-popover-label">Signed in as</span>
                  <span className="profile-popover-email">{user.email}</span>
                  <span className="profile-popover-role">Textile Analyst</span>
                  <button type="button" className="profile-signout" onClick={handleLogout}>
                    <LogOut /> Sign out
                  </button>
                </div>
              )}
            </div>

            <div className="sidebar-status">
              <span className="sidebar-status-dot" />
              <span>Pipeline Operational</span>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <div className="app-main">
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              className="mobile-nav-button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="header-crumb">
              <span style={{ color: "var(--text-faint)" }}>Fibrion</span>
              <span style={{ color: "var(--border-strong)" }}>/</span>
              <strong>{headerLabelFor(pathname)}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              href="/analyze"
              className="button button-primary"
              style={{ minHeight: 36, padding: "0 14px", fontSize: 12.5 }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
