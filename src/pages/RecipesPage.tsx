import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, LayoutGrid, List, Save, ChefHat, Filter, X } from 'lucide-react';
import { useStore } from '../store';
import { Recette, CategorieRecette } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { RecipeFormModal } from '../components/RecipeFormModal';

const CATEGORIES: (CategorieRecette | 'Tout')[] = [
  'Tout', 'Viande', 'Poisson', 'Végétarien', 'Pâtes', 'Soupe', 'Dessert', 'Entrée', 'Autre'
];

export function RecipesPage() {
  const { recettes, addRecette, updateRecette, deleteRecette, addToShoppingList } = useStore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxTime, setMaxTime] = useState<number>(120);

  const allCategories = useMemo(() => {
    const hardcoded = ['Viande', 'Poisson', 'Végétarien', 'Pâtes', 'Soupe', 'Dessert', 'Entrée', 'Autre'];
    const fromRecipes = recettes.map(r => r.categorie).filter(Boolean);
    return Array.from(new Set([...hardcoded, ...fromRecipes])).sort();
  }, [recettes]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode('list');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [selectedRecipe, setSelectedRecipe] = useState<Recette | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recette | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredRecettes = recettes.filter(r => {
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(r.categorie);
    const matchesSearch = r.nom.toLowerCase().includes(search.toLowerCase()) || 
                          r.ingredients.some(ing => ing.nom.toLowerCase().includes(search.toLowerCase()));
    const matchesTime = (r.prepMin + r.cuissonMin) <= maxTime;
    return matchesCategory && matchesSearch && matchesTime;
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setIsFormOpen(true);
  };

  const handleEdit = (recette: Recette) => {
    setEditingRecipe(recette);
    setIsFormOpen(true);
    setSelectedRecipe(null);
  };

  const handleSave = (recette: Recette) => {
    if (editingRecipe) {
      updateRecette(recette);
    } else {
      addRecette({
        ...recette,
        id: crypto.randomUUID(),
        dateCreation: new Date().toISOString()
      });
    }
    setIsFormOpen(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">BROCOLI</h2>
          <p className="text-sm text-slate-500">Gérez votre bibliothèque de saveurs</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => useStore.getState().syncWithSupabase()}
            className="btn-secondary text-sm"
          >
            Actualiser
          </button>
          <button 
            id="btn-new-recipe"
            onClick={handleCreate}
            className="btn-primary text-sm shadow-sm"
          >
            <Plus size={16} />
            <span>Nouvelle recette</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <div className="flex gap-4 items-center justify-between">
          <div className="flex-1 relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 border-opacity-60 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(true)}
              className="md:hidden p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
              title="Filtres"
            >
              <Filter size={18} />
            </button>

            <div className="hidden md:flex bg-slate-200/50 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-50'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-50'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategories([])}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all border ${
              selectedCategories.length === 0 
              ? 'bg-slate-900 border-slate-900 text-white' 
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            Tout
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all border ${
                selectedCategories.includes(cat)
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="flex items-center gap-3 ml-4 border-l pl-4 border-slate-200">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max {maxTime} min</label>
            <input 
              type="range" 
              min="5" 
              max="120" 
              step="5"
              value={maxTime}
              onChange={(e) => setMaxTime(parseInt(e.target.value))}
              className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>

        {/* Mobile Filters Popup */}
        <AnimatePresence>
          {showFilters && isMobile && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl p-8 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Filtres</h3>
                  <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catégories</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategories([])}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all border ${
                          selectedCategories.length === 0 
                          ? 'bg-slate-900 border-slate-900 text-white' 
                          : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Tout
                      </button>
                      {allCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all border ${
                            selectedCategories.includes(cat)
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Temps max : {maxTime} min</label>
                      {maxTime < 120 && (
                        <button onClick={() => setMaxTime(120)} className="text-xs font-bold text-emerald-600">Réinitialiser</button>
                      )}
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="120" 
                      step="5"
                      value={maxTime}
                      onChange={(e) => setMaxTime(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>5m</span>
                      <span>1h</span>
                      <span>2h+</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/10"
                >
                  Voir {filteredRecettes.length} recettes
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden">
        {/* Removed redundant search input */}
      </div>

      {filteredRecettes.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredRecettes.map((recette) => (
            <RecipeCard 
              key={recette.id} 
              recette={recette} 
              onClick={() => setSelectedRecipe(recette)}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
          <ChefHat className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-lg font-medium text-gray-900">Aucune recette trouvée</p>
          <p className="text-gray-500">Commencez par ajouter votre première recette !</p>
          <button 
            onClick={handleCreate}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            Créer ma première recette
          </button>
        </div>
      )}

      {selectedRecipe && (
        <RecipeDetailModal 
          recette={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)}
          onEdit={() => handleEdit(selectedRecipe)}
          onDelete={() => { deleteRecette(selectedRecipe.id); setSelectedRecipe(null); }}
          onAddShopping={(ingredients) => addToShoppingList(ingredients)}
        />
      )}

      {isFormOpen && (
        <RecipeFormModal 
          recette={editingRecipe}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </motion.div>
  );
}
