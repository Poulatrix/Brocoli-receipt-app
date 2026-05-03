import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Image as ImageIcon, Sparkles, Loader2, Clipboard } from 'lucide-react';
import { Recette, CategorieRecette, Ingredient, Instruction } from '../types';
import { parseRecipe } from '../geminiService';

interface RecipeFormModalProps {
  recette: Recette | null;
  onClose: () => void;
  onSave: (recette: Recette) => void;
}

const CATEGORIES: CategorieRecette[] = [
  'Viande', 'Poisson', 'Végétarien', 'Pâtes', 'Soupe', 'Dessert', 'Entrée', 'Autre'
];

export function RecipeFormModal({ recette, onClose, onSave }: RecipeFormModalProps) {
  const [formData, setFormData] = useState<Partial<Recette>>(
    recette || {
      nom: '',
      categorie: 'Viande',
      image: '',
      portions: 4,
      prepMin: 15,
      cuissonMin: 20,
      calories: 0,
      ingredients: [{ id: '1', quantite: 0, unite: '', nom: '' }],
      instructions: [{ id: '1', titre: 'Préparation', texte: '' }],
      estIA: false,
    }
  );

  const [isLoadingIA, setIsLoadingIA] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showIAPaste, setShowIAPaste] = useState(false);
  const [rawRecipeText, setRawRecipeText] = useState('');

  const handleIA = async () => {
    if (!rawRecipeText) return alert("Veuillez coller le texte de la recette.");
    setIsLoadingIA(true);
    const result = await parseRecipe(rawRecipeText);
    if (result) {
      setFormData(prev => ({
        ...prev,
        ...result,
        ingredients: result.ingredients.map((ing: any) => ({ ...ing, id: Math.random().toString(36).substr(2, 9) })),
        instructions: result.instructions.map((inst: any) => ({ ...inst, id: Math.random().toString(36).substr(2, 9) })),
        estIA: true
      }));
      setShowIAPaste(false);
      setRawRecipeText('');
    } else {
      alert("Erreur lors de l'analyse avec l'IA. Vérifiez le format du texte.");
    }
    setIsLoadingIA(false);
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { id: Math.random().toString(36).substr(2, 9), quantite: 0, unite: '', nom: '' }]
    }));
  };

  const removeIngredient = (id: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter(ing => ing.id !== id)
    }));
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...(prev.instructions || []), { id: Math.random().toString(36).substr(2, 9), titre: `Étape ${(prev.instructions?.length || 0) + 1}`, texte: '' }]
    }));
  };

  const removeInstruction = (id: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions?.filter(inst => inst.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) return;
    onSave(formData as Recette);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{recette ? 'Modifier' : 'Nouvelle Recette'}</h2>
            <p className="text-sm text-slate-400">Remplissez les détails pour votre plat</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Basic Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nom de la recette</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.nom}
                    onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="ex: Lasagnes à la bolognaise"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowIAPaste(true)}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
                    title="Importer avec l'IA"
                  >
                    <Sparkles size={18} />
                    <span className="hidden sm:inline text-xs font-bold">Import IA</span>
                  </button>
                </div>
              </div>

              {showIAPaste && (
                <div className="p-4 bg-slate-900 rounded-xl space-y-4 shadow-xl border border-slate-700">
                  <div className="flex justify-between items-center">
                    <h4 className="text-white text-xs font-bold uppercase tracking-widest">Coller votre recette</h4>
                    <button onClick={() => setShowIAPaste(false)} className="text-slate-400 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <textarea 
                    autoFocus
                    placeholder="Collez ici les ingrédients, instructions ou l'URL de la recette..."
                    rows={4}
                    value={rawRecipeText}
                    onChange={e => setRawRecipeText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-xs focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                  />
                  <button 
                    type="button"
                    onClick={handleIA}
                    disabled={isLoadingIA || !rawRecipeText}
                    className="w-full btn-primary text-xs flex justify-center items-center gap-2"
                  >
                    {isLoadingIA ? <Loader2 className="animate-spin" size={16} /> : <Clipboard size={16} />}
                    <span>Analyser et Encaisser</span>
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Image</label>
                <div 
                  className={`relative h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  } overflow-hidden`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, image: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                >
                  {formData.image ? (
                    <>
                      <img src={formData.image} alt="Prévisualisation" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={32} className="text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">Glissez ou cliquez pour uploader</p>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                  <select 
                    value={formData.categorie}
                    onChange={e => setFormData(prev => ({ ...prev, categorie: e.target.value as CategorieRecette }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Portions</label>
                  <input 
                    type="number" 
                    value={formData.portions}
                    onChange={e => setFormData(prev => ({ ...prev, portions: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Stats & Meta */}
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Prép. (min)</label>
                  <input 
                    type="number" 
                    value={formData.prepMin}
                    onChange={e => setFormData(prev => ({ ...prev, prepMin: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cuisson (min)</label>
                  <input 
                    type="number" 
                    value={formData.cuissonMin}
                    onChange={e => setFormData(prev => ({ ...prev, cuissonMin: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Calories</label>
                <input 
                  type="number" 
                  value={formData.calories}
                  onChange={e => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  placeholder="Optionnel"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <input 
                  type="checkbox"
                  checked={formData.estIA}
                  onChange={e => setFormData(prev => ({ ...prev, estIA: e.target.checked }))}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-200"
                />
                <div>
                  <span className="block font-bold text-blue-900 text-sm">Recette IA</span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Identifiée par intelligence artificielle</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-6 pt-6 border-t border-slate-50">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase flex items-center justify-between">
              Ingrédients
              <button 
                type="button" 
                onClick={addIngredient}
                className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Ajouter
              </button>
            </h3>
            <div className="space-y-3">
              {(formData.ingredients || []).map((ing, idx) => (
                <div key={ing.id} className="flex gap-3 items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <input 
                    type="number" 
                    placeholder="Qté" 
                    value={ing.quantite === 0 ? '' : ing.quantite}
                    onChange={e => {
                      const newIngs = [...(formData.ingredients || [])];
                      newIngs[idx].quantite = parseFloat(e.target.value) || 0;
                      setFormData(prev => ({ ...prev, ingredients: newIngs }));
                    }}
                    className="w-20 px-3 py-2 bg-white border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-medium"
                  />
                  <input 
                    type="text" 
                    placeholder="Unité" 
                    value={ing.unite}
                    onChange={e => {
                      const newIngs = [...(formData.ingredients || [])];
                      newIngs[idx].unite = e.target.value;
                      setFormData(prev => ({ ...prev, ingredients: newIngs }));
                    }}
                    className="w-20 px-3 py-2 bg-white border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-medium"
                  />
                   <input 
                    type="text" 
                    placeholder="Ingrédient" 
                    value={ing.nom}
                    onChange={e => {
                      const newIngs = [...(formData.ingredients || [])];
                      newIngs[idx].nom = e.target.value;
                      setFormData(prev => ({ ...prev, ingredients: newIngs }));
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-medium"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeIngredient(ing.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Section */}
          <div className="space-y-6 pt-6 border-t border-slate-50">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase flex items-center justify-between">
              Instructions
              <button 
                type="button" 
                onClick={addInstruction}
                className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Ajouter
              </button>
            </h3>
            <div className="space-y-4">
              {(formData.instructions || []).map((inst, idx) => (
                <div key={inst.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 relative group">
                   <button 
                    type="button" 
                    onClick={() => removeInstruction(inst.id)}
                    className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm text-xs">
                        {idx + 1}
                      </span>
                      <input 
                        type="text" 
                        placeholder="Titre de l'étape" 
                        value={inst.titre}
                        onChange={e => {
                          const newInsts = [...(formData.instructions || [])];
                          newInsts[idx].titre = e.target.value;
                          setFormData(prev => ({ ...prev, instructions: newInsts }));
                        }}
                        className="flex-1 bg-white px-3 py-2 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-bold"
                      />
                    </div>
                    <textarea 
                      placeholder="Décrivez l'étape..." 
                      rows={2}
                      value={inst.texte}
                      onChange={e => {
                        const newInsts = [...(formData.instructions || [])];
                        newInsts[idx].texte = e.target.value;
                        setFormData(prev => ({ ...prev, instructions: newInsts }));
                      }}
                      className="w-full bg-white px-4 py-3 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-medium leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sticky bottom-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 btn-secondary text-sm"
          >
            Annuler
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="flex-[2] btn-primary text-sm shadow-md"
          >
            {recette ? 'Sauvegarder les modifications' : 'Créer la recette'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
