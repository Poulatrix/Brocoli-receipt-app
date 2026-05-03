import { useState, useEffect } from 'react';
import { Recette, PlanningEntry, ShoppingItem, AppState } from './types';

const STORAGE_KEY = 'mes_recettes_app_state';

const initialData: AppState = {
  recettes: [
    {
      id: 'lasagnes-123',
      nom: 'Lasagnes à la Bolognaise',
      categorie: 'Viande',
      image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800',
      portions: 4,
      prepMin: 20,
      cuissonMin: 45,
      calories: 2400,
      ingredients: [
        { id: 'i1', quantite: 500, unite: 'g', nom: 'Bœuf haché' },
        { id: 'i2', quantite: 9, unite: 'feuilles', nom: 'Feuilles de lasagnes' },
        { id: 'i3', quantite: 500, unite: 'ml', nom: 'Sauce tomate' },
        { id: 'i4', quantite: 200, unite: 'g', nom: 'Fromage râpé' },
      ],
      instructions: [
        { id: 's1', titre: 'Bolognaise', texte: 'Faire revenir la viande hachée avec la sauce tomate pendant 15 minutes.' },
        { id: 's2', titre: 'Montage', texte: 'Alterner les couches de pâtes, sauce et fromage dans un plat à gratin.' },
        { id: 's3', titre: 'Cuisson', texte: 'Enfourner à 180°C pendant 30 minutes.' },
      ],
      estIA: false,
      dateCreation: new Date().toISOString()
    },
    {
      id: 'salade-456',
      nom: 'Salade César végétarienne',
      categorie: 'Végétarien',
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=800',
      portions: 2,
      prepMin: 15,
      cuissonMin: 0,
      calories: 800,
      ingredients: [
        { id: 'i5', quantite: 1, unite: 'unité', nom: 'Laitue romaine' },
        { id: 'i6', quantite: 50, unite: 'g', nom: 'Croutons' },
        { id: 'i7', quantite: 30, unite: 'g', nom: 'Parmesan' },
        { id: 'i8', quantite: 100, unite: 'ml', nom: 'Sauce César' },
      ],
      instructions: [
        { id: 's4', titre: 'Découpe', texte: 'Laver et couper la laitue en morceaux.' },
        { id: 's5', titre: 'Mélange', texte: 'Mélanger tous les ingrédients dans un grand saladier.' },
      ],
      estIA: false,
      dateCreation: new Date().toISOString()
    }
  ],
  planning: [],
  courses: [],
};

export function useStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Recettes CRUD
  const addRecette = (recette: Recette) => {
    setState(prev => ({ ...prev, recettes: [recette, ...prev.recettes] }));
  };

  const updateRecette = (recette: Recette) => {
    setState(prev => ({
      ...prev,
      recettes: prev.recettes.map(r => r.id === recette.id ? recette : r)
    }));
  };

  const deleteRecette = (id: string) => {
    setState(prev => ({
      ...prev,
      recettes: prev.recettes.filter(r => r.id !== id),
      planning: prev.planning.map(p => p.recetteId === id ? { ...p, recetteId: null } : p)
    }));
  };

  // Planning logic
  const setPlanningEntry = (date: string, recetteId: string | null, suggestionLibre: string | null) => {
    setState(prev => {
      const existingIndex = prev.planning.findIndex(p => p.date === date);
      const newPlanning = [...prev.planning];
      
      const newEntry: PlanningEntry = { date, recetteId, suggestionLibre };
      
      if (existingIndex > -1) {
        newPlanning[existingIndex] = newEntry;
      } else {
        newPlanning.push(newEntry);
      }
      
      return { ...prev, planning: newPlanning };
    });
  };

  // Courses logic
  const addToShoppingList = (ingredients: { quantite: number, unite: string, nom: string }[]) => {
    setState(prev => {
      const newCourses = [...prev.courses];
      
      ingredients.forEach(ing => {
        // Try to find matching ingredient (same name and unit)
        const existing = newCourses.find(c => 
          c.nom.toLowerCase() === ing.nom.toLowerCase() && 
          c.unite.toLowerCase() === ing.unite.toLowerCase() &&
          !c.achete
        );
        
        if (existing) {
          existing.quantite += ing.quantite;
        } else {
          newCourses.push({
            id: Math.random().toString(36).substr(2, 9),
            quantite: ing.quantite,
            unite: ing.unite,
            nom: ing.nom,
            achete: false
          });
        }
      });
      
      return { ...prev, courses: newCourses };
    });
  };

  const addManualShoppingItem = (item: { quantite: number, unite: string, nom: string }) => {
    setState(prev => ({
      ...prev,
      courses: [...prev.courses, { ...item, id: Math.random().toString(36).substr(2, 9), achete: false }]
    }));
  };

  const toggleShoppingItem = (id: string) => {
    setState(prev => ({
      ...prev,
      courses: prev.courses.map(c => c.id === id ? { ...c, achete: !c.achete } : c)
    }));
  };

  const deleteShoppingItem = (id: string) => {
    setState(prev => ({
      ...prev,
      courses: prev.courses.filter(c => c.id !== id)
    }));
  };

  const updateShoppingItem = (id: string, updates: Partial<ShoppingItem>) => {
    setState(prev => ({
      ...prev,
      courses: prev.courses.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const clearShoppingList = () => {
    setState(prev => ({ ...prev, courses: [] }));
  };

  const clearBoughtItems = () => {
    setState(prev => ({
      ...prev,
      courses: prev.courses.filter(c => !c.achete)
    }));
  };

  return {
    state,
    addRecette,
    updateRecette,
    deleteRecette,
    setPlanningEntry,
    addToShoppingList,
    addManualShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    updateShoppingItem,
    clearShoppingList,
    clearBoughtItems
  };
}
