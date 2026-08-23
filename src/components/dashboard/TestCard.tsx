'use client';

import React from 'react';
import { TestResult, TestStatus } from '@/types/tests';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultRenderer } from './ResultRenderer';

interface TestCardProps {
  test: TestResult | null;
  loading: boolean;
  onRun: () => void;
  title: string;
  description?: string;
  icon?: React.ElementType;
}

const statusConfig: Record<TestStatus, { label: string; badgeClass: string; icon: React.ElementType; glowClass: string }> = {
  idle: { 
    label: 'In Attesa', 
    badgeClass: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50', 
    icon: Play,
    glowClass: ''
  },
  running: { 
    label: 'In Corso', 
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse', 
    icon: Loader2,
    glowClass: 'border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
  },
  pass: { 
    label: 'Superato', 
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', 
    icon: CheckCircle2,
    glowClass: 'hover:border-emerald-500/40'
  },
  warning: { 
    label: 'Attenzione', 
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40', 
    icon: AlertTriangle,
    glowClass: 'hover:border-amber-500/40'
  },
  fail: { 
    label: 'Fallito', 
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40', 
    icon: XCircle,
    glowClass: 'hover:border-red-500/40'
  },
};

export function TestCard({ test, loading, onRun, title, description, icon: CustomIcon }: TestCardProps) {
  const currentStatus: TestStatus = loading ? 'running' : (test?.status || 'idle');
  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  return (
    <Card className={cn(
      "glass-card border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between",
      config.glowClass
    )}>
      <div>
        <CardHeader className="p-4 sm:p-5 flex flex-row items-start justify-between space-y-0 gap-3 border-b border-zinc-800/50 bg-zinc-900/30">
          <div className="flex items-start gap-3">
            {CustomIcon && (
              <div className="p-2 rounded-xl bg-zinc-800/70 border border-zinc-700/50 text-blue-400 mt-0.5">
                <CustomIcon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h3>
              {description && <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{description}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('px-2.5 py-0.5 h-6 text-[10px] font-bold uppercase tracking-wider', config.badgeClass)}>
              <StatusIcon className={cn('mr-1.5 w-3 h-3', currentStatus === 'running' && 'animate-spin')} />
              {config.label}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
              onClick={onRun}
              disabled={loading}
              title={`Esegui ${title}`}
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardHeader>
        
        {test && test.status !== 'idle' && (
          <CardContent className="p-4 sm:p-5">
            {test.error ? (
              <div className="text-xs text-red-400 font-mono bg-red-950/30 border border-red-800/40 p-3 rounded-xl flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{test.error}</span>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <ResultRenderer testId={test.id} result={test.result} />
              </div>
            )}
          </CardContent>
        )}
      </div>

      {test && test.timestamp && (
        <div className="px-4 py-2 bg-zinc-950/40 border-t border-zinc-800/40 text-[10px] text-zinc-500 font-mono flex justify-between items-center">
          <span>Ultimo test:</span>
          <span>{new Date(test.timestamp).toLocaleTimeString()}</span>
        </div>
      )}
    </Card>
  );
}
