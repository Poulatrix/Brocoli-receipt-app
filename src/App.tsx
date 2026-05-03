/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChefHat, Calendar, ShoppingCart } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { RecipesPage } from './pages/RecipesPage';
import { PlanningPage } from './pages/PlanningPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { AnimatePresence } from 'motion/react';

const TABS = [
  { id: 'recettes', label: 'Recettes', icon: ChefHat },
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'courses', label: 'Courses', icon: ShoppingCart },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('recettes');

  const renderContent = () => {
    switch (activeTab) {
      case 'recettes':
        return <RecipesPage key="recettes" />;
      case 'planning':
        return <PlanningPage key="planning" />;
      case 'courses':
        return <ShoppingListPage key="courses" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <Navbar tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>
    </div>
  );
}
