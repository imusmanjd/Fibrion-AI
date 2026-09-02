"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 13V3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.5 6.5 10 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 11.5v3.25A1.75 1.75 0 0 0 5.75 16.5h8.5A1.75 1.75 0 0 0 16 14.75V11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="m6 3 4 5-4 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M4 10h12M4 14h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    description: "Production intelligence",
    icon: <GridIcon />,
  },
  {
    href: "/analyze",
    label: "Analyze",
    description: "Run a new analysis",
    icon: <UploadIcon />,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageContext(pathname: string) {
  if (pathname === "/") {
    return {
      section: "Workspace",
      title: "Overview",
      description: "Production intelligence at a glance",
    };
  }

  if (pathname === "/analyze" || pathname.startsWith("/analyze/")) {
    return {
      section: "Workspace",
      title: "Analyze",
      description: "Run a production data analysis",
    };
  }

  if (pathname.startsWith("/analysis/")) {
    return {
      section: "Analysis",
      title: "Analysis run",
      description: "Live analysis execution",
    };
  }

  return {
    section: "Workspace",
    title: "Fibrion",
    description: "Industrial intelligence",
  };
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const page = getPageContext(pathname);

  function closeMobileNav() {
    setMobileOpen(false);
  }

  return (
    <div className="app-shell">
      {/* ------------------------------------------------------------
          Desktop / mobile navigation
      ------------------------------------------------------------- */}

      <aside
        className={`app-sidebar ${
          mobileOpen ? "app-sidebar-open" : ""
        }`}
      >
        <div className="sidebar-inner">
          {/* Brand */}
          <div className="sidebar-brand">
            <Link
              href="/"
              className="brand-lockup"
              onClick={closeMobileNav}
              aria-label="Fibrion overview"
            >
              <div className="brand-symbol">
                <span />
                <span />
                <span />
              </div>

              <div className="brand-copy">
                <div className="brand-name">FIBRION</div>
                <div className="brand-caption">
                  INDUSTRIAL INTELLIGENCE
                </div>
              </div>
            </Link>
          </div>

          {/* Workspace navigation */}
          <div className="sidebar-section">
            <div className="sidebar-section-label">
              Workspace
            </div>

            <nav className="sidebar-nav" aria-label="Primary">
              {navItems.map((item) => {
                const active = isActivePath(
                  pathname,
                  item.href,
                );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-nav-item ${
                      active ? "sidebar-nav-item-active" : ""
                    }`}
                    onClick={closeMobileNav}
                  >
                    <span className="sidebar-nav-icon">
                      {item.icon}
                    </span>

                    <span className="sidebar-nav-copy">
                      <span className="sidebar-nav-label">
                        {item.label}
                      </span>

                      <span className="sidebar-nav-description">
                        {item.description}
                      </span>
                    </span>

                    {active && (
                      <span className="sidebar-nav-arrow">
                        <ChevronIcon />
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* System status */}
          <div className="sidebar-bottom">
            <div className="system-card">
              <div className="system-card-top">
                <span className="system-indicator">
                  <span />
                </span>

                <span className="system-label">
                  System operational
                </span>
              </div>

              <div className="system-description">
                Analysis services are available.
              </div>
            </div>

            <div className="sidebar-version">
              <span>FIBRION</span>
              <span>v0.1</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={closeMobileNav}
        />
      )}

      {/* ------------------------------------------------------------
          Main application area
      ------------------------------------------------------------- */}

      <div className="app-main">
        <header className="app-header">
          <div className="app-header-left">
            <button
              type="button"
              className="mobile-nav-button"
              onClick={() =>
                setMobileOpen((current) => !current)
              }
              aria-label={
                mobileOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={mobileOpen}
            >
              <MenuIcon open={mobileOpen} />
            </button>

            <div className="header-context">
              <div className="header-section">
                {page.section}
              </div>

              <div className="header-separator" />

              <div className="header-page">
                {page.title}
              </div>
            </div>
          </div>

          <div className="app-header-right">
            <div className="header-system-status">
              <span className="header-system-dot" />
              <span>Operational</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
