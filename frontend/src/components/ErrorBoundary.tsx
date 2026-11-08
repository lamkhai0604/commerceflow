import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { failed: boolean }

/**
 * Catches rendering errors in page content (SF-12). The header, cart and account controls stay usable,
 * and no technical detail is shown to the customer.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // No client-side error reporting is configured; the error is intentionally not logged with details.
  }

  componentDidUpdate(previous: { resetKey: string }) {
    // Navigating to another page clears the error.
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong on this page</h1>
        <p className="mt-3 text-stone-700">Your cart is safe. Reload the page to try again, or go back to the home page.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-pine-700 px-5 font-semibold text-white hover:bg-pine-800">
            Reload page
          </button>
          <a href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-400 px-5 font-semibold text-stone-900 hover:border-stone-900">
            Back to home
          </a>
        </div>
      </section>
    );
  }
}
