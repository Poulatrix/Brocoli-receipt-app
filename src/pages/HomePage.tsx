import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Settings, 
  Heart, 
  Clock, 
  Users, 
  Sparkles, 
  ShoppingCart, 
  Plus, 
  X, 
  Check, 
  ChevronRight, 
  Lightbulb, 
  ChefHat, 
  ArrowRight, 
  Trash2, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  CheckCircle2,
  Edit3,
  Utensils,
  BookOpen
} from 'lucide-react';
import { format, addDays, startOfToday, startOfWeek, isSameDay, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '../store';
import { Recette, PlanningEntry } from '../types';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { RecipeFormModal } from '../components/RecipeFormModal';

interface HomePageProps {
  onNavigate: (tabId: string) => void;
  key?: React.Key;
}

// 15 Astuces culinaires, zéro-déchet, nutrition & bien-être
const DAILY_TIPS = [
  {
    title: "Ne jetez plus vos fanes et épluchures",
    text: "Mixez les fanes de carottes ou de radis avec de l'huile d'olive, du parmesan et de l'ail pour créer un pesto maison délicieux et zéro déchet.",
    category: "Anti-gaspillage"
  },
  {
    title: "Conservation optimale des herbes",
    text: "Conservez vos herbes fraîches (persil, coriandre, menthe) comme un bouquet de fleurs dans un verre d'eau au réfrigérateur pour doubler leur durée de vie.",
    category: "Conservation"
  },
  {
    title: "Le secret des légumes rôtis croustillants",
    text: "Étalez vos légumes en une seule couche sans trop les chevaucher sur la plaque du four. S'ils sont trop serrés, ils cuiront à la vapeur au lieu de dorer.",
    category: "Astuce Cuisson"
  },
  {
    title: "Hydratation gourmande et digestion",
    text: "Préparez une carafée d'eau infusée au concombre, citron et menthe au frais. À boire tout au long de la journée pour stimuler la digestion.",
    category: "Bien-être"
  },
  {
    title: "Sauver le pain rassis",
    text: "Passez votre pain dur rapidement sous le robinet d'eau froide, puis enfournez-le 5 à 8 minutes à 180°C : il retrouvera une croûte ultra croustillante !",
    category: "Anti-gaspillage"
  },
  {
    title: "Révéler la saveur des épices",
    text: "Faites torréfier vos épices moulues ou entières à sec dans une poêle chaude pendant 60 secondes avant de les ajouter à vos plats pour décupler leurs arômes.",
    category: "Cuisine & Arômes"
  },
  {
    title: "Substituts légers et onctueux",
    text: "Remplacez la crème fraîche par du fromage blanc 0%, du skyr ou du yaourt grec dans vos quiches, sauces et veloutés pour préserver l'onctuosité.",
    category: "Nutrition"
  },
  {
    title: "L'art du Batch Cooking",
    text: "Préparez une grande quantité de céréales (quinoa, riz, boulghour) et de légumes cuits le dimanche. Vous gagnerez des heures en semaine !",
    category: "Organisation"
  },
  {
    title: "Poudre de zeste magique",
    text: "Séchez les zestes d'agrumes bio au four à basse température puis mixez-les. Une pincée suffit pour parfumer vos gâteaux, poissons et vinaigrettes.",
    category: "Anti-gaspillage"
  },
  {
    title: "L'arc-en-ciel dans l'assiette",
    text: "Plus vos assiettes comportent de couleurs végétales différentes (rouge, vert, orange, violet), plus vous diversifiez votre apport en antioxydants.",
    category: "Bien-être & Santé"
  },
  {
    title: "Réussir la vinaigrette parfaite",
    text: "Respectez la règle d'or des chefs : 1 cuillère à soupe de vinaigre ou jus de citron pour 3 cuillères à soupe d'huile d'olive, plus une pointe de moutarde.",
    category: "Savoir-faire"
  },
  {
    title: "Protéger la fraîcheur du fromage",
    text: "Enveloppez vos fromages dans du papier sulfurisé plutôt que du film étirable pour les laisser respirer sans les dessécher dans le bac du frigo.",
    category: "Conservation"
  },
  {
    title: "Une touche croquante et saine",
    text: "Saupoudrez vos veloutés et salades de graines de courge ou de tournesol dorées à la poêle : un plaisir croquant riche en magnésium et bons gras.",
    category: "Nutrition"
  },
  {
    title: "La sérénité grâce au 'Mise en place'",
    text: "Épluchez, découpez et pesez tous vos ingrédients avant d'allumer les plaques. Cuisiner devient fluide, agréable et totalement sans stress.",
    category: "Sérénité en cuisine"
  }
];

export function HomePage({ onNavigate }: HomePageProps) {
  const { 
    recettes, 
    planning, 
    courses, 
    updateRecette, 
    deleteRecette,
    setPlanningEntry, 
    addToShoppingList, 
    addManualShoppingItem, 
    toggleShoppingItem, 
    deleteShoppingItem 
  } = useStore();

  // Modal States
  const [selectedRecipe, setSelectedRecipe] = useState<Recette | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recette | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // "Une idée pour ce soir ?" Modal state
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [ideaTab, setIdeaTab] = useState<'recipes' | 'manual' | 'suggestions'>('recipes');
  const [ideaSearch, setIdeaSearch] = useState('');
  const [ideaManualName, setIdeaManualName] = useState('');

  // Quick Assign Modal state (for any day)
  const [assigningDate, setAssigningDate] = useState<string | null>(null);
  const [assignTab, setAssignTab] = useState<'recipes' | 'manual'>('recipes');
  const [assignSearch, setAssignSearch] = useState('');
  const [assignManualText, setAssignManualText] = useState('');

  // Shopping list inline add
  const [showAddShoppingInput, setShowAddShoppingInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  // Notifications popup
  const [showNotifications, setShowNotifications] = useState(false);

  // Dates
  const today = startOfToday();
  const todayISO = format(today, 'yyyy-MM-dd');
  const tomorrowISO = format(addDays(today, 1), 'yyyy-MM-dd');
  
  // Astuce du jour basée sur la date
  const tipOfTheDay = useMemo(() => {
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  }, [today]);

  // Helper function to resolve meal (Registered Recipe OR Custom Manual Entry) for a specific date
  const getMealForDate = (isoStr: string) => {
    const entry = planning.find(p => p.date === isoStr);
    if (!entry) return null;

    if (entry.recetteId) {
      const recipe = recettes.find(r => r.id === entry.recetteId);
      if (recipe) {
        return {
          type: 'recipe' as const,
          entry,
          recipe,
          nom: recipe.nom,
          image: recipe.image || `https://picsum.photos/seed/${recipe.id}/800/500`,
          categorie: recipe.categorie || 'RECETTE',
          prepMin: recipe.prepMin || 0,
          cuissonMin: recipe.cuissonMin || 0,
          portions: recipe.portions || 4,
          favori: recipe.favori
        };
      }
    }

    if (entry.suggestionLibre) {
      return {
        type: 'custom' as const,
        entry,
        recipe: null,
        nom: entry.suggestionLibre,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        categorie: 'Plat Personnalisé',
        prepMin: null,
        cuissonMin: null,
        portions: 4,
        favori: false
      };
    }

    return null;
  };

  const todayMeal = getMealForDate(todayISO);
  const tomorrowMeal = getMealForDate(tomorrowISO);

  // Current week timeline (Anchored on Monday, fixed from Monday to Sunday)
  const currentMonday = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(currentMonday, i);
      const iso = format(d, 'yyyy-MM-dd');
      const label = format(d, 'EEE d', { locale: fr }).toUpperCase();
      const meal = getMealForDate(iso);
      const isCurrentDay = isSameDay(d, today);
      const isPastDay = isBefore(d, today) && !isCurrentDay;
      return { 
        date: d, 
        iso, 
        label, 
        meal, 
        isToday: isCurrentDay, 
        isPast: isPastDay 
      };
    });
  }, [currentMonday, today, planning, recettes]);

  // Existing suggestions stored in planning (starting with 1900-)
  const savedSuggestions = useMemo(() => {
    return planning.filter(p => p.date.startsWith('1900-') && (p.recetteId || p.suggestionLibre));
  }, [planning]);

  const seasonalCounts = useMemo(() => {
    let ete = 0, hiver = 0, touteAnnee = 0;
    recettes.forEach(r => {
      if (r.saison === 'ete') ete++;
      else if (r.saison === 'hiver') hiver++;
      else touteAnnee++;
    });
    return { ete, hiver, touteAnnee };
  }, [recettes]);

  // Submit quick meal for Tonight
  const handleAssignTonightRecipe = (recipeId: string) => {
    setPlanningEntry(todayISO, recipeId, null);
    setShowIdeaModal(false);
  };

  const handleAssignTonightManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaManualName.trim()) return;
    setPlanningEntry(todayISO, null, ideaManualName.trim());
    setIdeaManualName('');
    setShowIdeaModal(false);
  };

  const handleAddSuggestionToPlanningList = (recipeId: string | null, customText: string | null) => {
    const randomDate = `1900-${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}-${(Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0')}`;
    setPlanningEntry(randomDate, recipeId, customText);
    setIdeaManualName('');
  };

  // Submit assign meal for any specific date modal
  const handleAssignSubmit = (recipeId: string | null, customText: string | null) => {
    if (!assigningDate) return;
    setPlanningEntry(assigningDate, recipeId, customText);
    setAssigningDate(null);
    setAssignSearch('');
    setAssignManualText('');
  };

  // Remove meal from planning
  const handleRemoveMeal = (isoStr: string) => {
    setPlanningEntry(isoStr, null, null);
  };

  // Add Item to Shopping List
  const handleAddShoppingItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    addManualShoppingItem({
      nom: newItemName.trim(),
      quantite: newItemQty ? parseFloat(newItemQty) || 1 : 1,
      unite: 'pièce'
    });

    setNewItemName('');
    setNewItemQty('');
    setShowAddShoppingInput(false);
  };

  // Total and Bought items for shopping summary
  const totalCourses = courses.length;
  const boughtCourses = courses.filter(c => c.achete).length;
  const remainingCourses = totalCourses - boughtCourses;

  return (
    <div className="max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pb-16 sm:pb-24">
      
      {/* --------------------------------------------------
          HEADER
         -------------------------------------------------- */}
      <header className="flex items-center justify-between pt-1 sm:pt-2 pb-2 sm:pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-serif">
            BROCOLI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Bonjour, que cuisine-t-on aujourd'hui ?
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 sm:p-2.5 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-xs relative group"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
          </button>

          <button 
            onClick={() => onNavigate('settings')}
            className="p-2 sm:p-2.5 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-xs"
            title="Paramètres"
          >
            <Settings size={18} />
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Notifications</h4>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                    <p className="font-bold text-emerald-950">💡 Repas de ce soir</p>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      {todayMeal ? `Prévu : ${todayMeal.nom}` : "Aucun repas planifié pour ce soir. N'hésitez pas à en choisir un !"}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">🛒 Liste de courses</p>
                    <p className="text-[11px] mt-0.5">Vous avez {remainingCourses} article(s) restant(s) à acheter.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* --------------------------------------------------
          BENTO PRINCIPAL (Aujourd'hui & Demain)
         -------------------------------------------------- */}
      <section className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-6">
        
        {/* BENTO 1 — AUJOURD'HUI (Dominant: 7 cols on md/lg) */}
        <div className="landscape:col-span-1 md:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600">
                AUJOURD'HUI
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-slate-400 capitalize">
                {format(today, 'EEEE d MMMM', { locale: fr })}
              </span>
            </div>

            {todayMeal ? (
              <div className="space-y-2.5 sm:space-y-4">
                <div className="relative h-36 xs:h-40 sm:h-52 md:h-60 lg:h-72 landscape:h-28 w-full rounded-xl overflow-hidden group">
                  <img 
                    src={todayMeal.image} 
                    alt={todayMeal.nom}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
                  
                  {/* Category badge */}
                  <span className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/95 backdrop-blur-md text-slate-900 text-[9px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider shadow-xs">
                    {todayMeal.categorie}
                  </span>

                  {/* Top Right Action (Favorite or Delete) */}
                  <div className="absolute top-2 right-2 sm:top-3.5 sm:right-3.5 flex items-center gap-1.5 sm:gap-2">
                    {todayMeal.recipe && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (todayMeal.recipe) {
                            updateRecette({ ...todayMeal.recipe, favori: !todayMeal.recipe.favori });
                          }
                        }}
                        className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all shadow-xs active:scale-95 ${
                          todayMeal.favori ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <Heart size={14} fill={todayMeal.favori ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleRemoveMeal(todayISO)}
                      className="p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-red-500 text-slate-700 hover:text-white backdrop-blur-md transition-all shadow-xs"
                      title="Retirer du repas"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 text-white">
                    <h2 
                      onClick={() => {
                        if (todayMeal.recipe) setSelectedRecipe(todayMeal.recipe);
                      }}
                      className={`text-base sm:text-2xl lg:text-3xl font-bold tracking-tight drop-shadow-md line-clamp-1 sm:line-clamp-2 ${
                        todayMeal.recipe ? 'hover:text-emerald-300 cursor-pointer' : ''
                      }`}
                    >
                      {todayMeal.nom}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
                    {todayMeal.prepMin !== null && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200/50 text-[11px] sm:text-xs">
                        <Clock size={12} className="text-emerald-600" />
                        {todayMeal.prepMin + todayMeal.cuissonMin} min
                      </span>
                    )}
                    {todayMeal.portions && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200/50 text-[11px] sm:text-xs">
                        <Users size={12} className="text-emerald-600" />
                        {todayMeal.portions} pers.
                      </span>
                    )}
                    {todayMeal.type === 'custom' && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-emerald-200/80 text-[10px] font-bold">
                        <Utensils size={11} className="text-emerald-600" />
                        Saisie manuelle
                      </span>
                    )}
                  </div>

                  {todayMeal.recipe ? (
                    <button 
                      onClick={() => setSelectedRecipe(todayMeal.recipe)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>Voir la recette</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setAssigningDate(todayISO)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 sm:py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 size={13} />
                      <span>Modifier</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-5 sm:py-10 text-center space-y-2 sm:space-y-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <ChefHat className="mx-auto text-slate-400" size={30} />
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  Aucun repas prévu pour aujourd'hui
                </p>
                <button 
                  onClick={() => setAssigningDate(todayISO)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-semibold text-xs shadow-xs transition-all inline-flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>Planifier le repas ce soir</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BENTO 2 — DEMAIN (Compact: 5 cols on md/lg) */}
        <div className="landscape:col-span-1 md:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600">
                DEMAIN
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-slate-400 capitalize">
                {format(addDays(today, 1), 'EEEE d MMMM', { locale: fr })}
              </span>
            </div>

            {tomorrowMeal ? (
              <div className="space-y-2.5 sm:space-y-4">
                <div className="relative h-28 xs:h-32 sm:h-40 md:h-48 lg:h-52 landscape:h-24 w-full rounded-xl overflow-hidden group">
                  <img 
                    src={tomorrowMeal.image} 
                    alt={tomorrowMeal.nom}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/10" />

                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/95 backdrop-blur-md text-slate-900 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    {tomorrowMeal.categorie}
                  </span>

                  <button 
                    onClick={() => handleRemoveMeal(tomorrowISO)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-red-500 text-slate-700 hover:text-white backdrop-blur-md transition-all shadow-xs"
                    title="Retirer du repas"
                  >
                    <Trash2 size={13} />
                  </button>

                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 text-white">
                    <h3 
                      onClick={() => {
                        if (tomorrowMeal.recipe) setSelectedRecipe(tomorrowMeal.recipe);
                      }}
                      className={`text-sm sm:text-lg font-bold tracking-tight line-clamp-1 ${
                        tomorrowMeal.recipe ? 'hover:text-emerald-300 cursor-pointer' : ''
                      }`}
                    >
                      {tomorrowMeal.nom}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    {tomorrowMeal.prepMin !== null ? (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs">
                        <Clock size={12} className="text-emerald-600" />
                        {tomorrowMeal.prepMin + tomorrowMeal.cuissonMin} min
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        Saisie manuelle
                      </span>
                    )}
                  </div>

                  {tomorrowMeal.recipe ? (
                    <button 
                      onClick={() => setSelectedRecipe(tomorrowMeal.recipe)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <span>Voir la recette</span>
                      <ChevronRight size={13} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setAssigningDate(tomorrowISO)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-all"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-5 sm:py-8 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500">
                  Pas de plat prévu pour demain
                </p>
                <button 
                  onClick={() => setAssigningDate(tomorrowISO)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-semibold text-xs hover:bg-emerald-700 transition-all inline-flex items-center gap-1 shadow-xs"
                >
                  <Plus size={13} />
                  <span>Ajouter un repas</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* --------------------------------------------------
          BENTO SECONDAIRE (Idées, Recettes & Liste de courses)
         -------------------------------------------------- */}
      <section className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-6">
        
        {/* BENTO 3A — UNE IDÉE POUR CE SOIR / PROPOSITIONS (6 cols on md, 4 on lg) */}
        <div className="landscape:col-span-1 md:col-span-1 lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 sm:space-y-4">
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-100">
                <Sparkles size={12} className="text-emerald-600" />
                <span>Une idée pour ce soir</span>
              </div>
              {savedSuggestions.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {savedSuggestions.length}
                </span>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">
              Consultez vos suggestions en cours ou proposez une nouvelle idée au planning.
            </p>

            {/* List of current proposals */}
            <div className="space-y-1.5 max-h-36 sm:max-h-44 overflow-y-auto pr-1 scrollbar-thin">
              {savedSuggestions.length > 0 ? (
                savedSuggestions.map((sug) => {
                  const rec = sug.recetteId ? recettes.find(r => r.id === sug.recetteId) : null;
                  const title = rec ? rec.nom : sug.suggestionLibre;
                  return (
                    <div 
                      key={sug.date}
                      className="p-2 bg-slate-50/80 hover:bg-emerald-50/40 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2 transition-all group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-900">{title}</p>
                        {rec && (
                          <span className="text-[10px] text-slate-400 font-medium">{rec.categorie}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => {
                            setPlanningEntry(todayISO, sug.recetteId, sug.suggestionLibre);
                            setPlanningEntry(sug.date, null, null);
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs"
                          title="Choisir ce soir"
                        >
                          Mettre ce soir
                        </button>
                        <button 
                          onClick={() => setPlanningEntry(sug.date, null, null)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="Retirer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-2.5 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs text-slate-400 italic">
                    Aucune proposition en attente.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button 
              onClick={() => setShowIdeaModal(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 sm:py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus size={14} />
              <span>Proposer une idée</span>
            </button>
            <button 
              onClick={() => onNavigate('planning')}
              className="px-3 py-2 sm:py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
              title="Voir le planning"
            >
              Planning
            </button>
          </div>
        </div>

        {/* BENTO 3B — MES RECETTES & EXPLORER (6 cols on md, 3 on lg) */}
        <div 
          onClick={() => onNavigate('recettes')}
          className="landscape:col-span-1 md:col-span-1 lg:col-span-3 rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3 sm:space-y-4 relative overflow-hidden min-h-[140px] sm:min-h-[180px] lg:min-h-[200px]"
        >
          {/* Background Dish Image */}
          <img 
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80" 
            alt="Mes Recettes"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Dark Overlay for Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />

          <div className="space-y-2 sm:space-y-3 relative z-10">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <BookOpen size={15} className="text-emerald-400" />
                <span>Mes Recettes</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-black/40 text-rose-300 rounded-full flex items-center gap-1 border border-white/10 backdrop-blur-sm">
                <Heart size={10} fill="currentColor" className="text-rose-400" />
                {recettes.filter(r => r.favori).length}
              </span>
            </div>

            <div className="pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-xs">
                  {recettes.length}
                </span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  recettes
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Livre de cuisine personnel
              </p>
            </div>
          </div>

          <div className="pt-1 relative z-10">
            <button className="w-full bg-white/20 hover:bg-emerald-600 border border-white/30 text-white font-semibold text-xs py-2 sm:py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs backdrop-blur-md">
              <span>Parcourir le livre</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* BENTO 4 — MA LISTE DE COURSES (12 cols on md, 5 on lg) */}
        <div className="landscape:col-span-2 md:col-span-2 lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-lg">🛒</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  MA LISTE DE COURSES
                </h3>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 bg-slate-100 text-slate-600 rounded-full">
                {courses.length} article{courses.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Items List */}
            {courses.length > 0 ? (
              <div className="space-y-1 max-h-36 sm:max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {courses.slice(0, 5).map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between py-1 border-b border-slate-100/80 text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button 
                        onClick={() => toggleShoppingItem(item.id)}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                          item.achete 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'border-slate-300 bg-white hover:border-emerald-500'
                        }`}
                      >
                        {item.achete && <Check size={10} strokeWidth={3} />}
                      </button>
                      <span className={`font-medium truncate ${item.achete ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {item.nom}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                        {item.quantite > 0 && item.quantite} {item.unite !== 'pièce' ? item.unite : ''}
                      </span>
                      <button 
                        onClick={() => deleteShoppingItem(item.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 sm:py-4 text-center">
                Votre liste de courses est vide.
              </p>
            )}

            {/* Inline Add Need */}
            {showAddShoppingInput ? (
              <form onSubmit={handleAddShoppingItemSubmit} className="flex gap-2 pt-1">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ex: Tomates, Lait 1L..." 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button 
                  type="submit" 
                  className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-700"
                >
                  Ajouter
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddShoppingInput(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setShowAddShoppingInput(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 py-0.5"
              >
                <Plus size={13} />
                <span>Ajouter un besoin</span>
              </button>
            )}
          </div>

          <div className="pt-2 sm:pt-3 border-t border-slate-100">
            <button 
              onClick={() => onNavigate('courses')}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold text-xs py-2 sm:py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Voir ma liste complète</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </section>

      {/* --------------------------------------------------
          APERÇU — VOTRE SEMAINE
         -------------------------------------------------- */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              VOTRE SEMAINE
            </h3>
          </div>

          <button 
            onClick={() => onNavigate('planning')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Voir le planning complet</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 7 Days Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {weekDays.map((item) => (
            <div 
              key={item.iso}
              className={`rounded-xl p-3 border flex flex-col justify-between transition-all ${
                item.isToday 
                  ? 'bg-emerald-50/40 border-emerald-500/80 ring-1 ring-emerald-500/30' 
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold uppercase ${
                    item.isToday ? 'text-emerald-700 font-extrabold' : item.isPast ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {item.label}
                  </span>
                  {item.isPast && (
                    <span className="text-[8px] bg-slate-200/60 text-slate-500 font-semibold px-1 py-0.2 rounded">
                      Passé
                    </span>
                  )}
                </div>
                {item.isToday && (
                  <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    Auj.
                  </span>
                )}
              </div>

              {item.meal ? (
                <div 
                  onClick={() => {
                    if (item.meal?.recipe) setSelectedRecipe(item.meal.recipe);
                    else setAssigningDate(item.iso);
                  }}
                  className="group cursor-pointer space-y-2 flex-1 flex flex-col justify-between"
                >
                  <div className="h-20 w-full rounded-lg overflow-hidden relative">
                    <img 
                      src={item.meal.image} 
                      alt={item.meal.nom} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMeal(item.iso);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Supprimer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-emerald-600 block line-clamp-1">
                      {item.meal.categorie}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">
                      {item.meal.nom}
                    </h4>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setAssigningDate(item.iso)}
                  className="h-28 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-lg flex flex-col items-center justify-center p-2 text-center cursor-pointer text-slate-400 hover:text-emerald-600 transition-all bg-slate-50/50"
                >
                  <Plus size={18} className="mb-1" />
                  <span className="text-[10px] font-semibold leading-tight">
                    Ajouter un repas
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------
          BLOC INFÉRIEUR (Astuce du jour + Résumé courses)
         -------------------------------------------------- */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARTE 1 — ASTUCE DU JOUR DYNAMIQUE */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                <Lightbulb size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
                {tipOfTheDay.category}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Astuce du jour — {tipOfTheDay.title}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {tipOfTheDay.text}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Change chaque jour</span>
            <span className="text-emerald-400 font-semibold">BROCOLI Healthy Life</span>
          </div>
        </div>

        {/* CARTE 2 — RÉSUMÉ DES COURSES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              RÉSUMÉ DES COURSES
            </span>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-extrabold text-emerald-600 tracking-tight">
                {totalCourses}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                articles au total
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                RESTANT
              </span>
              <span className="text-lg font-bold text-slate-800">
                {remainingCourses}
              </span>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/80">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                ACHETÉ
              </span>
              <span className="text-lg font-bold text-emerald-700">
                {boughtCourses}
              </span>
            </div>
          </div>
        </div>

      </section>


      {/* --------------------------------------------------
          MODAL : UNE IDÉE POUR CE SOIR ? (PROPOSER UN REPAS)
         -------------------------------------------------- */}
      <AnimatePresence>
        {showIdeaModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIdeaModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-5 border border-slate-100 overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Proposer un repas pour ce soir</h3>
                </div>
                <button onClick={() => setShowIdeaModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 gap-2">
                <button 
                  onClick={() => setIdeaTab('recipes')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
                    ideaTab === 'recipes' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Mes recettes
                </button>
                <button 
                  onClick={() => setIdeaTab('manual')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
                    ideaTab === 'manual' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Encodage manuel
                </button>
                {savedSuggestions.length > 0 && (
                  <button 
                    onClick={() => setIdeaTab('suggestions')}
                    className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
                      ideaTab === 'suggestions' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Suggestions ({savedSuggestions.length})
                  </button>
                )}
              </div>

              {/* Tab Content 1: Registered Recipes */}
              {ideaTab === 'recipes' && (
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Rechercher parmi vos recettes..."
                      value={ideaSearch}
                      onChange={(e) => setIdeaSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-64">
                    {recettes
                      .filter(r => r.nom.toLowerCase().includes(ideaSearch.toLowerCase()))
                      .map((r) => (
                        <div 
                          key={r.id}
                          className="p-2.5 border border-slate-100 hover:border-emerald-500 rounded-xl flex items-center justify-between hover:bg-emerald-50/30 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={r.image || `https://picsum.photos/seed/${r.id}/100/100`} 
                              alt={r.nom} 
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">{r.nom}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{r.categorie} • {(r.prepMin||0)+(r.cuissonMin||0)} min</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                handleAddSuggestionToPlanningList(r.id, null);
                                setShowIdeaModal(false);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                              title="Ajouter aux propositions"
                            >
                              Proposer
                            </button>
                            <button 
                              onClick={() => handleAssignTonightRecipe(r.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                            >
                              Mettre ce soir
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Manual Encoding */}
              {ideaTab === 'manual' && (
                <form onSubmit={handleAssignTonightManual} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Nom du plat ou idée libre
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Tartiflette géante, Restes du poulet rôti, Pizzas chez les voisins..." 
                      value={ideaManualName}
                      onChange={(e) => setIdeaManualName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        if (!ideaManualName.trim()) return;
                        handleAddSuggestionToPlanningList(null, ideaManualName.trim());
                        setIdeaManualName('');
                        setShowIdeaModal(false);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm"
                    >
                      Ajouter aux propositions
                    </button>
                    <button 
                      type="submit"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
                    >
                      Directement ce soir
                    </button>
                  </div>
                </form>
              )}

              {/* Tab Content 3: Saved Suggestions */}
              {ideaTab === 'suggestions' && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedSuggestions.map((sug) => {
                    const rec = sug.recetteId ? recettes.find(r => r.id === sug.recetteId) : null;
                    const title = rec ? rec.nom : sug.suggestionLibre;
                    return (
                      <div 
                        key={sug.date} 
                        className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-slate-800">{title}</span>
                        <button 
                          onClick={() => {
                            setPlanningEntry(todayISO, sug.recetteId, sug.suggestionLibre);
                            setPlanningEntry(sug.date, null, null); // remove suggestion
                            setShowIdeaModal(false);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          Choisir ce soir
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------
          MODAL : ASSIGNER UN REPAS À UNE DATE QUELCONQUE
         -------------------------------------------------- */}
      <AnimatePresence>
        {assigningDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssigningDate(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1, y: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4 border border-slate-100 overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Planifier ({format(parseISO(assigningDate), 'EEEE d MMMM', { locale: fr })})
                </h3>
                <button onClick={() => setAssigningDate(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex border-b border-slate-100 gap-3">
                <button 
                  onClick={() => setAssignTab('recipes')}
                  className={`pb-2 text-xs font-bold border-b-2 transition-all ${
                    assignTab === 'recipes' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Choisir une recette
                </button>
                <button 
                  onClick={() => setAssignTab('manual')}
                  className={`pb-2 text-xs font-bold border-b-2 transition-all ${
                    assignTab === 'manual' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Saisie manuelle
                </button>
              </div>

              {assignTab === 'recipes' ? (
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Rechercher une recette..."
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-64">
                    {recettes
                      .filter(r => r.nom.toLowerCase().includes(assignSearch.toLowerCase()))
                      .map((r) => (
                        <div 
                          key={r.id}
                          onClick={() => handleAssignSubmit(r.id, null)}
                          className="p-3 border border-slate-100 hover:border-emerald-500 rounded-xl flex items-center justify-between cursor-pointer hover:bg-emerald-50/30 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={r.image || `https://picsum.photos/seed/${r.id}/100/100`} 
                              alt={r.nom} 
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">{r.nom}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{r.categorie} • {(r.prepMin||0)+(r.cuissonMin||0)} min</p>
                            </div>
                          </div>
                          <button className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                            Sélect. →
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!assignManualText.trim()) return;
                    handleAssignSubmit(null, assignManualText.trim());
                  }}
                  className="space-y-4 pt-1"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Intitulé du repas
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Barbecue, Salade de pâtes, Omelette, Restes..." 
                      value={assignManualText}
                      onChange={(e) => setAssignManualText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm"
                  >
                    Valider le repas
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------
          MODAL DETAIL RECETTE
         -------------------------------------------------- */}
      {selectedRecipe && (
        <RecipeDetailModal 
          recette={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onEdit={() => {
            setEditingRecipe(selectedRecipe);
            setSelectedRecipe(null);
            setIsFormOpen(true);
          }}
          onDelete={() => {
            deleteRecette(selectedRecipe.id);
            setSelectedRecipe(null);
          }}
          onAddShopping={(ingredients) => {
            addToShoppingList(ingredients);
          }}
        />
      )}

      {/* --------------------------------------------------
          MODAL FORM RECETTE (Si modification)
         -------------------------------------------------- */}
      {isFormOpen && (
        <RecipeFormModal 
          recette={editingRecipe}
          onClose={() => setIsFormOpen(false)}
          onSave={(updated) => {
            if (editingRecipe) {
              updateRecette(updated);
            }
            setIsFormOpen(false);
          }}
        />
      )}

    </div>
  );
}

function parseISO(isoStr: string): Date {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
