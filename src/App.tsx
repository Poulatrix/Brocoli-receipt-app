/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChefHat, Calendar, ShoppingCart, Settings, Terminal, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { RecipesPage } from './pages/RecipesPage';
import { PlanningPage } from './pages/PlanningPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnimatePresence } from 'motion/react';
import { useAuth } from './lib/auth';
import { useStore } from './store';
import { Login } from './components/Login';

const TABS = [
  { id: 'recettes', label: 'Accueil', icon: ChefHat },
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'courses', label: 'Courses', icon: ShoppingCart },
  { id: 'settings', label: 'Utilisateurs', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('recettes');
  const { user, loading: authLoading } = useAuth();
  const { setUserId, loading: storeLoading, error: storeError, setError } = useStore();

  useEffect(() => {
    if (user) {
      setUserId(user.id);
    } else {
      setUserId(null);
    }
  }, [user, setUserId]);

  const renderContent = () => {
    switch (activeTab) {
      case 'recettes':
        return <RecipesPage key="recettes" />;
      case 'planning':
        return <PlanningPage key="planning" />;
      case 'courses':
        return <ShoppingListPage key="courses" />;
      case 'settings':
        return <SettingsPage key="settings" />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <ChefHat className="text-emerald-600 animate-bounce" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-24">
      <Navbar tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
