import { Component } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Error boundary component to catch and display unhandled errors.
 * Prevents entire app from crashing due to component errors.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log error for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-destructive/10 p-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-destructive"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Something went wrong</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    An unexpected error occurred. Try reloading the page.
                  </p>
                </div>
                {this.state.error && (
                  <details className="w-full text-left">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Technical details
                    </summary>
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={this.handleReset}>
                    Try Again
                  </Button>
                  <Button onClick={this.handleReload}>
                    Reload Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
