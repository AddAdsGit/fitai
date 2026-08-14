import React, { Component, ErrorInfo, ReactNode } from "react";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("FitAI Self-Healing UI caught an unhandled error:", error, errorInfo);
  }

  private handleRecover = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      // Clear temporary app draft caches if any, keeping profile authentication
      const keysToKeep = ["sb-", "supabase.auth.token"];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some((k) => key.startsWith(k))) {
          if (key.startsWith("fitai_draft_") || key.startsWith("fitai_cache_")) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Storage reset exception:", e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-orange-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white/70 backdrop-blur-xl p-8 rounded-[36px] border border-white/90 shadow-2xl shadow-orange-100/30 text-center space-y-6 animate-fade-in">
            {/* Self-Healing Brand Icon */}
            <div className="w-16 h-16 mx-auto rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-inner">
              <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full inline-block">
                Self-Healing Guard Active
              </div>
              <h2 className="text-xl font-black text-orange-950 tracking-tight">
                Everything is Safe
              </h2>
              <p className="text-xs text-orange-900/60 font-medium leading-relaxed max-w-xs mx-auto">
                FitAI detected an unexpected display glitch and protected your logged meals and records.
              </p>
            </div>

            {/* Recovery Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={this.handleRecover}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restore & Continue</span>
              </button>

              <button
                onClick={this.handleHardReset}
                className="w-full py-2.5 text-[11px] font-bold text-orange-900/50 hover:text-orange-900 transition-colors cursor-pointer bg-transparent border-none"
              >
                Clear Temp Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
