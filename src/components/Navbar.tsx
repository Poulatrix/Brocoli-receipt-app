import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavbarProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export function Navbar({ tabs, activeTab, setActiveTab }: NavbarProps) {
  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-auto">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-full p-1.5 flex items-center gap-1 shadow-xl shadow-slate-200/40 ring-1 ring-black/5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-full transition-all duration-300 relative group flex items-center justify-center ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
