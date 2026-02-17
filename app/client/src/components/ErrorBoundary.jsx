import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error Boundary — catches unhandled React render errors.
 * Shows a friendly error screen with retry + go home options.
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 * 
 * Or with a fallback:
 *   <ErrorBoundary fallback={<div>Custom error UI</div>}>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    console.error('ErrorBoundary caught:', error, errorInfo);

    // In production, you could send to an error tracking service here:
    // e.g. Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env?.DEV;

      return (
        <div
          className="min-h-[400px] flex items-center justify-center px-4 py-12"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-lg w-full">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              An unexpected error occurred. This has been noted and we'll look into it.
              Please try refreshing or go back to the homepage.
            </p>

            {/* Error details in development */}
            {isDev && this.state.error && (
              <details className="mb-6 text-left bg-gray-50 rounded-lg p-4 text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details (dev only)
                </summary>
                <pre className="overflow-auto text-xs text-red-700 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors w-full sm:w-auto justify-center"
                aria-label="Try loading this page again"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto justify-center"
                aria-label="Go to homepage"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
