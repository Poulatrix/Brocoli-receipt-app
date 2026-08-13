import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, ChevronLeft, ChevronRight, Lightbulb, Trash2, Calendar as CalendarIcon, ShoppingCart, CheckCircle2, X } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '../store';
import { Recette, PlanningEntry } from '../types';

export function PlanningPage() {
  const { recettes, planning, setPlanningEntry, addToShoppingList } = useStore();
  const [isAssigning, setIsAssigning] = useState<{ date: string } | null>(null);
  const [selectedSuggest, setSelectedSuggest] = useState<PlanningEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestSearchTerm, setSuggestSearchTerm] = useState('');
  const [newSuggestion, setNewSuggestion] = useState('');
  const [showShoppingTools, setShowShoppingTools] = useState(false);
  const [selectedForShopping, setSelectedForShopping] = useState<string[]>([]);
  const [draggedDate, setDraggedDate] = useState<string | null>(null);

  const today = startOfToday();
  const days = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  const filteredRecettes = recettes.filter(r => 
    r.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuggestRecettes = recettes.filter(r => 
    r.nom.toLowerCase().includes(suggestSearchTerm.toLowerCase())
  );

  const autoSuggestions = useMemo(() => {
    const realPlanning = planning.filter(p => !p.date.startsWith('1900-'));
    const lastUsedMap = new Map<string, string>();
    
    realPlanning.forEach(p => {
      if (p.recetteId) {
        const existing = lastUsedMap.get(p.recetteId);
        if (!existing || p.date > existing) {
          lastUsedMap.set(p.recetteId, p.date);
        }
      }
    });

    const existingSuggestIds = new Set(
      planning
        .filter(p => p.date.startsWith('1900-') && p.recetteId)
        .map(p => p.recetteId)
    );

    return [...recettes]
      .filter(r => !existingSuggestIds.has(r.id))
      .sort((a, b) => {
        const lastA = lastUsedMap.get(a.id) || '0000-00-00';
        const lastB = lastUsedMap.get(b.id) || '0000-00-00';
        return lastA.localeCompare(lastB);
      })
      .slice(0, 4);
  }, [recettes, planning]);

  const planningDays = useMemo(() => {
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = planning.find(p => p.date === dateStr);
      const recette = entry?.recetteId ? recettes.find(r => r.id === entry.recetteId) : null;
      return { day, dateStr, entry, recette };
    }).filter(d => d.recette !== null);
  }, [days, planning, recettes]);

  const handleAssign = (recetteId: string | null, suggestion: string | null) => {
    if (isAssigning) {
      const isSuggestMode = isAssigning.date === 'suggest';
      const date = isSuggestMode 
        ? `1900-${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}-${(Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0')}`
        : isAssigning.date;
      
      // If adding to real planning (not suggest), check if it exists in suggestions and remove it
      if (!isSuggestMode) {
        const existingSuggestion = planning.find(p => 
          p.date.startsWith('1900-') && 
          ((recetteId && p.recetteId === recetteId) || (suggestion && p.suggestionLibre === suggestion))
        );
        if (existingSuggestion) {
          setPlanningEntry(existingSuggestion.date, null, null);
        }
      }

      setPlanningEntry(date, recetteId, suggestion);
      setIsAssigning(null);
      setSearchTerm('');
    }
  };

  const handleAssignSuggestToDate = (date: string) => {
    if (selectedSuggest) {
      setPlanningEntry(date, selectedSuggest.recetteId, selectedSuggest.suggestionLibre);
      // Remove from suggestions list
      setPlanningEntry(selectedSuggest.date, null, null);
      setSelectedSuggest(null);
    }
  };

  const handleAddAllToShopping = () => {
    const selectedEntries = planningDays.filter(p => selectedForShopping.includes(p.dateStr));
    selectedEntries.forEach(entry => {
      if (entry.recette) {
        addToShoppingList(entry.recette.ingredients);
      }
    });
    setShowShoppingTools(false);
    setSelectedForShopping([]);
    alert(`${selectedEntries.length} repas ajoutés à votre liste de courses !`);
  };

  const handleDragStart = (e: React.DragEvent, date: string) => {
    setDraggedDate(date);
    e.dataTransfer.setData('text/plain', date);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a small delay to allow the drag image to be created before we change the opacity
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.classList.add('opacity-40');
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDate(null);
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('opacity-40');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const sourceDate = e.dataTransfer.getData('text/plain');
    if (!sourceDate || sourceDate === targetDate) return;

    const sourceEntry = planning.find(p => p.date === sourceDate);
    const targetEntry = planning.find(p => p.date === targetDate);

    // Swap logic
    const sourceRecetteId = sourceEntry?.recetteId || null;
    const sourceSuggest = sourceEntry?.suggestionLibre || null;
    const targetRecetteId = targetEntry?.recetteId || null;
    const targetSuggest = targetEntry?.suggestionLibre || null;

    // Use a single sequence of updates or handle them safely
    await setPlanningEntry(targetDate, sourceRecetteId, sourceSuggest);
    await setPlanningEntry(sourceDate, targetRecetteId, targetSuggest);
    
    setDraggedDate(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Planning Repas</h2>
          <p className="text-sm text-slate-500">Planifiez vos 14 prochains jours de cuisine</p>
        </div>
        <div className="flex gap-2">
          {planningDays.length > 0 && (
            <button 
              onClick={() => {
                setShowShoppingTools(true);
                setSelectedForShopping(planningDays.map(p => p.dateStr));
              }}
              className="btn-primary"
            >
              <ShoppingCart size={18} />
              <span>Générer ma liste</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const entry = planning.find(p => p.date === dateStr);
          const recette = entry?.recetteId ? recettes.find(r => r.id === entry.recetteId) : null;
          const isToday = isSameDay(day, today);

          return (
            <div 
              key={dateStr}
              draggable={!!(recette || entry?.suggestionLibre)}
              onDragStart={(e) => handleDragStart(e, dateStr)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dateStr)}
              onClick={() => {
                if (selectedSuggest) {
                  handleAssignSuggestToDate(dateStr);
                } else {
                  setIsAssigning({ date: dateStr });
                }
              }}
              className={`relative group bg-white border rounded-2xl p-6 min-h-[160px] md:min-h-[180px] shadow-sm hover:shadow-md transition-all cursor-pointer ${
                isToday ? 'border-emerald-600 ring-1 ring-emerald-600/10' : 'border-slate-200 hover:border-emerald-300'
              } ${selectedSuggest ? 'ring-2 ring-emerald-500 ring-offset-2 animate-pulse' : ''} ${draggedDate === dateStr ? 'bg-slate-50/50 border-dashed border-emerald-400' : ''}`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className={`text-[11px] md:text-xs font-bold uppercase tracking-widest ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {format(day, 'EEEE', { locale: fr }).replace('.', '')}
                </span>
                <span className={`text-sm font-bold ${isToday ? 'bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-900'}`}>
                  {format(day, 'd')}
                </span>
              </div>

              {recette ? (
                <div className="space-y-3">
                  <div className="relative w-full h-16 md:h-20 rounded-xl overflow-hidden border border-slate-100 shadow-sm transition-transform group-hover:scale-[1.02]">
                    <img 
                      src={recette.image || `https://picsum.photos/seed/${recette.id}/200/200`} 
                      className="w-full h-full object-cover" 
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[11px] md:text-xs font-bold text-slate-800 leading-tight line-clamp-2 uppercase tracking-tight">
                    {recette.nom}
                  </p>
                </div>
              ) : entry?.suggestionLibre ? (
                <div className="space-y-3">
                   <div className="relative w-full h-16 md:h-20 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 transition-transform group-hover:scale-[1.02]">
                    <img 
                      src={`https://loremflickr.com/200/200/food,${encodeURIComponent(entry.suggestionLibre.split(' ')[0])}?lock=${entry.date.length}`} 
                      className="w-full h-full object-cover opacity-80" 
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-[10px] md:text-[11px] font-bold text-slate-600 leading-tight uppercase line-clamp-2 tracking-tight">
                    {entry.suggestionLibre}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Plus size={20} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedSuggest && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="bg-emerald-600 p-4 rounded-xl flex items-center justify-between text-white shadow-lg sticky bottom-4 z-50 mx-auto max-w-lg"
        >
          <div className="flex items-center gap-3">
             <Plus size={20} />
             <span className="text-sm font-bold">Sélectionnez une date pour placer : {selectedSuggest.suggestionLibre || recettes.find(r => r.id === selectedSuggest.recetteId)?.nom}</span>
          </div>
          <button onClick={() => setSelectedSuggest(null)} className="p-1 hover:bg-white/20 rounded-full">
            <X size={20} />
          </button>
        </motion.div>
      )}

      <div className="space-y-6 pt-10 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="text-yellow-500" size={20} strokeWidth={2.5} />
            Suggestions de repas
          </h3>
          <button 
            onClick={() => setIsAssigning({ date: 'suggest' })}
            className="btn-secondary text-xs"
          >
            Ajouter une suggestion
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {planning.filter(p => p.date.startsWith('1900-')).map((suggest, idx) => {
            const r = suggest.recetteId ? recettes.find(rec => rec.id === suggest.recetteId) : null;
            return (
              <div key={suggest.date} className="card p-5 space-y-4 relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => setPlanningEntry(suggest.date, null, null)}
                  className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 shadow-sm">
                    <img 
                      src={r?.image || (suggest.suggestionLibre ? `https://loremflickr.com/200/200/food,${encodeURIComponent(suggest.suggestionLibre.split(' ')[0])}?lock=${suggest.date.length}` : `https://picsum.photos/seed/${idx}/48/48`)} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight">{r?.nom || suggest.suggestionLibre}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{r?.categorie || 'IDÉE LIBRE'}</p>
                  </div>
                </div>
                <button 
                  className="w-full py-2 bg-slate-50 border border-slate-100 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
                  onClick={() => setSelectedSuggest(suggest)}
                >
                  <Plus size={14} />
                  Planifier ce repas
                </button>
              </div>
            );
          })}

          {/* Auto Suggestions (Grisées) */}
          {autoSuggestions.map((r, idx) => (
            <div 
              key={`auto-${r.id}`} 
              className="card p-5 space-y-4 relative group opacity-60 hover:opacity-100 transition-all border-dashed border-slate-200 cursor-pointer hover:border-emerald-200 overflow-visible"
              onClick={() => {
                const now = new Date();
                const randomDay = Math.floor(Math.random() * 28) + 1;
                const randomMonth = Math.floor(Math.random() * 12) + 1;
                const dateString = `1900-${randomMonth.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;
                setPlanningEntry(dateString, r.id, null);
              }}
            >
              <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border border-emerald-100 shadow-sm group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all transform group-hover:scale-105">
                Suggestion
              </div>
              <div className="flex items-center gap-4 grayscale group-hover:grayscale-0 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 shadow-sm">
                  <img src={r.image || `https://picsum.photos/seed/${idx}/48/48`} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">{r.nom}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{r.categorie}</p>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-medium text-center italic">
                Cliquer pour valider cette suggestion
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {/* Shopping selection Modal */}
        {showShoppingTools && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShoppingTools(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-bold text-slate-900">Préparer ma liste</h3>
                    <p className="text-xs text-slate-400 font-medium">Sélectionnez les repas à ajouter</p>
                 </div>
                 <button onClick={() => setShowShoppingTools(false)} className="p-2 hover:bg-slate-50 rounded-full">
                    <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide py-2">
                {planningDays.map((p) => (
                  <button 
                    key={p.dateStr}
                    onClick={() => {
                      setSelectedForShopping(prev => 
                        prev.includes(p.dateStr) 
                        ? prev.filter(d => d !== p.dateStr) 
                        : [...prev, p.dateStr]
                      );
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      selectedForShopping.includes(p.dateStr) 
                      ? 'border-emerald-200 bg-emerald-50/50' 
                      : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-100">
                         <img src={p.recette?.image} className="w-full h-full object-cover" alt="" />
                       </div>
                       <div className="text-left">
                         <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.recette?.nom}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                           {format(parseISO(p.dateStr), 'EEEE d MMMM', { locale: fr })}
                         </p>
                       </div>
                    </div>
                    <div className={selectedForShopping.includes(p.dateStr) ? 'text-emerald-600' : 'text-slate-200'}>
                      <CheckCircle2 size={24} strokeWidth={2.5} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-50 flex flex-col gap-3">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedForShopping.length} repas sélectionnés</span>
                    <button 
                      onClick={() => setSelectedForShopping(selectedForShopping.length === planningDays.length ? [] : planningDays.map(p => p.dateStr))}
                      className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter"
                    >
                      {selectedForShopping.length === planningDays.length ? 'Tout décocher' : 'Tout cocher'}
                    </button>
                 </div>
                 <button 
                  disabled={selectedForShopping.length === 0}
                  onClick={handleAddAllToShopping}
                  className="w-full btn-primary justify-center shadow-lg shadow-emerald-500/20 py-4"
                 >
                   Envoyer à la liste de courses
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAssigning && isAssigning.date !== 'suggest' && isAssigning.date !== 'add_from_suggest' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAssigning(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Programmer un repas</h3>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                   {format(parseISO(isAssigning.date), 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Rechercher une recette ou saisie libre..."
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm) handleAssign(null, searchTerm);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 -mr-1">
                {filteredRecettes.length > 0 ? (
                  filteredRecettes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleAssign(r.id, null)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-50 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                        <img src={r.image || `https://picsum.photos/seed/${r.id}/40/40`} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{r.nom}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">{r.categorie}</p>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-emerald-400" size={18} />
                    </button>
                  ))
                ) : searchTerm.length > 0 ? (
                  <button 
                    onClick={() => handleAssign(null, searchTerm)}
                    className="w-full p-4 border border-dashed border-emerald-200 rounded-2xl text-emerald-600 font-bold hover:bg-emerald-50 transition-all text-center"
                  >
                    Ajouter "{searchTerm}" comme idée libre
                  </button>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <CalendarIcon className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-xs">Tapez pour une idée libre ou choisissez une recette</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsAssigning(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Annuler</button>
                <button 
                  onClick={() => handleAssign(null, null)}
                  className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all"
                >
                  Effacer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAssigning && isAssigning.date === 'suggest' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAssigning(null); setSuggestSearchTerm(''); setNewSuggestion(''); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5"
            >
               <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold text-slate-900">Nouvelle suggestion</h3>
                 <button 
                  onClick={() => { setIsAssigning(null); setSuggestSearchTerm(''); setNewSuggestion(''); }} 
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                 >
                   <X size={18} />
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choisir une recette existante</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Rechercher parmi vos recettes..."
                        value={suggestSearchTerm}
                        onChange={(e) => setSuggestSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {filteredSuggestRecettes.length > 0 ? (
                        filteredSuggestRecettes.map(r => (
                          <button 
                            key={r.id}
                            onClick={() => {
                              const randomDay = Math.floor(Math.random() * 28) + 1;
                              const randomMonth = Math.floor(Math.random() * 12) + 1;
                              const finalDate = `1900-${randomMonth.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;
                              setPlanningEntry(finalDate, r.id, null);
                              setIsAssigning(null);
                              setSuggestSearchTerm('');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 text-left transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                <img src={r.image || `https://picsum.photos/seed/${r.id}/36/36`} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-900">{r.nom}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{r.categorie}</p>
                              </div>
                            </div>
                            <Plus size={16} className="text-slate-300 group-hover:text-emerald-600 shrink-0" />
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-400 italic">
                          Aucune recette ne correspond à "{suggestSearchTerm}"
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="relative flex items-center gap-2 py-1">
                   <div className="h-px flex-1 bg-slate-100"></div>
                   <span className="text-[10px] font-bold text-slate-300 uppercase">OU IDÉE LIBRE</span>
                   <div className="h-px flex-1 bg-slate-100"></div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Idée libre</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newSuggestion || ''}
                        onChange={(e) => setNewSuggestion(e.target.value)}
                        placeholder="ex: Commande de sushis, Soirée tacos..."
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSuggestion.trim()) {
                            const randomDay = Math.floor(Math.random() * 28) + 1;
                            const randomMonth = Math.floor(Math.random() * 12) + 1;
                            const dateString = `1900-${randomMonth.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;
                            setPlanningEntry(dateString, null, newSuggestion.trim());
                            setNewSuggestion('');
                            setSuggestSearchTerm('');
                            setIsAssigning(null);
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (newSuggestion.trim()) {
                            const randomDay = Math.floor(Math.random() * 28) + 1;
                            const randomMonth = Math.floor(Math.random() * 12) + 1;
                            const dateString = `1900-${randomMonth.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;
                            setPlanningEntry(dateString, null, newSuggestion.trim());
                            setNewSuggestion('');
                            setSuggestSearchTerm('');
                            setIsAssigning(null);
                          }
                        }}
                        disabled={!newSuggestion.trim()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 text-xs flex items-center gap-1"
                      >
                        <Plus size={16} />
                        <span>Ajouter</span>
                      </button>
                    </div>
                 </div>
               </div>

               <button 
                onClick={() => { setIsAssigning(null); setSuggestSearchTerm(''); setNewSuggestion(''); }} 
                className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
               >
                 Annuler
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

