import React, { Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/features/layout/AppShell';
import { OverviewPage } from '@/features/pages/OverviewPage';
import { GuidanceHardwarePage } from '@/features/pages/GuidanceHardwarePage';
import { PatentClaimsPage } from '@/features/pages/PatentClaimsPage';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn('Dynamic import failed, retrying once...', error);
      await new Promise(res => setTimeout(res, 300));
      return await factory();
    }
  });
}

const AnalyticsPage = lazyWithRetry(() =>
  import('@/features/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage }))
);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-card glass-g1 border border-white/[0.08] text-center space-y-3">
          <h3 className="font-display text-card-title text-text-1">Failed to load view</h3>
          <p className="text-xs text-text-3 font-ui max-w-md mx-auto">
            {this.state.error?.message ||
              'A module update occurred. Please refresh to load the latest build.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-pill glass-g3 text-gold border border-gold/40 text-xs font-ui font-semibold cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AnalyticsLoadingFallback = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-20 bg-white/[0.04] rounded-card" />
    <div className="h-14 bg-white/[0.03] rounded-pill" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-32 bg-white/[0.04] rounded-inner-card" />
      ))}
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="claims" element={<PatentClaimsPage />} />
          <Route path="patent-claims" element={<PatentClaimsPage />} />
          <Route path="guidance-hardware" element={<GuidanceHardwarePage />} />
          <Route
            path="analytics"
            element={
              <ErrorBoundary>
                <Suspense fallback={<AnalyticsLoadingFallback />}>
                  <AnalyticsPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
