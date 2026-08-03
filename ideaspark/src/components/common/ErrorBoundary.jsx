/**
 * ErrorBoundary.jsx
 * ─────────────────────────────────────────────────────────────
 * Catches render/lifecycle errors anywhere in the wrapped subtree and
 * shows the existing ServerError fallback UI instead of an unmounted,
 * blank app.
 *
 * Previously there was no boundary anywhere in App.jsx or the router,
 * so a single component throwing during render (a null-ref, a bad
 * .map() over an unexpected API shape, etc.) unmounted the entire
 * React tree — including AuthProvider and NotificationProvider state
 * that a boundary placed inside them would have preserved.
 *
 * Class component because getDerivedStateFromError / componentDidCatch
 * have no hook equivalent yet.
 * ─────────────────────────────────────────────────────────────
 */

import { Component } from 'react';
import { ServerError } from './ErrorStates.premium';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep this a plain console.error, not the SLF4J-style backend logger —
    // this is the frontend's existing convention (see main.jsx / axiosInstance.jsx).
    console.error('ErrorBoundary caught a render error:', error, info);
  }

  handleRetry = () => {
    // A render-time throw means component state is suspect; the safest
    // reset is to clear our own flag and let React remount the subtree
    // fresh rather than trying to recover the errored tree in place.
    this.setState({ hasError: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <ServerError
          message="Something on this page broke unexpectedly. You can try again or head back home."
          onRetry={this.handleRetry}
          onAction={this.handleGoHome}
          actionLabel="Go Home"
        />
      );
    }
    return this.props.children;
  }
}