"use client";

import { useState } from "react";
import { ClientAuthLayout } from "./ClientAuthLayout";
import { ClientLoginForm } from "./ClientLoginForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type View = "signin" | "forgot-email" | "forgot-code";

const COPY: Record<View, { title: string; subtitle: string }> = {
  signin: { title: "Welcome back", subtitle: "Sign in to see how your campaigns are performing." },
  "forgot-email": { title: "Forgot your password?", subtitle: "Enter the email you sign in with and we'll send you a 6-digit code to choose a new one." },
  "forgot-code": { title: "Choose a new password", subtitle: "Enter the code we emailed you, then pick a new password." },
};

/**
 * The whole signed-out `/client/login` page. Sign in, "forgot password" and the code + new-password step are views of the same card,
 * so a client who forgot their password never leaves the page. The email they typed carries across the views.
 */
export function ClientLoginScreen() {
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const { title, subtitle } = COPY[view];

  return (
    <ClientAuthLayout title={title} subtitle={subtitle}>
      {view === "signin" ? (
        <ClientLoginForm email={email} onEmailChange={setEmail} notice={notice} onForgot={() => { setNotice(null); setView("forgot-email"); }} />
      ) : (
        <ForgotPasswordForm
          stage={view === "forgot-email" ? "email" : "code"}
          email={email}
          onEmailChange={setEmail}
          onCodeSent={() => setView("forgot-code")}
          onChangeEmail={() => setView("forgot-email")}
          onBack={() => setView("signin")}
          onDone={() => { setNotice("Your password was changed. Sign in with your new password."); setView("signin"); }}
        />
      )}
    </ClientAuthLayout>
  );
}
