import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface Props {
  children: ReactNode;
  resetKey: string;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render failure", { error, componentStack: info.componentStack });
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020912] p-5 text-slate-100">
        <div className="w-full max-w-xl rounded-[2rem] border border-rose-400/20 bg-slate-950/80 p-8 text-center shadow-2xl backdrop-blur-2xl" role="alert">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-400/10">
            <AlertTriangle className="h-6 w-6 text-rose-300" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Application error</p>
          <h1 className="mt-3 text-2xl font-bold text-white">This screen could not be displayed</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Your data is safe. Reload the application, or return to the dashboard and try again.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.location.reload()}><RefreshCw aria-hidden="true" /> Reload</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </main>
    );
  }
}
