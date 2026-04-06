import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./error-state";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    return;
  }

  private readonly handleReset = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4">
          <ErrorState
            message={this.state.error.message}
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
