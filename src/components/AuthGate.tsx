import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const OTP_LENGTH = 8;

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return children;
  if (checking) return <main className="center-screen">正在连接家庭账本…</main>;
  if (session) return children;

  async function sendCode() {
    if (!supabase) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;
    setError(null);
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    });
    setSubmitting(false);
    if (authError) setError(authError.message);
    else {
      setEmail(normalizedEmail);
      setSent(true);
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    await sendCode();
  }

  async function submitToken(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const normalizedToken = token.replace(/\s/g, "");
    if (!email || normalizedToken.length < OTP_LENGTH) return;
    setError(null);
    setSubmitting(true);
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: normalizedToken,
      type: "email",
    });
    setSubmitting(false);
    if (authError) setError(authError.message);
  }

  function resetEmail() {
    setSent(false);
    setToken("");
    setError(null);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img src="/ledger-icon.svg" alt="" width="64" height="64" />
        <p className="eyebrow">家庭账本</p>
        <h1>登录后继续记账</h1>
        <p className="muted">输入邮箱，我们会发送 8 位验证码。验证码在当前窗口输入，适合 iPhone 桌面 App。</p>
        {sent ? (
          <>
            <div className="success-panel">验证码已发送到 {email}。</div>
            <form onSubmit={submitToken} className="stack-form">
              <label>
                验证码
                <input
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="输入 8 位验证码"
                  maxLength={OTP_LENGTH}
                />
              </label>
              <button type="submit" className="primary-button" disabled={submitting || token.length < OTP_LENGTH}>
                {submitting ? "正在验证…" : "登录"}
              </button>
              <div className="button-row auth-actions">
                <button type="button" className="text-button" onClick={resetEmail}>换邮箱</button>
                <button type="button" className="text-button" onClick={() => void sendCode()} disabled={submitting}>
                  重新发送
                </button>
              </div>
            </form>
          </>
        ) : (
          <form onSubmit={submitEmail} className="stack-form">
            <label>
              邮箱
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "正在发送…" : "发送验证码"}
            </button>
          </form>
        )}
        {error && <p className="error-text">{error}</p>}
      </section>
    </main>
  );
}
