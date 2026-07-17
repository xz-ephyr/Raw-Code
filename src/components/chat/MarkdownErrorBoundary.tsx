import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  rawContent?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MarkdownErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MarkdownErrorBoundary] Caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      if (this.props.rawContent) {
        return (
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words py-2 font-sans">
            {this.props.rawContent}
          </pre>
        );
      }
      return (
        <div className="text-sm text-muted-foreground italic py-2">
          This content could not be rendered.
        </div>
      );
    }
    return this.props.children;
  }
}
