"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { Eye, EyeSlash, Info } from "@/components/icons";
import { EMAIL_RE, account } from "@/lib/account";

/**
 * A1 Sign up / Log in (UI_UX_LAYOUT.md). Inline errors announced to screen readers, password
 * show/hide, autocomplete for password managers, and a loading state while submitting.
 */
export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [google, setGoogle] = useState(false);
  const signup = mode === "signup";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter an email address like name@example.com.";
    if (signup && password.length < 8) next.password = "Use at least 8 characters.";
    if (!signup && !password) next.password = "Enter your password.";
    setErrors(next);
    if (next.email || next.password) {
      document.getElementById(`${id}-${next.email ? "email" : "password"}`)?.focus();
      return;
    }
    setBusy(true);
    if (signup) {
      const res = await account.signUp(email, password);
      setBusy(false);
      if (!res.ok) {
        setErrors({ email: "There’s already an account with this email. Log in instead." });
        return;
      }
      router.push("/onboarding");
    } else {
      const ok = await account.logIn(email, password);
      setBusy(false);
      if (!ok) {
        setErrors({ form: "That email and password don’t match. Try again or reset your password." });
        return;
      }
      router.push("/app");
    }
  }

  return (
    <div className="authform">
      <h1>{signup ? "Create your free account" : "Welcome back"}</h1>
      <button type="button" className="btn btn--lg btn--secondary authform__google" onClick={() => setGoogle(true)}>
        <span className="authform__g" aria-hidden="true">
          G
        </span>
        Continue with Google
      </button>
      {google && (
        <p className="authform__note" role="status">
          Google sign-in arrives with the backend. Use your email for now.
        </p>
      )}
      <div className="authform__or" aria-hidden="true">
        <span>or</span>
      </div>

      <form className="authform__form" onSubmit={submit} noValidate>
        {errors.form && (
          <p className="field__error authform__formerror" role="alert">
            {errors.form}
          </p>
        )}
        <div className="field">
          <label className="field__label" htmlFor={`${id}-email`}>
            Email
          </label>
          <input
            id={`${id}-email`}
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email || errors.form) setErrors((x) => ({ ...x, email: undefined, form: undefined }));
            }}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${id}-email-err` : undefined}
          />
          {errors.email && (
            <p className="field__error" id={`${id}-email-err`} role="alert">
              {errors.email}{" "}
              {errors.email.includes("Log in") && (
                <Link href="/login" className="link">
                  Log in
                </Link>
              )}
            </p>
          )}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-password`}>
            Password
          </label>
          <div className="authform__pw">
            <input
              id={`${id}-password`}
              className="input"
              type={show ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password || errors.form) setErrors((x) => ({ ...x, password: undefined, form: undefined }));
              }}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? `${id}-pw-err` : signup ? `${id}-pw-help` : undefined}
            />
            <button type="button" className="authform__eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
              {show ? <EyeSlash size={20} weight="regular" /> : <Eye size={20} weight="regular" />}
            </button>
          </div>
          {errors.password ? (
            <p className="field__error" id={`${id}-pw-err`} role="alert">
              {errors.password}
            </p>
          ) : (
            signup && (
              <p className="field__help" id={`${id}-pw-help`}>
                At least 8 characters.
              </p>
            )
          )}
        </div>
        <button type="submit" className="btn btn--lg btn--primary authform__submit" disabled={busy} aria-busy={busy}>
          {busy ? (signup ? "Creating your account…" : "Logging in…") : signup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="authform__small">
        By continuing you agree to our{" "}
        <Link href="/terms" className="link">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="link">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="authform__switch">
        {signup ? "Already have an account? " : "New to PlaySurvey? "}
        <Link href={signup ? "/login" : "/signup"} className="link">
          {signup ? "Log in" : "Create a free account"}
        </Link>
      </p>
      <p className="authform__proto">
        <Info size={14} weight="regular" aria-hidden="true" /> Prototype: accounts are kept in this browser until the backend exists. Your password is stored only as a salted hash.
      </p>
    </div>
  );
}
