'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  externalResults: Record<string, unknown>;
  internalResults: Record<string, unknown>;
}

export function ExportButton({ externalResults, internalResults }: ExportButtonProps) {
  const handleExport = () => {
    interface ExportData {
      timestamp: string;
      platform: string;
      userAgent: string;
      results: {
        external: Record<string, unknown>;
        internal: Record<string, unknown>;
      };
    }

    const data: ExportData = {
      timestamp: new Date().toISOString(),
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      results: {
        external: Object.fromEntries(
          Object.entries(externalResults).map(([key, val]) => [key, val as unknown])
        ),
        internal: Object.fromEntries(
          Object.entries(internalResults).map(([key, val]) => [key, val as unknown])
        ),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-diag-results-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasResults = Object.values(externalResults).some(r => r !== null) || 
                     Object.values(internalResults).some(r => r !== null);

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={!hasResults}
      className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
    >
      <Download className="w-4 h-4 mr-2" />
      Esporta JSON
    </Button>
  );
}
