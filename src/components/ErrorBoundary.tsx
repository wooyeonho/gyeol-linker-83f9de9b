import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('App error:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
          <span className="material-icons-round text-4xl text-muted-foreground/20">error_outline</span>
          <p className="text-sm text-muted-foreground">Something went wrong</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            className="text-primary text-xs">Reload</button>
        </main>
      );
    }
    return this.props.children;
  }
}