import LedgerCard from '../components/LedgerCard';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold font-mono tracking-tight text-white">AURION OS</h1>
          <p className="text-[10px] text-zinc-500 font-mono">Telemetry Node Layer</p>
        </div>

        {/* This calls your live dynamic component */}
        <LedgerCard />

      </div>
    </main>
  );
}
