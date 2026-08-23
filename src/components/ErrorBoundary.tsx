'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-center space-y-4 my-4">
          <div className="inline-flex p-3 rounded-full bg-red-500/20 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'Si è verificato un problema nella visualizzazione'}
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              {this.state.error?.message || 'Errore imprevisto'}
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            size="sm"
            className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Riprova
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
