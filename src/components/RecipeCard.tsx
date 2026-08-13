import React from 'react';
import { Clock, Users, Flame, Heart } from 'lucide-react';
import { Recette } from '../types';
import { useStore } from '../store';

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

  return (
    <div 
      onClick={onClick}
      className={`card transition-all cursor-pointer hover:shadow-md ${
        isGrid ? 'flex flex-col' : 'flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3'
      }`}
    >
      <div className={`relative bg-slate-100 ${isGrid ? 'w-full h-32 xs:h-36 sm:h-44 md:h-48 shrink-0 rounded-t-xl overflow-hidden' : 'w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden'}`}>
        <img 
          src={recette.image || `https://picsum.photos/seed/${recette.id}/400/300`} 
          alt={recette.nom}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        {isGrid && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-xs ${CATEGORY_COLORS[recette.categorie] || 'bg-slate-100 text-slate-600'}`}>
              {recette.categorie}
            </span>
            <button 
              onClick={toggleFavorite}
              className={`p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all ${
                recette.favori 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-200' 
                : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white'
              }`}
            >
              <Heart size={13} fill={recette.favori ? "currentColor" : "none"} strokeWidth={recette.favori ? 2 : 2.5} />
            </button>
          </div>
        )}
        {isGrid && (
          <div className="absolute bottom-1.5 left-1.5">
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border backdrop-blur-md ${seasonInfo.className}`}>
              {seasonInfo.icon} {seasonInfo.label}
            </span>
          </div>
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isGrid ? 'p-2.5 sm:p-3.5' : 'py-0.5'}`}>
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 truncate">{recette.nom}</h3>
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
              >
                <Heart size={15} fill={recette.favori ? "currentColor" : "none"} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1">
              <Clock size={12} strokeWidth={2.5} className="text-slate-400" />
              <span>{recette.prepMin + recette.cuissonMin} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} strokeWidth={2.5} className="text-slate-400" />
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
