import React, { Component, ErrorInfo, ReactNode } from 'react';
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
    console.error('Unhandled UI exception in ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-main)',
          }}
        >
          <div className="empty-state" style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="empty-state-icon" style={{ color: 'var(--accent-red)' }}>
              <AlertTriangle size={36} />
            </div>
            <h2 className="empty-state-title">Something went wrong</h2>
            <p className="empty-state-desc">
              The application encountered an unexpected error. Your saved data is safely stored on the server.
            </p>
            {this.state.error?.message && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '20px',
                  color: 'var(--text-muted)',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {this.state.error.message}
              </div>
            )}
            <button className="btn btn-primary" onClick={this.handleReload}>
              <RefreshCw size={16} /> Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
