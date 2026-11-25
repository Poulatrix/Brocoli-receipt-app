/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home, ChefHat, Calendar, ShoppingCart, Settings, Terminal, X, Users, Crown, Shield } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { RecipesPage } from './pages/RecipesPage';
import { PlanningPage } from './pages/PlanningPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnimatePresence } from 'motion/react';
import { useAuth } from './lib/auth';
import { useStore } from './store';
import { Login } from './components/Login';
import { syncWidgetSchedule } from './lib/widgetSync';
import { HouseholdJoinModal } from './components/HouseholdJoinModal';
import { ServiceWorkerUpdateProvider } from './contexts/ServiceWorkerUpdateContext';

const TABS = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'recettes', label: 'Recettes', icon: ChefHat },
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'courses', label: 'Courses', icon: ShoppingCart },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

function AppContent() {
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && TABS.some(t => t.id === tabParam)) {
        return tabParam;
      }
    } catch {}
    return 'home';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [joinModalCode, setJoinModalCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join')?.trim();
      if (joinParam) {
        localStorage.setItem('brocoli_pending_join_code', joinParam);
        return joinParam;
      }
      const saved = localStorage.getItem('brocoli_pending_join_code')?.trim();
      if (saved) return saved;
    } catch {}
    return null;
  });

  const clearPendingJoinCode = () => {
    setJoinModalCode(null);
    try {
      localStorage.removeItem('brocoli_pending_join_code');
      const url = new URL(window.location.href);
      if (url.searchParams.has('join')) {
        url.searchParams.delete('join');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  };

  const { user, loading: authLoading } = useAuth();
  const { 
    setUserData, 
    loading: storeLoading, 
    error: storeError, 
    setError, 
    planning, 
    recettes,
    courses,
    household,
    getCurrentMember,
    syncMcpMirror
  } = useStore();

  const currentMember = getCurrentMember();

  useEffect(() => {
    if (user) {
      setUserData(user.id, user.email);
    } else {
      setUserData(null, null);
    }
  }, [user, setUserData]);

  // Synchronisation continue du planning complet vers le widget iOS
  useEffect(() => {
    if (planning && planning.length > 0) {
      syncWidgetSchedule(planning, recettes, user?.id).catch(() => {});
    }
  }, [planning, recettes, user?.id]);

  // Synchronisation du miroir MCP et application des actions MCP en attente
  useEffect(() => {
    if (!user?.id || !household?.id) return;
    const timer = setTimeout(() => {
      syncMcpMirror().catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [user?.id, household?.id, recettes, planning, courses, syncMcpMirror]);

  useEffect(() => {
    if (!user?.id || !household?.id) return;
    const onFocus = () => {
      syncMcpMirror().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id, household?.id, syncMcpMirror]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage key="home" onNavigate={setActiveTab} />;
      case 'recettes':
        return <RecipesPage key="recettes" />;
      case 'planning':
        return <PlanningPage key="planning" />;
      case 'courses':
        return <ShoppingListPage key="courses" />;
      case 'settings':
        return <SettingsPage key="settings" />;
      default:
        return <HomePage key="home" onNavigate={setActiveTab} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE]">
        <ChefHat className="text-emerald-600 animate-bounce" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login pendingJoinCode={joinModalCode} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F5F0] via-[#FAF8F5] to-[#F2EFE8] pb-24 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 relative overflow-x-hidden">
      <Navbar tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Top Header Household Quick Bar */}
        {household && (
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/50">
            <button
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white backdrop-blur-sm border border-emerald-100 rounded-full shadow-sm hover:shadow transition-all group"
            >
              <span className="text-base">🏡</span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                {household.nom}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <span>{currentMember?.role === 'chef' ? '👑 Chef' : currentMember?.role === 'cuisinier' ? '🍳 Cuisinier' : currentMember?.role === 'commis' ? '🧑‍🍳 Commis' : '👶 Gourmand'}</span>
              </span>
            </button>

            <div className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
              <Users size={13} className="text-emerald-600" />
              <span>{household.membres.length} membre{household.membres.length > 1 ? 's' : ''} connecté{household.membres.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {storeLoading && (
          <div className="fixed top-6 right-6 z-50 bg-white/90 backdrop-blur shadow-xl shadow-emerald-500/5 border border-emerald-100 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Sync Cloud En cours
          </div>
        )}

        {storeError && (
          <div className="fixed top-20 right-6 z-50 bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl shadow-xl max-w-sm">
            <div className="flex items-start gap-3">
              <X className="text-rose-500 shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform" size={16} onClick={() => setError(null)} />
              <div>
                <p className="text-xs font-bold text-rose-900 uppercase tracking-widest mb-1">Erreur Cloud</p>
                <p className="text-xs text-rose-600 font-medium leading-relaxed">{storeError}</p>
                <p className="text-[10px] text-rose-400 mt-2 italic">Note : Si la colonne 'favori' manque dans votre table 'recipes' sur Supabase, les favoris ne seront pas sauvegardés.</p>
              </div>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>

        {/* Modal for invitation link URL (?join=CODE) */}
        {joinModalCode && (
          <HouseholdJoinModal
            isOpen={true}
            initialCode={joinModalCode}
            onClose={clearPendingJoinCode}
            onSuccess={clearPendingJoinCode}
          />
        )}
      </main>
    </div>
  );
}

// Le Provider est monté une seule fois tout en haut de l'arbre React dans App
export default function App() {
  return (
    <ServiceWorkerUpdateProvider>
      <AppContent />
    </ServiceWorkerUpdateProvider>
  );
}

