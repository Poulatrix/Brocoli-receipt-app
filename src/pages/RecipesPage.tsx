import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, LayoutGrid, List, Save, ChefHat } from 'lucide-react';
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mes Recettes</h2>
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
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-wrap gap-2 flex-grow">
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
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all border flex items-center gap-2 ${
                showFilters || maxTime < 120
                ? 'bg-slate-100 border-slate-300 text-slate-900' 
                : 'bg-white border-slate-200 text-blue-600 hover:border-slate-300'
              }`}
            >
              <Plus size={14} /> 
              {showFilters ? 'Moins de filtres' : 'Plus de filtres'}
            </button>
          </div>
          
          <div className="bg-slate-200/50 p-1 rounded-lg flex shrink-0 self-end sm:self-auto">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 overflow-hidden"
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Temps total max ({maxTime} min)</label>
                {maxTime < 120 && (
                   <button onClick={() => setMaxTime(120)} className="text-[10px] font-bold text-blue-600 uppercase">Réinitialiser</button>
                )}
              </div>
              <input 
                type="range" 
                min="5" 
                max="120" 
                step="5"
                value={maxTime}
                onChange={(e) => setMaxTime(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>5min</span>
                <span>30min</span>
                <span>60min</span>
                <span>90min</span>
                <span>120min+</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Rechercher une recette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 border-opacity-60 transition-all text-sm"
        />
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
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-all shadow-lg shadow-blue-500/20"
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
