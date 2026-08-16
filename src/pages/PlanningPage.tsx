import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Lightbulb, 
  Trash2, 
  Calendar as CalendarIcon, 
  ShoppingCart, 
  CheckCircle2, 
  X,
  RotateCcw,
  ArrowRightLeft
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfToday, 
  isSameDay, 
  parseISO, 
  startOfWeek, 
  isBefore, 
  addWeeks 
} from 'date-fns';
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
  const [weekOffset, setWeekOffset] = useState(0);

  const today = startOfToday();
  
  // Base Monday of the current week (anchored to Monday, moves only when next Monday is reached)
  const baseMonday = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const activeMonday = useMemo(() => addWeeks(baseMonday, weekOffset), [baseMonday, weekOffset]);

  // Week 1 (7 days: Monday to Sunday)
  const week1Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(activeMonday, i));
  }, [activeMonday]);

  // Week 2 (7 days: Next Monday to Sunday)
  const week2Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(activeMonday, 7 + i));
  }, [activeMonday]);

  // Total 14 days for planning & shopping
  const days = useMemo(() => [...week1Days, ...week2Days], [week1Days, week2Days]);

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

    await setPlanningEntry(targetDate, sourceRecetteId, sourceSuggest);
    await setPlanningEntry(sourceDate, targetRecetteId, targetSuggest);
    
    setDraggedDate(null);
  };

  // Helper render for single day card
  const renderDayCard = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = planning.find(p => p.date === dateStr);
    const recette = entry?.recetteId ? recettes.find(r => r.id === entry.recetteId) : null;
    const isToday = isSameDay(day, today);
    const isPast = isBefore(day, today) && !isToday;

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
        className={`relative group rounded-2xl p-4 sm:p-5 min-h-[160px] md:min-h-[175px] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between border ${
          isToday 
            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20' 
            : isPast
              ? 'bg-slate-50/70 border-slate-200/90 hover:border-emerald-300'
              : 'bg-white border-slate-200 hover:border-emerald-300'
        } ${selectedSuggest ? 'ring-2 ring-emerald-500 ring-offset-2 animate-pulse' : ''} ${
          draggedDate === dateStr ? 'bg-slate-100/80 border-dashed border-emerald-400 opacity-60' : ''
        }`}
      >
        {/* Top Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isToday ? 'text-emerald-700 font-extrabold' : isPast ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {format(day, 'EEEE', { locale: fr })}
            </span>
            {isPast && (
              <span className="text-[9px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.2 rounded">
                Passé
              </span>
            )}
          </div>

          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isToday 
              ? 'bg-emerald-600 text-white font-extrabold shadow-xs' 
              : 'text-slate-700 bg-slate-100'
          }`}>
            {format(day, 'd MMM', { locale: fr })}
          </span>
        </div>

        {/* Content */}
        {recette ? (
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <div className="relative w-full h-20 sm:h-22 rounded-xl overflow-hidden border border-slate-100 shadow-2xs group/img">
              <img 
                src={recette.image || `https://picsum.photos/seed/${recette.id}/300/200`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                alt=""
                referrerPolicy="no-referrer"
              />
              
              {/* Quick remove button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPlanningEntry(dateStr, null, null);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Retirer le repas"
              >
                <Trash2 size={12} />
              </button>

              <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-semibold text-white uppercase tracking-wider">
                {recette.categorie}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                {recette.nom}
              </p>
            </div>
          </div>
        ) : entry?.suggestionLibre ? (
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <div className="relative w-full h-20 sm:h-22 rounded-xl overflow-hidden border border-slate-100 shadow-2xs bg-slate-100">
              <img 
                src={`https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80`} 
                className="w-full h-full object-cover opacity-85" 
                alt=""
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPlanningEntry(dateStr, null, null);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Retirer l'idée"
              >
                <Trash2 size={12} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-semibold text-white uppercase tracking-wider">
                Idée libre
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">
                {entry.suggestionLibre}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 py-3 text-slate-400 hover:text-emerald-600 transition-colors">
            <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center mb-1 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all">
              <Plus size={16} />
            </div>
            <span className="text-[10px] font-semibold">Ajouter</span>
          </div>
        )}

        {/* Drag Hint on card hover */}
        {(recette || entry?.suggestionLibre) && (
          <div className="mt-2 pt-1 border-t border-slate-100/80 flex items-center justify-between text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1">
              <ArrowRightLeft size={10} /> Glisser pour intervertir
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-serif">Planning Repas</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Semaine figée du lundi au dimanche • Glissez-déposez un plat pour l'intervertir à tout moment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Navigation Controls */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Semaine précédente"
            >
              <ChevronLeft size={16} />
            </button>

            {weekOffset !== 0 && (
              <button 
                onClick={() => setWeekOffset(0)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1 mx-1"
                title="Revenir à la semaine en cours"
              >
                <RotateCcw size={12} />
                <span>Cette semaine</span>
              </button>
            )}

            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Semaine suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {planningDays.length > 0 && (
            <button 
              onClick={() => {
                setShowShoppingTools(true);
                setSelectedForShopping(planningDays.map(p => p.dateStr));
              }}
              className="btn-primary py-2 px-3 sm:px-4 text-xs font-bold"
            >
              <ShoppingCart size={16} />
              <span>Générer ma liste ({planningDays.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* SEMAINE 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {weekOffset === 0 ? "Semaine en cours" : `Semaine du ${format(week1Days[0], 'd MMMM', { locale: fr })}`}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              (du {format(week1Days[0], 'd MMM', { locale: fr })} au {format(week1Days[6], 'd MMM', { locale: fr })})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {week1Days.map(day => renderDayCard(day))}
        </div>
      </div>

      {/* SEMAINE 2 */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {weekOffset === 0 ? "Semaine suivante" : `Semaine du ${format(week2Days[0], 'd MMMM', { locale: fr })}`}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              (du {format(week2Days[0], 'd MMM', { locale: fr })} au {format(week2Days[6], 'd MMM', { locale: fr })})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {week2Days.map(day => renderDayCard(day))}
        </div>
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

