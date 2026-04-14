import { useState } from 'react';
import Header from './components/Header';
import ScanSection from './components/ScanSection';


export default function App() {
  return (
    <main className="min-h-[500px] w-[380px] bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.2),_transparent_45%),linear-gradient(180deg,_#08111f_0%,_#0f172a_52%,_#111827_100%)] text-slate-100">
      <section className="flex min-h-[500px] flex-col px-5 py-5">
        <Header />
        <ScanSection />
      </section>
    </main>
  );
}
