import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return (this.props.fallback as (error: Error) => ReactNode)(this.state.error);
      }
      return this.props.fallback ?? (
        <div className="p-4 rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm">
          <p className="font-medium mb-1">Failed to render content</p>
          <p className="opacity-80">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
