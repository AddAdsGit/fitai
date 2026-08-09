import React from "react";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface AuthScreenProps {
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  navigateTo: (path: string) => void;
  handleGoogleLogin: () => void;
  authMode: "login" | "signup" | "forgot";
  setAuthMode: (mode: "login" | "signup" | "forgot") => void;
  handleForgotPassword: (e: React.FormEvent) => void;
  handleEmailSignIn: (e: React.FormEvent) => void;
  handleEmailSignUp: (e: React.FormEvent) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  authLoading: boolean;
  showDeveloperBypass: boolean;
  setShowDeveloperBypass: (show: boolean) => void;
  loginUsername: string;
  setLoginUsername: (name: string) => void;
  handleLoginSubmit: () => void;
}

export function AuthScreen({
  toastMessage,
  setToastMessage,
  navigateTo,
  handleGoogleLogin,
  authMode,
  setAuthMode,
  handleForgotPassword,
  handleEmailSignIn,
  handleEmailSignUp,
  email,
  setEmail,
  password,
  setPassword,
  authLoading,
  showDeveloperBypass,
  setShowDeveloperBypass,
  loginUsername,
  setLoginUsername,
  handleLoginSubmit,
}: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-orange-100 p-8 max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col justify-between">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[380px] z-[250] pointer-events-auto"
          >
            <div className="bg-stone-900/95 backdrop-blur-md text-white text-xs font-bold py-3.5 px-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 font-sans">
              <span className="flex-1 tracking-tight leading-tight">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="my-auto space-y-8 py-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3" onClick={() => navigateTo("/")} style={{ cursor: 'pointer' }}>
          <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-200 flex items-center justify-center">
            <Sparkles className="text-white w-8 h-8 fill-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-center mt-2">
            Fit<span className="text-orange-500">AI</span>
          </h1>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center">
            Personalized Nutrition Engine
          </p>
        </div>

        {/* Authentication Actions */}
        <div className="space-y-5">
          <>
            {/* Google Authentication Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Subtle Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-[9px] font-black tracking-widest text-stone-300 uppercase">OR</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            {/* Standard Email/Password & Forgot Password Forms */}
            {authMode === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1 text-center">
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    Reset Password
                  </p>
                  <p className="text-[9px] text-stone-400 font-medium leading-relaxed">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all"
                />

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  >
                    {authLoading ? "Sending Link..." : "Send Reset Link"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="w-full text-center text-[9px] text-stone-400 hover:text-stone-500 font-bold tracking-wider uppercase py-1 bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={authMode === "login" ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all"
                />

                <div className="relative">
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/50 shadow-sm transition-all"
                  />
                  
                  {authMode === "login" && (
                    <div className="text-right mt-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => setAuthMode("forgot")}
                        className="text-[9px] text-stone-400 hover:text-orange-500 font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200/40 disabled:opacity-60 disabled:pointer-events-none cursor-pointer mt-1"
                >
                  {authLoading 
                    ? (authMode === "login" ? "Signing In..." : "Creating Account...") 
                    : (authMode === "login" ? "Sign In" : "Create Account")
                  }
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                    className="text-[9px] text-stone-400 hover:text-stone-600 font-bold uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-0"
                  >
                    {authMode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </form>
            )}

            {/* Minimal Developer Mode Bypass */}
            {import.meta.env.DEV && (
              <>
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowDeveloperBypass(!showDeveloperBypass)}
                    className="text-[8px] text-stone-400 hover:text-stone-500 font-bold uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-0"
                  >
                    {showDeveloperBypass ? "Close Developer Bypass" : "Developer Bypass"}
                  </button>
                </div>

                {/* Username Input Form (Conditional Bypass) */}
                <AnimatePresence>
                  {showDeveloperBypass && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-2 overflow-hidden"
                    >
                      <input
                        type="text"
                        placeholder="Enter developer username (e.g. johndoe)"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLoginSubmit();
                        }}
                        className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-700 placeholder-stone-400 focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                      />
                      <button
                        onClick={handleLoginSubmit}
                        disabled={!loginUsername.trim()}
                        className="w-full bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-black uppercase tracking-wider py-3.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      >
                        Bypass Authentication
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[8px] text-stone-300 font-bold tracking-widest uppercase">
        © 2026 FitAI. All rights reserved.
      </div>
    </div>
  );
}
