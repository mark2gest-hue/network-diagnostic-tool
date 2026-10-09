'use client';

import { useInternalTests } from '@/hooks/useInternalTests';
import { LanScanner } from './LanScanner';
import { SpeedtestWidget } from './SpeedtestWidget';
import { Button } from '@/components/ui/button';
import { RowList, ExpandableRow, StatusPill } from '@/components/ui/nd';
import { ResultRenderer } from './ResultRenderer';

export function InternalTests() {
  const { 
    results, 
    loading, 
    runPublicIp, 
    runLocalIp, 
    runDnsSpeed, 
    runLatency, 
    runWifi, 
    runPacketLoss, 
    runNetworkIntegrity
  } = useInternalTests();

  const getPill = (test: any, isLoading: boolean) => {
    if (isLoading) return <StatusPill tone="pending">In corso</StatusPill>;
    if (!test || test.status === 'idle') return <StatusPill tone="pending">In attesa</StatusPill>;
    const s = String(test.status).toLowerCase();
    if (['pass', 'success', 'ok'].includes(s)) return <StatusPill tone="ok">Superato</StatusPill>;
    if (['warn', 'warning', 'attention'].includes(s)) return <StatusPill tone="warn">Attenzione</StatusPill>;
    return <StatusPill tone="crit">Critico</StatusPill>;
  };

  return (
    <div className="space-y-8">
      {/* Intestazione Sezione */}
      <div className="border-b border-border pb-4">
        <h1 className="text-[1.625rem] font-bold leading-tight text-foreground">
          Rete interna e WiFi
        </h1>
        <p className="mt-1 text-[0.9375rem] text-ink-2">
          Velocità, qualità della connessione e dispositivi presenti sulla rete locale.
        </p>
      </div>

      {/* Speedtest Widget */}
      <SpeedtestWidget />

      {/* 7 Test di Rete come righe */}
      <div className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-foreground">
          Test di rete <span className="text-xs font-normal text-ink-3">· 7 controlli</span>
        </h2>

        <RowList>
          <ExpandableRow
            status={getPill(results.public_ip, loading.public_ip)}
            title="IP pubblico e ISP"
            summary="Geolocalizzazione, ASN e dati del provider."
            action={
              <Button variant="outline" size="sm" onClick={runPublicIp} disabled={loading.public_ip} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.public_ip && <ResultRenderer testId="public_ip" result={results.public_ip.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.local_ip, loading.local_ip)}
            title="IP locale (WebRTC)"
            summary="Indirizzo IP privato nella rete LAN."
            action={
              <Button variant="outline" size="sm" onClick={runLocalIp} disabled={loading.local_ip} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.local_ip && <ResultRenderer testId="local_ip" result={results.local_ip.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.dns_speed, loading.dns_speed)}
            title="Velocità di risoluzione DNS"
            summary="Tempo di fetch verso i nodi edge CDN."
            action={
              <Button variant="outline" size="sm" onClick={runDnsSpeed} disabled={loading.dns_speed} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.dns_speed && <ResultRenderer testId="dns_speed" result={results.dns_speed.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.latency, loading.latency)}
            title="Latenza Cloudflare"
            summary="Ping HTTP verso Cloudflare 1.1.1.1."
            action={
              <Button variant="outline" size="sm" onClick={runLatency} disabled={loading.latency} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.latency && <ResultRenderer testId="latency" result={results.latency.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.wifi, loading.wifi)}
            title="Qualità connessione e RTT"
            summary="Stima di banda in downlink e latenza di rete."
            action={
              <Button variant="outline" size="sm" onClick={runWifi} disabled={loading.wifi} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.wifi && <ResultRenderer testId="wifi" result={results.wifi.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.packet_loss, loading.packet_loss)}
            title="Perdita pacchetti (burst)"
            summary="Stima della perdita su 10 richieste sequenziali."
            action={
              <Button variant="outline" size="sm" onClick={runPacketLoss} disabled={loading.packet_loss} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.packet_loss && <ResultRenderer testId="packet_loss" result={results.packet_loss.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.network_integrity, loading.network_integrity)}
            title="Integrità DNS e path MTU"
            summary="Verifica assenza di DNS hijacking e stima MTU 1500 / MSS 1460."
            action={
              <Button variant="outline" size="sm" onClick={() => runNetworkIntegrity()} disabled={loading.network_integrity} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.network_integrity && <ResultRenderer testId="network_integrity" result={results.network_integrity.result} />}
          </ExpandableRow>
        </RowList>
      </div>

      {/* Scansione rete locale */}
      <div className="space-y-3 pt-2">
        <h2 className="text-[1.0625rem] font-bold text-foreground">Scansione rete locale</h2>
        <LanScanner />
      </div>
    </div>
  );
}
