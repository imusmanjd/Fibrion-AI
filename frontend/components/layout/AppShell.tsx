"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/analyze", label: "Analyze", icon: "＋" },
  { href: "/datasets", label: "Datasets", icon: "▦" },
  { href: "/reports", label: "Reports", icon: "□" },
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">FIBRION</div>
            <span className="brand-sub">INDUSTRIAL INTELLIGENCE</span>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Workspace</div>

          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="nav-label" style={{ paddingLeft: 0 }}>
            System
          </div>

          <div className="status">
            <span className="status-dot" />
            System operational
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <button
            className="button button-secondary mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>

          <div className="header-title">
            {pathname === "/"
              ? "Overview"
              : pathname.startsWith("/analyze")
                ? "Analyze"
                : pathname.startsWith("/reports")
                  ? "Reports"
                  : pathname.startsWith("/datasets")
                    ? "Datasets"
                    : "Analysis"}
          </div>

          <div className="header-meta">
            <span className="status">
              <span className="status-dot" />
              Operational
            </span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}