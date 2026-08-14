import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Startup Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('agm_has_started_work');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#0d1117] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-wide">AGM Workstation Notice</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The workstation encountered a runtime startup event. Local web persistence is active and ready.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-left text-xs font-mono text-amber-300/90 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Workstation
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
