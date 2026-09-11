"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function Icon({ name }: { name: "overview" | "analyze" | "datasets" | "reports" | "menu" | "close" | "logout" }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 5-7" />
        </svg>
      );
    case "analyze":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case "datasets":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
  }
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: <Icon name="overview" /> },
  { href: "/analyze", label: "Analyze", icon: <Icon name="analyze" /> },
  { href: "/datasets", label: "Datasets", icon: <Icon name="datasets" /> },
  { href: "/reports", label: "Reports", icon: <Icon name="reports" /> },
];

// Maps a pathname to what the header breadcrumb should say. Run
// detail pages are dynamic (/analysis/[runId]) and intentionally
// not in the sidebar nav — they're reached by clicking into a run,
// not by browsing to them directly.
function headerLabelFor(pathname: string) {
  if (pathname === "/") return "Overview";
  if (pathname.startsWith("/analyze")) return "Analyze";
  if (pathname.startsWith("/datasets")) return "Datasets";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/analysis/")) return "Analysis run";
  return "Fibrion";
}

const AUTH_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Once we know for sure there's no session, bounce to /login - but
  // never for /login or /register themselves, or this would loop.
  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      router.replace("/login");
    }
  }, [loading, user, isAuthRoute, router]);

  // /login and /register render full-page, no sidebar/header chrome.
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // While the initial session check is in flight, or right after it
  // resolves to "no session" (before the redirect above lands), show
  // nothing but a loading mark rather than flashing protected content.
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
              <span className="brand-mark">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>
                <span className="brand-name">Fibrion</span>
                <div className="brand-caption">Production intelligence</div>
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
            <div className="sidebar-user">
              <span className="sidebar-user-email" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                className="sidebar-logout"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <Icon name="logout" />
              </button>
            </div>
            <div className="sidebar-status">
              <span className="sidebar-status-dot" />
              Operational
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
              <Icon name={mobileOpen ? "close" : "menu"} />
            </button>

            <div className="header-crumb">
              Fibrion / <strong>{headerLabelFor(pathname)}</strong>
            </div>
          </div>

          <ThemeToggle />
        </header>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}