import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingCart, Pencil, Trash2, ChevronRight, Clock, Users, Flame, ChefHat, Share2, ChevronLeft, Printer } from 'lucide-react';
import { Recette, Ingredient } from '../types';

interface RecipeDetailModalProps {
  recette: Recette;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddShopping: (ingredients: Ingredient[]) => void;
}

export function RecipeDetailModal({ recette, onClose, onEdit, onDelete, onAddShopping }: RecipeDetailModalProps) {
  const [portions, setPortions] = useState(recette.portions);
  const [currentStep, setCurrentStep] = useState(0);
  const [modeCuisine, setModeCuisine] = useState(false);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);

  const ratio = portions / recette.portions;

  const adjustedIngredients = recette.ingredients.map(ing => ({
    ...ing,
    quantite: Number((ing.quantite * ratio).toFixed(1))
  }));

  const handleAddShopping = () => {
    const toAdd = adjustedIngredients.filter(ing => !excludedIngredients.includes(ing.id));
    onAddShopping(toAdd);
    alert(`${toAdd.length} ingrédients ajoutés à votre liste !`);
  };

  const toggleIngredient = (id: string) => {
    setExcludedIngredients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: recette.nom,
      text: `Découvrez ma recette de ${recette.nom} sur Mes Recettes !`,
      url: window.location.origin + window.location.pathname + `?recipe=${recette.id}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Lien de la recette copié !');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handlePrint = () => {
    try {
      setTimeout(() => {
        window.print();
      }, 200);
    } catch (e) {
      console.error('Print failed', e);
      alert('L\'impression n\'est pas supportée dans cet aperçu.');
    }
  };

  const confirmDelete = () => {
    onDelete();
    setShowConfirmDelete(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDelete(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Supprimer la recette ?</h3>
                <p className="text-slate-500 mt-2">
                  Voulez-vous vraiment supprimer "{recette.nom}" ? Cette action est définitive.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-[860px] h-[640px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in"
      >
        {/* Modal Header Image */}
        <div 
          className="h-52 bg-cover bg-center shrink-0 relative" 
          style={{ backgroundImage: `url(${recette.image || `https://picsum.photos/seed/${recette.id}/1000/400`})` }}
        >
          <div className="w-full h-full bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">{recette.nom}</h2>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-grow overflow-hidden text-sm relative">
          <AnimatePresence>
            {modeCuisine && (
              <CookingMode 
                instructions={recette.instructions} 
                onClose={() => setModeCuisine(false)} 
              />
            )}
          </AnimatePresence>

          {/* Left: Ingredients & Instructions */}
          <div className="w-2/3 p-8 overflow-y-auto border-r border-slate-100 space-y-10 scrollbar-hide">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Ingrédients</h3>
                <button 
                  onClick={handleAddShopping}
                  disabled={excludedIngredients.length === adjustedIngredients.length}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                >
                  <ShoppingCart size={16} />
                  Ajouter ma sélection
                </button>
              </div>
              <ul className="space-y-3">
                {adjustedIngredients.map((ing) => (
                  <li 
                    key={ing.id} 
                    onClick={() => toggleIngredient(ing.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      excludedIngredients.includes(ing.id) 
                      ? 'bg-slate-50 border-slate-100 opacity-60' 
                      : 'bg-white border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        excludedIngredients.includes(ing.id) 
                        ? 'bg-white border-slate-200 text-slate-200' 
                        : 'bg-blue-600 border-blue-600 text-white'
                      }`}>
                        {!excludedIngredients.includes(ing.id) && <Plus size={14} strokeWidth={3} />}
                      </div>
                      <span className={`font-medium ${excludedIngredients.includes(ing.id) ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {ing.nom}
                      </span>
                    </div>
                    <span className={`font-bold ${excludedIngredients.includes(ing.id) ? 'text-slate-300' : 'text-slate-500'}`}>
                      {ing.quantite > 0 && ing.quantite} {ing.unite}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Instructions</h3>
              </div>
              <div className="space-y-6">
                {recette.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">{step.titre}</h4>
                      <p className="text-slate-500 leading-relaxed font-normal">
                        {step.texte}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Meta Information */}
          <div className="w-1/3 bg-slate-50/50 p-8 flex flex-col pt-6">
            <button 
              onClick={() => setModeCuisine(true)}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mb-10"
            >
              <ChefHat size={20} />
              Cuisiner maintenant
            </button>

            <div className="flex justify-end gap-3 mb-10">
              <button 
                onClick={handlePrint}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 transition-colors shadow-sm"
                title="Imprimer"
              >
                <Printer size={20} />
              </button>
              <button 
                onClick={handleShare}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 transition-colors shadow-sm"
                title="Partager"
              >
                <Share2 size={20} />
              </button>
              <button 
                onClick={onEdit}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 transition-colors shadow-sm"
                title="Modifier"
              >
                <Pencil size={20} />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  setShowConfirmDelete(true);
                }}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm"
                title="Supprimer"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Portions</span>
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setPortions(Math.max(1, portions - 1))}
                    className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-500 hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold text-slate-900">{portions}</span>
                  <button 
                    onClick={() => setPortions(portions + 1)}
                    className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-lg text-blue-600 hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <span className="text-slate-500 font-medium">Préparation</span>
                  <span className="font-bold text-slate-900">{recette.prepMin} min</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <span className="text-slate-500 font-medium">Cuisson</span>
                  <span className="font-bold text-slate-900">{recette.cuissonMin} min</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-4 px-1">
                  <span className="text-slate-500 font-medium">Calories</span>
                  <span className="font-bold text-slate-900">{Math.round((recette.calories * ratio) / portions)} kcal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CookingMode({ 
  instructions, 
  onClose 
}: { 
  instructions: { titre: string; texte: string }[]; 
  onClose: () => void 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = instructions[currentStep];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute inset-0 bg-white z-50 flex flex-col"
    >
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            {currentStep + 1}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Mode Cuisine</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Étape {currentStep + 1} sur {instructions.length}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center p-12 text-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-xl space-y-6"
          >
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{step.titre}</h4>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              {step.texte}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex gap-4">
        <button 
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="flex-1 btn-secondary justify-center disabled:opacity-30"
        >
          <ChevronLeft size={20} />
          Précédent
        </button>
        <button 
          onClick={() => {
            if (currentStep < instructions.length - 1) {
              setCurrentStep(prev => prev + 1);
            } else {
              onClose();
            }
          }}
          className="flex-[2] btn-primary justify-center shadow-lg shadow-blue-500/20"
        >
          {currentStep === instructions.length - 1 ? 'Terminer' : 'Étape suivante'}
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}
