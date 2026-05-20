import LedgerView from '@/components/LedgerView';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-12">
      <div className="container mx-auto px-4 space-y-8">
        <div className="max-w-6xl mx-auto p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">System Status Overview</h2>
          <p className="text-zinc-400 text-sm">AURION OS Autopilot Engine is running.</p>
        </div>
        <LedgerView />
      </div>
    </main>
  );
}
