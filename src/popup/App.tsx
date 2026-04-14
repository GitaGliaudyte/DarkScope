import { useState } from 'react';
import { Button } from '@/components/ui/button';


export default function App() {
  return (
    <main className="min-h-[500px] w-[380px] bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.2),_transparent_45%),linear-gradient(180deg,_#08111f_0%,_#0f172a_52%,_#111827_100%)] text-slate-100">
      <section className="flex min-h-[500px] flex-col px-5 py-5">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.45em] text-emerald-300/80">DARKSCOPE</p>
          <br/>
          <Button>
            Run Scan
          </Button>
        </div>
      </section>
    </main>
  );
}
