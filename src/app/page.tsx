import dynamic from 'next/dynamic';
const SecurityAudit = dynamic(() => import('@/components/dashboard/SecurityAudit').then(mod => mod.SecurityAudit), { ssr: false });
import { ExternalTests } from '@/components/dashboard/ExternalTests';
import { InternalTests } from '@/components/dashboard/InternalTests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Wifi, ShieldCheck, Zap } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="relative min-h-screen pb-16 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-[400px] h-[300px] bg-emerald-600/10 blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">
        {/* Main Hero Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-blue-400 fill-current" />
            Network & Security Operations Suite
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
            Diagnostica di Rete & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Security Compliance
            </span>
          </h1>

          <p className="text-zinc-400 max-w-2xl text-base sm:text-lg leading-relaxed">
            Monitora latenza, DNS, porte aperte e postura crittografica con test server-side ad alte prestazioni e diagnostica browser in tempo reale.
          </p>
        </div>

        {/* Diagnostic Tabs */}
        <Tabs defaultValue="external" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-zinc-900/80 border border-zinc-800 p-1.5 h-auto gap-2 rounded-2xl backdrop-blur-xl shadow-2xl flex-wrap justify-center">
              <TabsTrigger 
                value="external" 
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 data-active:bg-gradient-to-r data-active:from-blue-600 data-active:to-indigo-600 data-active:text-white data-active:shadow-lg data-active:shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                External Tests
              </TabsTrigger>

              <TabsTrigger 
                value="internal" 
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 data-active:bg-gradient-to-r data-active:from-emerald-600 data-active:to-teal-600 data-active:text-white data-active:shadow-lg data-active:shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                Internal / WiFi
              </TabsTrigger>

              <TabsTrigger 
                value="security" 
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 data-active:bg-gradient-to-r data-active:from-purple-600 data-active:to-indigo-600 data-active:text-white data-active:shadow-lg data-active:shadow-purple-600/20 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Security Audit
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="external" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl">
              <ExternalTests />
            </div>
          </TabsContent>

          <TabsContent value="internal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl">
              <InternalTests />
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl">
              <SecurityAudit />
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-zinc-500 text-xs gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Network Diagnostic & Security Operations Center</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} NetworkDiag Tool &bull; Powered by LibSQL & Edge Next.js
          </div>
        </footer>
      </div>
    </div>
  );
}
