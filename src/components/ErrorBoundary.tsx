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
          {/* GOV.UK Error Summary */}
          <div role="alert" aria-labelledby="error-summary-title" className="border-l-4 border-red-600 bg-red-50 p-4 max-w-2xl">
            <h1 id="error-summary-title" className="text-xl font-semibold text-red-800 mb-2">
              There is a problem
            </h1>
            <p className="text-red-700 mb-3">
              An unexpected error occurred while rendering the viewer. You can try one of the following options:
            </p>
            <ul className="list-disc list-inside text-red-700 space-y-1 mb-4">
              <li>Try a different IIIF resource URL</li>
              <li>Reload the page to reset the application</li>
            </ul>
            {this.state.errorInfo?.message && (
              <details className="text-left">
                <summary className="text-red-800 font-medium cursor-pointer">Technical details</summary>
                <pre className="text-xs bg-red-100 p-3 rounded border border-red-200 mt-2 overflow-auto">
                  {this.state.errorInfo.message}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, errorInfo: undefined });
                window.location.href = window.location.pathname; // Clear URL params
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              Try Different URL
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
