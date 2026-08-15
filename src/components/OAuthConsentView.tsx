import React, { useState, useMemo, useEffect } from "react";
import { Sparkles, Bot, Check } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { ChatGPTIcon } from "./ChatGPTIcon";

// Mirrors the server-side allowlist in gpt-action/index.ts — only ChatGPT
// Action callbacks may receive authorization codes.
const isAllowedRedirectUri = (uri: string): boolean => {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" &&
      ["chat.openai.com", "chatgpt.com"].includes(u.hostname) &&
      u.pathname.startsWith("/aip/") &&
      u.pathname.endsWith("/oauth/callback");
  } catch {
    return false;
  }
};

export const OAuthConsentView = ({
  setActiveTab,
  triggerToast,
  navigateTo,
}: {
  key?: string;
  setActiveTab: (tab: string) => void;
  triggerToast: (msg: string) => void;
  navigateTo?: (path: string) => void;
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const state = params.get("state") || "";

  // Preserve OAuth params in localStorage to handle redirects from Supabase login with a 10-minute expiry timestamp
  useEffect(() => {
    if (clientId && redirectUri) {
      localStorage.setItem("fitai_oauth_client_id", clientId);
      localStorage.setItem("fitai_oauth_redirect_uri", redirectUri);
      localStorage.setItem("fitai_oauth_state", state);
      localStorage.setItem("fitai_oauth_timestamp", Date.now().toString());
    }
  }, [clientId, redirectUri, state]);

  // Session and auto-approve hook is loaded below handleApprove

  // Google login — passes current consent URL as redirectTo so params survive after login
  const handleGoogleLoginForConsent = async () => {
    setIsSigningIn(true);
    try {
      const returnUrl = window.location.href;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: returnUrl,
        },
      });
      if (error) {
        triggerToast("Google login failed");
        setIsSigningIn(false);
      }
    } catch {
      triggerToast("Google login error");
      setIsSigningIn(false);
    }
  };

  const handleApprove = async () => {
    if (!clientId || !redirectUri) {
      triggerToast("Missing OAuth configuration parameters");
      return;
    }

    if (!isAllowedRedirectUri(redirectUri)) {
      triggerToast("This connection request has an untrusted redirect address and was blocked.");
      return;
    }

    setIsApproving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwtToken = sessionData.session?.access_token || "";

      if (!jwtToken) {
        triggerToast("Session expired. Please log in again.");
        setIsApproving(false);
        return;
      }

      const response = await fetch(
        `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/gpt-action/oauth/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            client_id: clientId,
            redirect_uri: redirectUri,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate authorization code");
      }

      const data = await response.json();
      const code = data.code;

      triggerToast("Authorized successfully! Redirecting...");
      window.location.href = `${redirectUri}?code=${code}&state=${encodeURIComponent(state)}`;
    } catch (err: any) {
      console.error(err);
      triggerToast(`Authorization failed: ${err.message}`);
      setIsApproving(false);
    }
  };

  const handleCancel = () => {
    setIsRejecting(true);
    triggerToast("Connection cancelled.");
    window.location.href = `${redirectUri}?error=access_denied&state=${encodeURIComponent(state)}`;
  };

  // Track the auth session. Approval is NEVER automatic — handing out an
  // authorization code requires the explicit Approve click below.
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!isMounted) return;
      setSession(sess);
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // NOT LOGGED IN — show login prompt, preserve consent URL through Google OAuth
  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25 }}
        className="px-6 py-12 max-w-[448px] mx-auto text-left font-sans flex flex-col justify-center min-h-[calc(100vh-80px)]"
      >
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-200/60 space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 relative z-10 py-2">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <Sparkles className="text-white w-5 h-5 fill-white" />
            </div>
            <span className="text-stone-300 text-sm font-bold">＋</span>
            <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center shadow-sm">
              <ChatGPTIcon className="text-white w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2 text-center relative z-10">
            <h2 className="text-xl font-black text-stone-900">Sign in to connect</h2>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider leading-relaxed">
              ChatGPT wants to connect to your FitAI account.
            </p>
          </div>

          <div className="space-y-3 pt-2 relative z-10 flex flex-col gap-2">
            <button
              onClick={handleGoogleLoginForConsent}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 disabled:opacity-60 border border-stone-200 text-stone-700 text-xs font-bold py-3.5 rounded-2xl active:scale-98 transition-all cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isSigningIn ? "Signing in..." : "Continue with Google"}
            </button>
            
            <button
              onClick={() => {
                if (navigateTo) {
                  navigateTo("/login");
                } else {
                  window.history.pushState(null, "", "/login");
                  window.dispatchEvent(new Event("pushstate-changed"));
                }
              }}
              className="w-full flex items-center justify-center gap-3 bg-stone-100 hover:bg-stone-200 border border-stone-200/40 text-stone-700 text-xs font-bold py-3.5 rounded-2xl active:scale-98 transition-all cursor-pointer shadow-sm"
            >
              Sign in with Email
            </button>
          </div>

          <p className="text-[8px] text-stone-400 text-center font-bold uppercase tracking-wider relative z-10">
            After signing in, you'll return here to approve the ChatGPT connection.
          </p>
        </div>
      </motion.div>
    );
  }

  // LOGGED IN — explicit consent required before releasing an auth code
  const redirectTrusted = isAllowedRedirectUri(redirectUri);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="px-6 py-12 max-w-[448px] mx-auto text-left font-sans flex flex-col justify-center min-h-[calc(100vh-80px)]"
    >
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-200/60 space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-center gap-3 relative z-10 py-2">
          <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
            <Sparkles className="text-white w-5 h-5 fill-white" />
          </div>
          <span className="text-stone-300 text-sm font-bold">＋</span>
          <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center shadow-sm">
            <ChatGPTIcon className="text-white w-5 h-5" />
          </div>
        </div>

        <div className="space-y-2 text-center relative z-10">
          <h2 className="text-xl font-black text-stone-900">Connect ChatGPT?</h2>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider leading-relaxed">
            ChatGPT will be able to log meals, weight, and wellness data and read your profile goals on your behalf.
          </p>
          <p className="text-[10px] text-stone-500 font-bold truncate">
            {session?.user?.email || ""}
          </p>
        </div>

        {!redirectTrusted ? (
          <div className="space-y-4 pt-2 relative z-10 flex flex-col gap-2">
            <p className="text-[10px] text-red-500 text-center font-bold uppercase tracking-wider">
              This request&apos;s redirect address is not a trusted ChatGPT callback. Connection blocked.
            </p>
            <button
              onClick={() => {
                if (navigateTo) {
                  navigateTo("/");
                } else {
                  window.history.pushState(null, "", "/");
                  window.dispatchEvent(new Event("pushstate-changed"));
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-3.5 rounded-2xl active:scale-98 transition-all cursor-pointer shadow-sm"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2 relative z-10 flex flex-col gap-2">
            <button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white text-xs font-bold py-3.5 rounded-2xl active:scale-98 transition-all cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" />
              {isApproving ? "Connecting..." : "Approve connection"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isApproving || isRejecting}
              className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 border border-stone-200/40 text-stone-700 text-xs font-bold py-3.5 rounded-2xl active:scale-98 transition-all cursor-pointer"
            >
              {isRejecting ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
