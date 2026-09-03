"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function Icon({ name }: { name: "overview" | "analyze" | "datasets" | "reports" | "menu" | "close" }) {
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

          <div className="header-status">
            <span className="header-status-dot" />
            API connected
          </div>
        </header>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}