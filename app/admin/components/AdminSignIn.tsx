"use client";

import Script from "next/script";
import { LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: { id: { initialize(config: Record<string, unknown>): void; renderButton(element: HTMLElement, config: Record<string, unknown>): void } };
    };
  }
}

type Props = {
  email: string;
  password: string;
  rememberDevice: boolean;
  error: string;
  loading: boolean;
  onEmailChange(value: string): void;
  onPasswordChange(value: string): void;
  onRememberChange(value: boolean): void;
  onPasswordSignIn(): void;
  onGoogleSignIn(credential: string): void;
  onForgotPassword(): void;
};

export function AdminSignIn(props: Props) {
  const googleButton = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const renderGoogle = () => {
    if (!googleClientId || !window.google || !googleButton.current) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response: { credential?: string }) => response.credential && props.onGoogleSignIn(response.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    googleButton.current.replaceChildren();
    window.google.accounts.id.renderButton(googleButton.current, {
      type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 384,
    });
  };

  useEffect(renderGoogle, [googleClientId, props.rememberDevice]);

  return (
    <main className="min-h-screen bg-[#f5f0e8] md:grid md:grid-cols-2">
      {googleClientId && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={renderGoogle} />}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#2c1810] md:block" aria-hidden="true">
        <img src="/Admin/welcome.jpg" alt="" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1d0f0a]/75 to-[#2c1810]/35" />
        <p className="absolute left-1/2 top-20 -translate-x-1/2 whitespace-nowrap text-center font-serif text-3xl tracking-[0.28em] text-white">BY<br />AH BRAIDING</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(139,104,76,0.10),transparent_34%)]" />
        <div className="relative w-full max-w-md rounded-2xl border border-[#ddcfc1] bg-white/95 px-6 py-8 shadow-[0_20px_60px_rgba(44,24,16,0.10)] sm:px-9 sm:py-10">
          <div className="mb-7 text-center">
            <p className="mb-5 font-serif text-sm tracking-[0.32em] text-[#2c1810] md:hidden">BY AH BRAIDING</p>
            <h1 className="font-serif text-4xl text-[#2c1810]">Admin sign in</h1>
            <p className="mt-2 text-sm text-neutral-600">Manage bookings, services, and availability.</p>
          </div>

          {props.error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{props.error}</div>}

          {googleClientId ? (
            <div ref={googleButton} className="flex min-h-11 w-full justify-center overflow-hidden rounded-md" />
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Google sign-in will appear after its client ID is configured.</div>
          )}

          <div className="my-5 flex items-center gap-4 text-xs text-neutral-500"><span className="h-px flex-1 bg-neutral-200" /><span>OR</span><span className="h-px flex-1 bg-neutral-200" /></div>

          <form onSubmit={(event) => { event.preventDefault(); props.onPasswordSignIn(); }} className="space-y-4">
            <label className="block text-sm font-medium text-neutral-900">Email address
              <input type="email" autoComplete="email" value={props.email} onChange={(e) => props.onEmailChange(e.target.value)} placeholder="Enter your email" className="mt-2 h-12 w-full rounded-md border border-neutral-300 px-4 text-base outline-none focus:border-[#2c1810] focus:ring-2 focus:ring-[#2c1810]/15" />
            </label>
            <label className="block text-sm font-medium text-neutral-900">Password
              <span className="relative mt-2 block">
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={props.password} onChange={(e) => props.onPasswordChange(e.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-md border border-neutral-300 px-4 pr-16 text-base outline-none focus:border-[#2c1810] focus:ring-2 focus:ring-[#2c1810]/15" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1 h-10 px-3 text-sm text-neutral-600">{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={props.rememberDevice} onChange={(e) => props.onRememberChange(e.target.checked)} className="h-4 w-4 accent-[#2c1810]" />Remember this device</label>
              <button type="button" onClick={props.onForgotPassword} className="min-h-11 underline underline-offset-4">Forgot password?</button>
            </div>
            <button type="submit" disabled={props.loading} className="h-13 w-full rounded-md bg-[#2c1810] text-sm font-semibold tracking-[0.16em] text-white transition hover:bg-[#43251a] disabled:cursor-wait disabled:opacity-60">{props.loading ? "SIGNING IN…" : "SIGN IN"}</button>
          </form>

          <div className="mt-7 border-t border-neutral-200 pt-5 text-center text-xs text-neutral-600">
            <p className="flex items-center justify-center gap-2"><LockKeyhole size={15} />Protected admin access</p>
            <p className="mt-2">Only approved administrator accounts can sign in.</p>
            <p className="mt-5">Need help? <a className="underline underline-offset-4" href="mailto:support@ahbraiding.com">Contact support</a></p>
          </div>
        </div>
      </section>
    </main>
  );
}
