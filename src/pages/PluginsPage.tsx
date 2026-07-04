import { useState, useEffect } from 'react';
import { PluginTabs } from '../components/plugins/PluginTabs';

const CARDS = [
  { title: 'Web Search', description: 'Browse the web for real-time information and data.', color: 'from-blue-500 to-cyan-500' },
  { title: 'Code Runner', description: 'Execute code in Python, JavaScript, and more.', color: 'from-emerald-500 to-teal-500' },
  { title: 'Image Gen', description: 'Generate images from text descriptions.', color: 'from-purple-500 to-pink-500' },
];

export const PluginsPage = () => {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c === CARDS.length - 1 ? 0 : c + 1));

  useEffect(() => {
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex-1 bg-[#1a1a1a] overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(1200px, 100%)' }}>
        <div className="relative w-full h-[200px] rounded-lg overflow-hidden">
          <div
            className="flex h-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {CARDS.map((card, i) => (
              <div
                key={i}
                className={`min-w-0 w-full h-full shrink-0 bg-gradient-to-br ${card.color} flex items-center justify-center text-white`}
              >
                <div className="text-center">
                  <h1 className="text-4xl font-bold tracking-tight">{card.title}</h1>
                  <p className="mt-2 text-lg text-white/80">{card.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all backdrop-blur-sm"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 13L11 8L6 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${
                  i === current ? 'bg-white w-5 h-2' : 'bg-white/50 w-2 h-2'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <PluginTabs />
        </div>
      </div>
    </div>
  );
};
