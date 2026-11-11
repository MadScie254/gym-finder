import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

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
      <main>
        <EmptyState
          title="Something went wrong"
          action={<Button variant="primary" icon={RefreshCw} onClick={() => window.location.reload()}>Reload</Button>}
        >
          <p>Reload the page. Your saved gyms stay on this device.</p>
        </EmptyState>
      </main>
    );
  }
}
