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
    propagation: null,
    ttfb: null,
    reverse_dns: null,
    protocols: null,
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
    propagation: false,
    ttfb: false,
    reverse_dns: false,
    protocols: false,
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
      const endpoint = type === 'reverse_dns' ? 'reverse-dns' : type === 'protocols' ? 'http-protocols' : type;
      const paramName = ['dns', 'whois', 'ssl', 'ipv6', 'propagation'].includes(type) ? 'domain' : type === 'rbl' ? 'ip' : 'target';
      const res = await fetch(`/api/tests/${endpoint}?${paramName}=${encodeURIComponent(target)}`);
      const data = await res.json();

      if (res.ok) {
        updateResult(type, { status: data.status || 'pass', result: data });
      } else {
        updateResult(type, { status: 'fail', error: data.error });
      }
    } catch {
      updateResult(type, { status: 'fail', error: 'Test fallito' });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return {
    results,
    loading,
    runTest,
    runAll: async (target: string) => {
      const tests: ExternalTestType[] = [
        'dns', 
        'propagation', 
        'ttfb', 
        'protocols', 
        'traceroute', 
        'ipv6', 
        'ping', 
        'portscan', 
        'ssl', 
        'whois', 
        'reverse_dns', 
        'http'
      ];
      await Promise.allSettled(tests.map(t => runTest(t, target)));
    }
  };
}
