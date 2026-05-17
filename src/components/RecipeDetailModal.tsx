import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingCart, Pencil, Trash2, ChevronRight, Clock, Users, Flame, ChefHat, Share2, ChevronLeft, Printer, Mail, MessageCircle, Copy } from 'lucide-react';
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
  const [showShareMenu, setShowShareMenu] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const getShareText = () => {
    const ingredients = adjustedIngredients
      .map(ing => `• ${ing.quantite > 0 ? ing.quantite + ' ' : ''}${ing.unite} ${ing.nom}`)
      .join('\n');
    
    return `🥘 *${recette.nom.toUpperCase()}*\n\n` +
      `🕒 Préparation: ${recette.prepMin}min | Cuisson: ${recette.cuissonMin}min\n` +
      `👥 Pour ${portions} personnes\n\n` +
      `*Ingrédients :*\n${ingredients}\n\n` +
      `*Instructions :*\n${recette.instructions.map((s, i) => `${i+1}. ${s.titre}`).join('\n')}\n\n` +
      `Retrouvez la recette complète ici : ${window.location.origin}${window.location.pathname}?recipe=${recette.id}\n\n` +
      `_Partagé via BROCOLI_`;
  };

  const shareViaEmail = () => {
    const subject = `Recette : ${recette.nom}`;
    const body = getShareText();
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowShareMenu(false);
  };

  const shareViaMessenger = () => {
    const text = getShareText();
    const url = `${window.location.origin}${window.location.pathname}?recipe=${recette.id}`;
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const copyToClipboard = async () => {
    const text = getShareText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      alert('Recette copiée dans le presse-papier !');
    } catch (err) {
      alert('Erreur lors de la copie.');
    }
    setShowShareMenu(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recette.nom,
        text: `Découvrez ma recette de ${recette.nom} !`,
        url: `${window.location.origin}${window.location.pathname}?recipe=${recette.id}`
      }).catch(err => {
        if (err.name !== 'AbortError') setShowShareMenu(true);
      });
    } else {
      setShowShareMenu(true);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const ingredientsHtml = adjustedIngredients
      .map(ing => `<li>${ing.quantite > 0 ? ing.quantite + ' ' : ''}${ing.unite} ${ing.nom}</li>`)
      .join('');
    
    const instructionsHtml = recette.instructions
      .map((s, i) => `<h3>${i+1}. ${s.titre}</h3><p>${s.texte}</p>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${recette.nom} - BROCOLI</title>
          <style>
            body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { font-size: 32px; color: #0f172a; margin-bottom: 8px; }
            .meta { color: #64748b; font-size: 14px; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
            h2 { border-bottom: 2px solid #10b981; display: inline-block; padding-bottom: 4px; margin-top: 30px; }
            ul { list-style: none; padding: 0; }
            li { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${recette.nom}</h1>
          <div class="meta">
            ${recette.prepMin} min prép • ${recette.cuissonMin} min cuisson • Pour ${portions} personnes
          </div>
          <h2>Ingrédients</h2>
          <ul>${ingredientsHtml}</ul>
          <h2>Instructions</h2>
          <div>${instructionsHtml}</div>
          <div class="footer">BROCOLI - Receipt App</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const confirmDelete = () => {
    onDelete();
    setShowConfirmDelete(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center md:p-8 p-0">
      <AnimatePresence>
        {showShareMenu && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs space-y-4 overflow-hidden border border-slate-100 text-center"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Partager la recette</h3>
                <button onClick={() => setShowShareMenu(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={shareViaMessenger}
                  className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all group text-left border border-transparent hover:border-blue-100"
                >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <MessageCircle size={24} fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Messenger</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Envoyer via Facebook</p>
                  </div>
                </button>

                <button 
                  onClick={shareViaEmail}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-left border border-transparent hover:border-slate-100"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Mail size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">E-mail</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Partager par courriel</p>
                  </div>
                </button>

                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-left border border-transparent hover:border-slate-100"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Copy size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Copier le texte</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Prese-papier</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
        className="relative bg-white w-full max-w-[860px] md:h-[640px] h-full rounded-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-0"
      >
        {/* Modal Header Image */}
        <div 
          className="md:h-52 h-40 bg-cover bg-center shrink-0 relative" 
          style={{ backgroundImage: `url(${recette.image || `https://picsum.photos/seed/${recette.id}/1000/400`})` }}
        >
          <div className="w-full h-full bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{recette.nom}</h2>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full p-2 transition-all z-20"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden text-sm relative">
          <AnimatePresence>
            {modeCuisine && (
              <CookingMode 
                instructions={recette.instructions} 
                onClose={() => setModeCuisine(false)} 
              />
            )}
          </AnimatePresence>

          {/* Desktop Left: Ingredients & Instructions */}
          <div className="hidden md:block md:w-2/3 p-8 overflow-y-auto border-r border-slate-100 space-y-10 scrollbar-hide">
            {/* Ingredients Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Ingrédients</h3>
                <button 
                  onClick={handleAddShopping}
                  disabled={excludedIngredients.length === adjustedIngredients.length}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
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
                      : 'bg-white border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        excludedIngredients.includes(ing.id) 
                        ? 'bg-white border-slate-200 text-slate-200' 
                        : 'bg-emerald-600 border-emerald-600 text-white'
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

            {/* Instructions Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Instructions</h3>
              </div>
              <div className="space-y-6">
                {recette.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
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

          {/* Desktop Right: Meta Info */}
          <div className="hidden md:flex md:w-1/3 bg-slate-50/50 p-8 flex-col pt-6 overflow-y-auto">
            <button 
              onClick={() => setModeCuisine(true)}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mb-10"
            >
              <ChefHat size={20} />
              Cuisiner maintenant
            </button>

            <div className="flex justify-end gap-3 mb-10">
              <button 
                onClick={handlePrint}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-600 transition-colors shadow-sm"
                title="Imprimer"
              >
                <Printer size={20} />
              </button>
              <button 
                onClick={handleShare}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-600 transition-colors shadow-sm"
                title="Partager"
              >
                <Share2 size={20} />
              </button>
              <button 
                onClick={onEdit}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-600 transition-colors shadow-sm"
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
                    className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-lg text-emerald-600 hover:bg-slate-200"
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
              </div>
            </div>
          </div>

          {/* Mobile Optimized View */}
          <div className="md:hidden flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            {/* 1. Meta Info (Portions, Prep, Cook) */}
            <div className="space-y-4">
               <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={20} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Portions</p>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setPortions(Math.max(1, portions - 1))} className="text-lg font-bold text-slate-400">-</button>
                        <span className="text-lg font-bold text-slate-900">{portions}</span>
                        <button onClick={() => setPortions(portions + 1)} className="text-lg font-bold text-emerald-600">+</button>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Prép</p>
                      <p className="font-bold text-slate-900">{recette.prepMin}m</p>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Flame size={18} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Cuisson</p>
                      <p className="font-bold text-slate-900">{recette.cuissonMin}m</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* 2. Ingredients */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Ingrédients</h3>
                <button 
                  onClick={handleAddShopping}
                  className="text-emerald-600 font-bold text-xs underline"
                >
                  Tout ajouter
                </button>
              </div>
              <ul className="space-y-2">
                {adjustedIngredients.map((ing) => (
                  <li 
                    key={ing.id} 
                    onClick={() => toggleIngredient(ing.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      excludedIngredients.includes(ing.id) ? 'bg-slate-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${excludedIngredients.includes(ing.id) ? 'bg-white border-slate-200' : 'bg-emerald-600 border-emerald-600 text-white'}`}>
                        {!excludedIngredients.includes(ing.id) && <Plus size={10} strokeWidth={4} />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{ing.nom}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{ing.quantite > 0 && ing.quantite} {ing.unite}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Cook Now Button */}
            <button 
              onClick={() => setModeCuisine(true)}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <ChefHat size={20} />
              Cuisiner maintenant
            </button>

            {/* 4. Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Instructions</h3>
              <div className="space-y-6">
                {recette.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 text-xs border border-emerald-100">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed pt-0.5">{step.texte}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Bar (Footer for Mobile) */}
            <div className="flex justify-between items-center pt-8 border-t border-slate-100 pb-10">
               <button onClick={handleShare} className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="p-3 bg-slate-50 rounded-xl"><Share2 size={20} /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Partager</span>
               </button>
               <button onClick={onEdit} className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="p-3 bg-slate-50 rounded-xl"><Pencil size={20} /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modifier</span>
               </button>
               <button onClick={() => setShowConfirmDelete(true)} className="flex flex-col items-center gap-2 text-red-400">
                  <div className="p-3 bg-red-50 rounded-xl"><Trash2 size={20} /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-300">Effacer</span>
               </button>
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
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
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
          className="flex-[2] btn-primary justify-center shadow-lg shadow-emerald-500/20"
        >
          {currentStep === instructions.length - 1 ? 'Terminer' : 'Étape suivante'}
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}
