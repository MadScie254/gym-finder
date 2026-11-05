import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-ink">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-muted">
          Reload the page. Your saved gyms stay on this device.
        </p>
        <button
          type="button"
          className="mt-6 rounded-xl bg-action px-4 py-3 text-white"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </main>
    );
  }
}
