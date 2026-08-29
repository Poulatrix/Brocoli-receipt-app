import React from 'react';
import { Clock, Users, Heart } from 'lucide-react';
import { Recette } from '../types';
import { useStore } from '../store';
import { getDishImage } from '../lib/dishImages';

interface RecipeCardProps {
  recette: Recette;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}

const CATEGORY_COLORS: Record<string, string> = {
  'Viande': 'bg-red-100 text-red-700',
  'Poisson': 'bg-cyan-100 text-cyan-700',
  'Végétarien': 'bg-emerald-100 text-emerald-700',
  'Pâtes': 'bg-yellow-100 text-yellow-700',
  'Soupe': 'bg-orange-100 text-orange-700',
  'Dessert': 'bg-pink-100 text-pink-700',
  'Entrée': 'bg-indigo-100 text-indigo-700',
  'Autre': 'bg-slate-100 text-slate-700',
};

const SAISON_BADGES: Record<string, { label: string; icon: string; className: string }> = {
  'ete': { label: 'Été', icon: '☀️', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'hiver': { label: 'Hiver', icon: '❄️', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  'toute_annee': { label: 'Toute l\'année', icon: '🌿', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recette, onClick, viewMode }) => {
  const isGrid = viewMode === 'grid';
  const updateRecette = useStore(state => state.updateRecette);
  const seasonInfo = SAISON_BADGES[recette.saison || 'toute_annee'] || SAISON_BADGES['toute_annee'];

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateRecette({ ...recette, favori: !recette.favori });
  };

  const imageSrc = recette.image || getDishImage(recette.nom);

  return (
    <div 
      onClick={onClick}
      className={`card transition-all cursor-pointer hover:shadow-md group ${
        isGrid 
          ? 'flex flex-col h-[255px] sm:h-[265px] justify-between overflow-hidden' 
          : 'flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3'
      }`}
    >
      <div 
        className={`relative bg-slate-100 overflow-hidden ${
          isGrid 
            ? 'w-full h-[170px] sm:h-[180px] shrink-0 rounded-t-xl' 
            : 'w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl'
        }`}
      >
        <img 
          src={imageSrc} 
          alt={recette.nom}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer" 
        />
        {isGrid && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
            <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-xs max-w-[110px] truncate ${CATEGORY_COLORS[recette.categorie] || 'bg-slate-100 text-slate-600'}`}>
              {recette.categorie}
            </span>
            <button 
              onClick={toggleFavorite}
              className={`p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all ${
                recette.favori 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-200' 
                : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white'
              }`}
              title={recette.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart size={13} fill={recette.favori ? "currentColor" : "none"} strokeWidth={recette.favori ? 2 : 2.5} />
            </button>
          </div>
        )}
        {isGrid && (
          <div className="absolute bottom-1.5 left-1.5 z-10">
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border backdrop-blur-md bg-white/90 shadow-2xs ${seasonInfo.className}`}>
              {seasonInfo.icon} {seasonInfo.label}
            </span>
          </div>
        )}
      </div>

      <div className={`flex-1 min-w-0 flex flex-col justify-between ${isGrid ? 'p-2.5 sm:p-3' : 'py-0.5'}`}>
        <div className="flex justify-between items-start gap-1.5 mb-1">
          <h3 
            className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 truncate group-hover:text-emerald-700 transition-colors"
            title={recette.nom}
          >
            {recette.nom}
          </h3>
          {!isGrid && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[recette.categorie] || 'bg-slate-100 text-slate-600'}`}>
                {recette.categorie}
              </span>
              <button 
                onClick={toggleFavorite}
                className={`p-1 rounded-lg transition-all ${
                  recette.favori 
                  ? 'text-rose-500' 
                  : 'text-slate-300 hover:text-rose-500'
                }`}
                title={recette.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Heart size={15} fill={recette.favori ? "currentColor" : "none"} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1" title="Temps total">
              <Clock size={11} strokeWidth={2.5} className="text-slate-400" />
              <span>{Number(recette.prepMin || 0) + Number(recette.cuissonMin || 0)} min</span>
            </div>
            <div className="flex items-center gap-1" title="Nombre de portions">
              <Users size={11} strokeWidth={2.5} className="text-slate-400" />
              <span>{recette.portions} pers.</span>
            </div>
          </div>
          {!isGrid && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border ${seasonInfo.className}`}>
              {seasonInfo.icon} {seasonInfo.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
