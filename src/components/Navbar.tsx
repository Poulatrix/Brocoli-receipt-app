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
    <nav className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between z-50 sticky top-0 shrink-0">
      <div className="flex items-center gap-10">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Mes Recettes<span className="text-blue-600">.</span>
        </h1>
        <div className="flex gap-8 text-sm font-medium text-slate-500">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`transition-colors relative pb-5 -mb-5 border-b-2 hover:text-slate-800 ${
                  isActive 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-slate-500 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden ring-2 ring-slate-200 ring-offset-2">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nico" 
            alt="Avatar" 
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </nav>
  );
}
