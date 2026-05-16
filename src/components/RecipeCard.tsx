import React from 'react';
import { Clock, Users, Flame } from 'lucide-react';
import { Recette } from '../types';

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

export const RecipeCard: React.FC<RecipeCardProps> = ({ recette, onClick, viewMode }) => {
  const isGrid = viewMode === 'grid';

  return (
    <div 
      onClick={onClick}
      className={`card transition-all cursor-pointer hover:shadow-md ${
        isGrid ? 'flex flex-col' : 'flex items-center gap-4 p-3'
      }`}
    >
      <div className={`relative bg-slate-100 ${isGrid ? 'w-full h-40 shrink-0' : 'w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden'}`}>
        <img 
          src={recette.image || `https://picsum.photos/seed/${recette.id}/400/300`} 
          alt={recette.nom}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        {isGrid && (
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[recette.categorie] || 'bg-slate-100 text-slate-600'}`}>
              {recette.categorie}
            </span>
          </div>
        )}
      </div>

      <div className={`p-4 flex-1 ${isGrid ? '' : 'py-2'}`}>
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-slate-900 line-clamp-1">{recette.nom}</h3>
          {!isGrid && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[recette.categorie] || 'bg-slate-100 text-slate-600'}`}>
              {recette.categorie}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <Clock size={12} strokeWidth={2.5} />
            <span>{recette.prepMin + recette.cuissonMin} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={12} strokeWidth={2.5} />
            <span>{recette.portions} pers.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
