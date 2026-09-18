"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/ui/BrandMark";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await register(email, password, fullName || undefined);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
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
          <h1 className="auth-card-title">Create Account</h1>
          <p className="auth-card-sub">Access verified production reports &amp; live anomaly alerts.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <span className="field-label">Full Name (optional)</span>
            <input
              className="text-input"
              type="text"
              autoComplete="name"
              placeholder="Usman Javaid"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field-hint">Must contain at least 8 characters.</span>
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
                <span>Creating Account…</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-link">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
