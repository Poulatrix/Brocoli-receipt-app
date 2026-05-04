import React, { useState } from 'react';
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
  const [filter, setFilter] = useState<CategorieRecette | 'Tout'>('Tout');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedRecipe, setSelectedRecipe] = useState<Recette | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recette | null>(null);

  const filteredRecettes = recettes.filter(r => {
    const matchesFilter = filter === 'Tout' || r.categorie === filter;
    const matchesSearch = r.nom.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
          <button className="btn-secondary text-sm">Sauvegarder</button>
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

      <div className="flex flex-col sm:flex-row gap-6 items-center mb-8">
        <div className="flex flex-wrap gap-2 flex-grow">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all border ${
                filter === cat 
                ? 'bg-slate-900 border-slate-900 text-white' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
          <button className="px-4 py-1.5 text-blue-600 text-xs font-semibold hover:underline">+ Ajouter</button>
        </div>
        
        <div className="bg-slate-200/50 p-1 rounded-lg flex shrink-0">
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
