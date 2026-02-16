import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="max-w-md text-center text-muted-foreground">
            Se a tela ficou preta após o deploy, confira no Vercel as variáveis de ambiente:{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> e{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
