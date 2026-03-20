export type TestStatus = 'idle' | 'running' | 'pass' | 'warning' | 'fail';

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export type ExternalTestType = 'dns' | 'whois' | 'ping' | 'portscan' | 'ssl' | 'http' | 'rbl';
export type InternalTestType = 'public_ip' | 'local_ip' | 'dns_speed' | 'latency' | 'speed' | 'wifi' | 'packet_loss' | 'dns_leak';

export interface User {
  id: string;
  email: string;
}
