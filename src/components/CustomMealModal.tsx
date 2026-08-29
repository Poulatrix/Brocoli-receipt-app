import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, Calendar, Trash2, ArrowRight, Loader2, ChefHat, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getDishImage } from '../lib/dishImages';
import { generateRecipeFromTitle } from '../geminiService';
import { useStore } from '../store';
import { Recette } from '../types';

interface CustomMealModalProps {
  dishName: string;
  dateStr: string;
  onClose: () => void;
  onOpenRecipeForm: (initialRecipe: Partial<Recette>) => void;
  onChangeDish?: () => void;
}

export function CustomMealModal({
  dishName,
  dateStr,
  onClose,
  onOpenRecipeForm,
  onChangeDish,
}: CustomMealModalProps) {
  const { addRecette, setPlanningEntry } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const imageUrl = getDishImage(dishName);
  const isSuggestionOnly = dateStr.startsWith('1900-');
  const formattedDate = !isSuggestionOnly 
    ? format(new Date(dateStr.replace(/-/g, '/')), 'EEEE d MMMM yyyy', { locale: fr }) 
    : 'Idée en réserve';

  const handleQuickAIGenerate = async () => {
    setIsGenerating(true);
    setSuccessMessage(null);

    try {
      const generated = await generateRecipeFromTitle(dishName);
      if (generated) {
        const newRecipe: Recette = {
          id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          nom: generated.nom || dishName,
          categorie: generated.categorie || 'Autre',
          saison: generated.saison || 'toute_annee',
          image: imageUrl,
          portions: generated.portions || 4,
          prepMin: generated.prepMin || 15,
          cuissonMin: generated.cuissonMin || 20,
          calories: generated.calories || 450,
          ingredients: (generated.ingredients || []).map((ing: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            quantite: ing.quantite || 0,
            unite: ing.unite || '',
            nom: ing.nom || ''
          })),
          instructions: (generated.instructions || []).map((inst: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            titre: inst.titre || 'Étape',
            texte: inst.texte || ''
          })),
          estIA: true,
          favori: false,
          dateCreation: new Date().toISOString()
        };

        // Save recipe to store
        await addRecette(newRecipe);
        // Link recipe to this date in the planning
        await setPlanningEntry(dateStr, newRecipe.id, null);

        setSuccessMessage("Recette créée et associée avec succès !");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        alert("Impossible de générer automatiquement la recette. Vous pouvez l'écrire manuellement.");
      }
    } catch (err) {
      console.error("Erreur génération recette:", err);
      alert("Une erreur est survenue lors de la création de la recette.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = () => {
    onClose();
    onOpenRecipeForm({
      nom: dishName,
      image: imageUrl,
      categorie: 'Autre',
      saison: 'toute_annee',
      portions: 4,
      prepMin: 15,
      cuissonMin: 20,
      ingredients: [{ id: '1', quantite: 0, unite: '', nom: '' }],
      instructions: [{ id: '1', titre: 'Préparation', texte: '' }],
    });
  };

  const handleRemoveFromPlanning = async () => {
    await setPlanningEntry(dateStr, null, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
      >
        {/* Cover image */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-100">
          <img 
            src={imageUrl} 
            alt={dishName} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-xs"
          >
            <X size={18} />
          </button>

          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            <Sparkles size={12} />
            <span>Idée au planning</span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold mb-1 capitalize">
              <Calendar size={13} />
              <span>{formattedDate}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-serif text-white drop-shadow-sm">
              {dishName}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {successMessage ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold"
            >
              <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
              <span>{successMessage}</span>
            </motion.div>
          ) : (
            <>
              {/* Informational banner about non-intrusive recipe creation */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <ChefHat size={15} className="text-amber-700" />
                  <span>Enregistrer dans votre carnet de recettes</span>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Ce repas a été saisi librement. Vous pouvez le convertir en vraie fiche recette dès maintenant ou quand vous aurez un moment, pour conserver les ingrédients et la préparation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleQuickAIGenerate}
                  disabled={isGenerating}
                  className="w-full btn-primary py-3.5 px-4 flex items-center justify-between text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    {isGenerating ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} className="text-emerald-200" />
                    )}
                    <span className="text-left">
                      {isGenerating ? "Génération par l'IA en cours..." : "Générer la fiche complète avec l'IA"}
                    </span>
                  </div>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleManualCreate}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl flex items-center justify-between text-xs sm:text-sm font-bold transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen size={17} className="text-slate-500" />
                    <span>Rédiger la fiche recette manuellement</span>
                  </div>
                  <span className="text-xs text-slate-400 font-normal">Quand j'ai le temps</span>
                </button>
              </div>

              {/* Utility / Secondary actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                {onChangeDish && (
                  <button 
                    type="button"
                    onClick={() => {
                      onClose();
                      onChangeDish();
                    }}
                    className="text-slate-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Changer de repas</span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={handleRemoveFromPlanning}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors ml-auto"
                >
                  <Trash2 size={13} />
                  <span>Retirer du planning</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
