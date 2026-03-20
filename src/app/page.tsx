import dynamic from 'next/dynamic';
const SecurityAudit = dynamic(() => import('@/components/dashboard/SecurityAudit').then(mod => mod.SecurityAudit), { ssr: false });
import { ExternalTests } from '@/components/dashboard/ExternalTests';
import { InternalTests } from '@/components/dashboard/InternalTests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Wifi, Command, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-700">
      <div className="flex flex-col gap-2 mb-8 items-center text-center">
        <div className="bg-blue-600/10 p-3 rounded-2xl mb-2">
          <Command className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Network <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">Diagnostic</span> Tool
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
            Diagnostica la tua connettività interna ed esterna con un&apos;unica interfaccia moderna e veloce.
        </p>
      </div>

      <Tabs defaultValue="external" className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="bg-zinc-900 border border-zinc-800 h-12 p-1 gap-1">
            <TabsTrigger 
              value="external" 
              className="px-6 data-active:bg-zinc-800 data-active:text-white transition-all"
            >
              <Globe className="w-4 h-4 mr-2" />
              External Tests
            </TabsTrigger>
            <TabsTrigger 
              value="internal" 
              className="px-6 data-active:bg-zinc-800 data-active:text-white transition-all"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Internal / WiFi
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="px-6 data-active:bg-zinc-800 data-active:text-white transition-all"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Security Audit
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="external" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
            <ExternalTests />
          </div>
        </TabsContent>

        <TabsContent value="internal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
            <InternalTests />
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
            <SecurityAudit />
          </div>
        </TabsContent>
      </Tabs>
      
      <footer className="mt-16 text-center text-zinc-500 text-xs border-t border-zinc-800 pt-8 pb-4">
        &copy; {new Date().getFullYear()} NetworkDiag Tool &bull; Made with 💙 for Network Engineers
      </footer>
    </div>
  );
}
