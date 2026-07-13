import React from "react";
import { Flame, Sparkles, Camera, Bot, Zap, ArrowRight, Activity, Shield } from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  isLoggedIn: boolean;
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ isLoggedIn, onNavigate }) => {
  return (
    <div className="min-h-screen bg-stone-950 text-[#FAF9F6] font-sans selection:bg-orange-500/20 overflow-x-hidden flex flex-col justify-between">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent blur-[120px] pointer-events-none z-0" />
      
      {/* Header */}
      <header className="relative z-10 px-6 py-5 max-w-5xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate("/")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="text-white w-5.5 h-5.5 fill-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Fit<span className="text-orange-500">AI</span>
          </span>
        </div>
        
        <button
          onClick={() => onNavigate(isLoggedIn ? "/app" : "/login")}
          className="bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
        >
          {isLoggedIn ? "Go to App" : "Sign In"}
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center py-12 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 fill-orange-400 animate-pulse" />
            Next-Gen Nutrition Engine
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight font-display">
            AI-Powered Nutrition.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
              Engineered for You.
            </span>
          </h1>
          
          <p className="text-sm sm:text-base text-stone-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Track meals instantly with photo scanning, receive advice from your personalized AI coach, and sync automatically with Notion, Telegram, and Custom ChatGPT Actions.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate(isLoggedIn ? "/app" : "/login")}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-widest px-8 py-4.5 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggedIn ? "Open Dashboard" : "Get Started for Free"}
              <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
            </button>
            
            <a
              href="#features"
              className="text-xs font-bold text-stone-400 hover:text-white py-3 px-6 transition-colors"
            >
              Learn how it works
            </a>
          </div>
        </motion.div>

        {/* Floating Mockup Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-16 w-full max-w-lg relative"
        >
          <div className="absolute inset-0 bg-orange-500/10 rounded-[32px] blur-[30px] -z-10" />
          <div className="bg-stone-900/60 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Camera className="text-orange-400 w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">AI Log: Grilled Chicken Salad</h4>
                  <span className="text-[10px] text-stone-400 font-semibold">12:30 PM • Lunch</span>
                </div>
              </div>
              <span className="text-stone-300 text-xs font-black">≈ 420 kcal</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="block text-[10px] font-bold text-stone-400">Protein</span>
                <span className="text-xs font-black text-white">38g</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="block text-[10px] font-bold text-stone-400">Carbs</span>
                <span className="text-xs font-black text-white">12g</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="block text-[10px] font-bold text-stone-400">Fats</span>
                <span className="text-xs font-black text-white">22g</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="block text-[10px] font-bold text-stone-400">Fiber</span>
                <span className="text-xs font-black text-white">6g</span>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 flex gap-2">
              <Bot className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-stone-300 font-medium leading-relaxed">
                <strong className="text-orange-400 font-bold">Mascot Coach:</strong> Great meal choice! This has high protein content and moderate fats. Meets 25% of your daily protein target.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20 bg-stone-950 max-w-5xl mx-auto w-full border-t border-white/5">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display">Engineered for Performance</h2>
          <p className="text-xs text-stone-400 font-semibold max-w-md mx-auto">
            Packed with advanced features to automate your tracking and keep you accountable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Camera className="text-orange-400 w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">AI Photo Scanning</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-medium">
              Snap a picture of your plate. Our integration uses Gemini to analyze ingredients, calculate macro distributions, and auto-populate your logs instantly.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Bot className="text-amber-400 w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Mascot AI Coaching</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-medium">
              A highly customizable AI companion that maintains memory of your nutritional preferences, allergens, and dietary goals to deliver hyper-targeted advice.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Zap className="text-yellow-400 w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Robust Integrations</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-medium">
              Sync automatically with Notion pages, set up Telegram webhook bot alerts for daily summaries, or run direct actions via our Custom ChatGPT Action plugin.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/5 max-w-5xl mx-auto w-full text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
          © 2026 FitAI. All rights reserved.
        </span>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 text-stone-500" />
            Secure Account Isolation
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5 text-stone-500" />
            Vercel Optimized
          </div>
        </div>
      </footer>
    </div>
  );
};
