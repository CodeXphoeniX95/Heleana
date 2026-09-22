import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Une erreur d'affichage est survenue</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {this.state.error?.message || 'Une exception s\'est produite dans ce composant.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 bg-[#1B4F72] hover:bg-blue-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition"
          >
            <RefreshCw className="w-4 h-4" />
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
