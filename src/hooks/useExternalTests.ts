'use client';

import { useState } from 'react';
import { TestResult, ExternalTestType } from '@/types/tests';

export function useExternalTests() {
  const [results, setResults] = useState<Record<ExternalTestType, TestResult | null>>({
    dns: null,
    whois: null,
    ping: null,
    portscan: null,
    ssl: null,
    http: null,
    rbl: null,
    traceroute: null,
    ipv6: null,
  });

  const [loading, setLoading] = useState<Record<ExternalTestType, boolean>>({
    dns: false,
    whois: false,
    ping: false,
    portscan: false,
    ssl: false,
    http: false,
    rbl: false,
    traceroute: false,
    ipv6: false,
  });

  const updateResult = (type: ExternalTestType, result: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [type]: {
        id: type,
        name: type.toUpperCase(),
        timestamp: Date.now(),
        status: 'idle',
        ...prev[type],
        ...result,
      } as TestResult
    }));
  };

  const runTest = async (type: ExternalTestType, target: string) => {
    if (!target) return;
    setLoading(prev => ({ ...prev, [type]: true }));
    updateResult(type, { status: 'running' });

    try {
      const paramName = type === 'rbl' ? 'ip' : (['dns', 'whois', 'ssl', 'ipv6'].includes(type) ? 'domain' : 'target');
      const res = await fetch(`/api/tests/${type}?${paramName}=${encodeURIComponent(target)}`);
      const data = await res.json();

      if (res.ok) {
        updateResult(type, { status: data.status || 'pass', result: data });
      } else {
        updateResult(type, { status: 'fail', error: data.error });
      }
    } catch {
      updateResult(type, { status: 'fail', error: 'Request failed' });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return {
    results,
    loading,
    runTest,
    runAll: async (target: string) => {
      const tests: ExternalTestType[] = ['dns', 'whois', 'ping', 'portscan', 'ssl', 'http', 'traceroute', 'ipv6'];
      for (const t of tests) {
        await runTest(t, target);
      }
    }
  };
}
