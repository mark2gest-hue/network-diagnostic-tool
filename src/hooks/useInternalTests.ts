'use client';

import { useState } from 'react';
import { TestResult, InternalTestType } from '@/types/tests';

export function useInternalTests() {
  const [results, setResults] = useState<Record<InternalTestType, TestResult | null>>({
    public_ip: null,
    local_ip: null,
    dns_speed: null,
    latency: null,
    speed: null,
    wifi: null,
    packet_loss: null,
    dns_leak: null,
  });

  const [loading, setLoading] = useState<Record<InternalTestType, boolean>>({
    public_ip: false,
    local_ip: false,
    dns_speed: false,
    latency: false,
    speed: false,
    wifi: false,
    packet_loss: false,
    dns_leak: false,
  });

  const updateResult = (type: InternalTestType, result: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [type]: {
        id: type,
        name: type.replace('_', ' ').toUpperCase(),
        timestamp: Date.now(),
        status: 'idle',
        ...prev[type],
        ...result,
      } as TestResult
    }));
  };

  const runPublicIp = async () => {
    setLoading(prev => ({ ...prev, public_ip: true }));
    updateResult('public_ip', { status: 'running' });
    try {
      const res = await fetch('https://ipapi.co/json');
      const data = await res.json();
      updateResult('public_ip', {
        status: 'pass',
        result: {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country_name,
          org: data.org,
          asn: data.asn
        }
      });
    } catch {
      updateResult('public_ip', { status: 'fail', error: 'Failed to fetch public IP' });
    } finally {
      setLoading(prev => ({ ...prev, public_ip: false }));
    }
  };

  const runLocalIp = async () => {
    setLoading(prev => ({ ...prev, local_ip: true }));
    updateResult('local_ip', { status: 'running' });
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const ips: string[] = [];
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const parts = event.candidate.candidate.split(' ');
        const ip = parts[4];
        if (ip && !ips.includes(ip)) {
          ips.push(ip);
          updateResult('local_ip', { status: 'pass', result: { ips } });
        }
      };
      
      // Timeout after 3s
      setTimeout(() => {
        pc.close();
        if (ips.length === 0) {
          updateResult('local_ip', { status: 'warning', error: 'Could not detect local IP (Browser restriction?)' });
        }
      }, 3000);
    } catch {
      updateResult('local_ip', { status: 'fail', error: 'WebRTC not supported' });
    } finally {
      setLoading(prev => ({ ...prev, local_ip: false }));
    }
  };

  const runDnsSpeed = async () => {
    setLoading(prev => ({ ...prev, dns_speed: true }));
    updateResult('dns_speed', { status: 'running' });
    try {
      const start = performance.now();
      await fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' });
      const duration = performance.now() - start;
      updateResult('dns_speed', { 
        status: duration < 150 ? 'pass' : 'warning', 
        result: { duration: Math.round(duration) + 'ms' } 
      });
    } catch {
      updateResult('dns_speed', { status: 'fail', error: 'Failed to measure DNS speed' });
    } finally {
      setLoading(prev => ({ ...prev, dns_speed: false }));
    }
  };

  const runLatency = async () => {
    setLoading(prev => ({ ...prev, latency: true }));
    updateResult('latency', { status: 'running' });
    try {
      const start = performance.now();
      // Use 1.1.1.1 (Cloudflare) via fetch
      await fetch('https://1.1.1.1', { mode: 'no-cors', cache: 'no-store' });
      const duration = performance.now() - start;
      updateResult('latency', { 
        status: duration < 100 ? 'pass' : 'warning', 
        result: { latency: Math.round(duration) + 'ms', target: '1.1.1.1 (Cloudflare)' } 
      });
    } catch {
      updateResult('latency', { status: 'fail', error: 'Latency test failed' });
    } finally {
      setLoading(prev => ({ ...prev, latency: false }));
    }
  };

  const runWifi = async () => {
    setLoading(prev => ({ ...prev, wifi: true }));
    updateResult('wifi', { status: 'running' });
    interface NetworkInformation {
      connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
    }
    const nav = navigator as unknown as NetworkInformation;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      updateResult('wifi', {
        status: 'pass',
        result: {
          type: conn.type || 'unknown',
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink + ' Mbps',
          rtt: conn.rtt + ' ms',
          saveData: conn.saveData ? 'Yes' : 'No'
        }
      });
    } else {
      updateResult('wifi', { status: 'warning', error: 'Network Information API not supported' });
    }
    setLoading(prev => ({ ...prev, wifi: false }));
  };

  const runPacketLoss = async () => {
    setLoading(prev => ({ ...prev, packet_loss: true }));
    updateResult('packet_loss', { status: 'running' });
    let successes = 0;
    const total = 10;
    for (let i = 0; i < total; i++) {
        try {
            await fetch('https://1.1.1.1', { mode: 'no-cors', cache: 'no-store' });
            successes++;
        } catch {}
    }
    const loss = ((total - successes) / total) * 100;
    updateResult('packet_loss', {
        status: loss === 0 ? 'pass' : loss < 20 ? 'warning' : 'fail',
        result: { loss: loss + '%', transmitted: total, received: successes }
    });
    setLoading(prev => ({ ...prev, packet_loss: false }));
  };

  return {
    results,
    loading,
    runPublicIp,
    runLocalIp,
    runDnsSpeed,
    runLatency,
    runWifi,
    runPacketLoss,
    runAll: async () => {
        await runPublicIp();
        await runLocalIp();
        await runDnsSpeed();
        await runLatency();
        await runWifi();
        await runPacketLoss();
    }
  };
}
