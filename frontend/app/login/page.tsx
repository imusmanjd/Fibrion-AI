"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/ui/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-brand">
          <BrandMark className="brand-mark" />
          <span className="brand-name">Fibrion AI</span>
        </div>

        <div className="auth-card-header">
          <h1 className="auth-card-title">Welcome Back</h1>
          <p className="auth-card-sub">Autonomous intelligence for textile weaving metrics.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <span className="field-label">Email Address</span>
            <input
              className="text-input"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field-group">
            <span className="field-label">Password</span>
            <input
              className="text-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="button button-primary button-large"
            disabled={submitting}
            style={{ width: "100%", marginTop: 8 }}
          >
            {submitting ? (
              <>
                <div className="run-loading-mark" style={{ width: 14, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff" }} />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-link">
          Don&rsquo;t have an account? <Link href="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
