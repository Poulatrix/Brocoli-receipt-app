import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, LayoutGrid, List, Save, ChefHat, Filter, X, Heart, Camera, Sparkles, Square, RectangleHorizontal } from 'lucide-react';
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
  const [selectedSeason, setSelectedSeason] = useState<'tous' | 'ete' | 'hiver' | 'toute_annee'>('tous');
  const [maxTime, setMaxTime] = useState<number>(240);

  // Bento slider scale: 100 = Grand / Actuel (max), 0 = Carré (min width, plus de recettes en largeur)
  const [bentoSize, setBentoSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mes_recettes_bento_size');
      return saved !== null ? Number(saved) : 100;
    } catch {
      return 100;
    }
  });

  const handleBentoSizeChange = (newSize: number) => {
    setBentoSize(newSize);
    try {
      localStorage.setItem('mes_recettes_bento_size', String(newSize));
    } catch {
      // ignore
    }
  };

  // When bentoSize is 0: min width is ~205px (fits 5-6 cards on desktop, square proportions)
  // When bentoSize is 100: min width is ~360px (fits 2-3 cards on desktop, wide rectangular bento)
  const minCardWidth = useMemo(() => {
    return Math.round(205 + (bentoSize / 100) * 155);
  }, [bentoSize]);

  const allCategories = useMemo(() => {
    const hardcoded = ['Viande', 'Poisson', 'Végétarien', 'Pâtes', 'Soupe', 'Dessert', 'Entrée', 'Autre'];
    const fromRecipes = recettes.map(r => r.categorie).filter(Boolean);
    const combined = Array.from(new Set([...hardcoded, ...fromRecipes])).sort();
    return ['Favoris', ...combined];
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
    const isFavorisFilterActive = selectedCategories.includes('Favoris');
    const categoriesWithoutFavoris = selectedCategories.filter(c => c !== 'Favoris');

    const matchesCategory = categoriesWithoutFavoris.length === 0 || 
                            categoriesWithoutFavoris.some(c => c.toLowerCase() === (r.categorie || '').toLowerCase());
    const matchesFavori = !isFavorisFilterActive || r.favori;
    
    const searchLower = search.trim().toLowerCase();
    const matchesSearch = !searchLower || 
                          (r.nom || '').toLowerCase().includes(searchLower) || 
                          (Array.isArray(r.ingredients) && r.ingredients.some(ing => (ing?.nom || '').toLowerCase().includes(searchLower)));
    
    const totalTime = Number(r.prepMin || 0) + Number(r.cuissonMin || 0);
    const matchesTime = maxTime >= 240 || totalTime <= maxTime;
    
    const matchesSeason = selectedSeason === 'tous' || (r.saison || 'toute_annee') === selectedSeason;
    
    return matchesCategory && matchesFavori && matchesSearch && matchesTime && matchesSeason;
  });

  const favorites = useMemo(() => recettes.filter(r => r.favori), [recettes]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const [formInitialShowIA, setFormInitialShowIA] = useState(false);
  const [formInitialIAMode, setFormInitialIAMode] = useState<'text' | 'photo'>('photo');

  const handleCreatePhotoIA = () => {
    setEditingRecipe(null);
    setFormInitialShowIA(true);
    setFormInitialIAMode('photo');
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setFormInitialShowIA(false);
    setFormInitialIAMode('photo');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">BROCOLI</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Gérez votre bibliothèque de saveurs</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleCreatePhotoIA}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 font-semibold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
            title="Scanner une photo de recette ou un plat"
          >
            <Camera size={16} className="shrink-0" />
            <span>Photo IA</span>
          </button>
          <button 
            onClick={() => useStore.getState().syncWithSupabase()}
            className="btn-secondary text-xs sm:text-sm hidden md:inline-flex"
          >
            Actualiser
          </button>
          <button 
            id="btn-new-recipe"
            onClick={handleCreate}
            className="flex-1 sm:flex-initial btn-primary text-xs sm:text-sm shadow-sm justify-center py-2 sm:py-2.5 active:scale-95"
          >
            <Plus size={16} className="shrink-0" />
            <span>Nouvelle recette</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center justify-between">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher une recette ou ingrédient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs sm:text-sm font-medium shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bento Width Slider (Curseur de grandeur) when in Grid mode */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:inline">
                  Taille bentos :
                </span>
                <button
                  type="button"
                  onClick={() => handleBentoSizeChange(0)}
                  className={`p-1 rounded-md transition-all ${
                    bentoSize === 0 
                      ? 'bg-emerald-100/80 text-emerald-700 font-bold shadow-2xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Format Carré (Plus compact, plus de bentos en largeur)"
                >
                  <Square size={13} strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={bentoSize}
                    onChange={(e) => handleBentoSizeChange(Number(e.target.value))}
                    className="w-16 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 transition-all"
                    title={`Largeur : ${bentoSize === 0 ? 'Carré minimal' : bentoSize === 100 ? 'Grandeur maximale' : `${bentoSize}%`}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleBentoSizeChange(100)}
                  className={`p-1 rounded-md transition-all ${
                    bentoSize === 100 
                      ? 'bg-emerald-100/80 text-emerald-700 font-bold shadow-2xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grandeur maximale actuelle (Bentos larges)"
                >
                  <RectangleHorizontal size={15} strokeWidth={2} />
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowFilters(true)}
              className={`md:hidden px-3 py-2 bg-white border rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold ${
                (selectedCategories.length > 0 || selectedSeason !== 'tous' || maxTime < 240)
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/60 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Filtres avancés"
            >
              <Filter size={15} className="text-emerald-600 shrink-0" />
              <span>Filtres</span>
              {(selectedCategories.length > 0 || selectedSeason !== 'tous' || maxTime < 240) && (
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              )}
            </button>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vue grille (Bentos)"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vue liste"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setSelectedCategories([])}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all border ${
                selectedCategories.length === 0 
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Tout
            </button>
            
            <div className="h-4 w-px bg-slate-200 mx-1" />

            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all border flex items-center gap-1.5 ${
                  selectedCategories.includes(cat)
                  ? (cat === 'Favoris' ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-emerald-600 border-emerald-600 text-white shadow-sm')
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat === 'Favoris' && <Heart size={12} fill={selectedCategories.includes(cat) ? "currentColor" : "none"} />}
                {cat}
              </button>
            ))}
            <div className="flex items-center gap-3 ml-auto border-l pl-4 border-slate-200">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {maxTime >= 240 ? 'Temps: Tout' : `Max ${maxTime} min`}
              </label>
              <input 
                type="range" 
                min="15" 
                max="240" 
                step="15"
                value={maxTime}
                onChange={(e) => setMaxTime(parseInt(e.target.value))}
                className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>

          {/* Saison Filter Sub-row */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Saison :</span>
            {[
              { id: 'tous', label: 'Toutes les saisons', icon: '✨' },
              { id: 'ete', label: 'Été uniquement', icon: '☀️' },
              { id: 'hiver', label: 'Hiver uniquement', icon: '❄️' },
              { id: 'toute_annee', label: 'Toute l\'année', icon: '🌿' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSeason(s.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all border flex items-center gap-1.5 ${
                  selectedSeason === s.id
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
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
                className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl p-8 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Filtres</h3>
                  <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                  {/* Mobile Bento size slider */}
                  <div className="space-y-3 pb-2 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Taille des bentos
                      </label>
                      <span className="text-xs font-semibold text-emerald-600">
                        {bentoSize === 0 ? 'Carré compact' : bentoSize === 100 ? 'Grandeur max' : `${bentoSize}%`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Square size={16} className="text-slate-400" />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={bentoSize}
                        onChange={(e) => handleBentoSizeChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <RectangleHorizontal size={18} className="text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Favoris & Catégories</label>
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
                          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all border flex items-center gap-2 ${
                            selectedCategories.includes(cat)
                            ? (cat === 'Favoris' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-emerald-600 border-emerald-600 text-white')
                            : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {cat === 'Favoris' && <Heart size={16} fill={selectedCategories.includes(cat) ? "currentColor" : "none"} />}
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saison</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'tous', label: 'Toutes les saisons', icon: '✨' },
                        { id: 'ete', label: '☀️ Été', icon: '' },
                        { id: 'hiver', label: '❄️ Hiver', icon: '' },
                        { id: 'toute_annee', label: '🌿 Toute l\'année', icon: '' },
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSeason(s.id as any)}
                          className={`p-3 text-xs font-bold rounded-xl border text-center transition-all ${
                            selectedSeason === s.id
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Temps max : {maxTime >= 240 ? 'Tout' : `${maxTime} min`}
                      </label>
                      {maxTime < 240 && (
                        <button onClick={() => setMaxTime(240)} className="text-xs font-bold text-emerald-600">Réinitialiser</button>
                      )}
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="240" 
                      step="15"
                      value={maxTime}
                      onChange={(e) => setMaxTime(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>15m</span>
                      <span>1h</span>
                      <span>2h</span>
                      <span>Tout</span>
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

      {favorites.length > 0 && !selectedCategories.includes('Favoris') && !search && selectedCategories.length === 0 && (
        <div className="space-y-6 pb-10">
          <div className="flex items-center gap-2 text-rose-600">
            <Heart size={20} fill="currentColor" />
            <h3 className="text-lg font-bold tracking-tight">Mes favoris</h3>
          </div>
          <div 
            className={viewMode === 'grid' ? 'grid gap-3 sm:gap-5' : 'space-y-3'}
            style={viewMode === 'grid' ? {
              gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`
            } : undefined}
          >
            {favorites.map((recette) => (
              <RecipeCard 
                key={recette.id} 
                recette={recette} 
                onClick={() => setSelectedRecipe(recette)}
                viewMode={viewMode}
              />
            ))}
          </div>
          <div className="h-px bg-slate-100" />
        </div>
      )}

      {filteredRecettes.length > 0 ? (
        <div 
          className={viewMode === 'grid' ? 'grid gap-3 sm:gap-5' : 'space-y-3'}
          style={viewMode === 'grid' ? {
            gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`
          } : undefined}
        >
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
          initialShowIA={formInitialShowIA}
          initialIAMode={formInitialIAMode}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </motion.div>
  );
}
