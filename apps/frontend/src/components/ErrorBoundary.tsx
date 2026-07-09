import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@streamforge/ui";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1200')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/90 to-[#141414]" />

          <div className="relative z-10 text-center max-w-lg space-y-6">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white text-shadow">
              Something went wrong.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mx-auto">
              An unexpected error has occurred. Please try reloading the page or go back home.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                variant="primary"
                onClick={this.handleReload}
                className="nf-button h-12 px-8 font-black text-black"
              >
                Reload Page
              </Button>
              <a
                href="/"
                className="nf-button inline-flex h-12 items-center justify-center rounded border border-white/20 bg-black/45 px-8 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Back to Home
              </a>
            </div>
            <div className="pt-8 border-t border-zinc-800 text-xs tracking-widest text-zinc-500 font-mono">
              ERROR CODE <span className="text-[#e50914] font-black">ERR-CLIENT-CRASH</span>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
