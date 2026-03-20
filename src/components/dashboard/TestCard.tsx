'use client';

import { TestResult, TestStatus } from '@/types/tests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TestCardProps {
  test: TestResult | null;
  loading: boolean;
  onRun: () => void;
  title: string;
  description?: string;
}

const statusConfig: Record<TestStatus, { label: string; color: string; icon: React.ElementType }> = {
  idle: { label: 'In attesa', color: 'bg-zinc-800 text-zinc-400', icon: Play },
  running: { label: 'In corso', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
  pass: { label: 'Superato', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  warning: { label: 'Attenzione', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle },
  fail: { label: 'Fallito', color: 'bg-red-500/20 text-red-500', icon: XCircle },
};

export function TestCard({ test, loading, onRun, title, description }: TestCardProps) {
  const currentStatus: TestStatus = loading ? 'running' : (test?.status || 'idle');
  const config = statusConfig[currentStatus];
  const Icon = config.icon;

  return (
    <Card className="border-zinc-800 bg-zinc-900 overflow-hidden transition-all hover:border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm font-semibold text-zinc-200">{title}</CardTitle>
          {description && <p className="text-xs text-zinc-500">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Badge className={cn('px-2 py-0 h-6 border-none text-[10px] font-bold uppercase tracking-wider', config.color)}>
            <Icon className={cn('mr-1 w-3 h-3', currentStatus === 'running' && 'animate-spin')} />
            {config.label}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={onRun}
            disabled={loading}
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {test && test.status !== 'idle' && (
        <CardContent className="p-0 border-t border-zinc-800">
          <Accordion className="w-full">
            <AccordionItem value="result" className="border-none">
              <AccordionTrigger className="px-4 py-2 hover:no-underline text-xs text-zinc-400 transition-colors hover:text-white">
                Dettagli Risultato
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {test.error ? (
                  <div className="text-xs text-red-400 font-mono bg-red-950/20 p-2 rounded">
                    {test.error}
                  </div>
                ) : (
                  <pre className="text-[10px] font-mono bg-black/30 p-3 rounded overflow-x-auto text-zinc-300">
                    {JSON.stringify(test.result, null, 2)}
                  </pre>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}
