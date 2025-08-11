import React from 'react';
import { logger } from '../utils/logger.ts';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo?: { message: string; code?: string };
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorInfo: { message: error?.message || 'Unknown error' } };
  }

  componentDidCatch(error: any, info: any) {
    // In production, replace with logger abstraction
    logger.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorInfo: undefined });
    // Optionally could trigger a soft reset of state store
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-red-600">Something went wrong</h1>
          <p className="text-gray-600 max-w-md">
            An unexpected error occurred while rendering the viewer. You can try reloading the page.
          </p>
          {this.state.errorInfo?.message && (
            <pre className="text-xs bg-gray-100 p-3 rounded border border-gray-200 max-w-md overflow-auto">
              {this.state.errorInfo.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
