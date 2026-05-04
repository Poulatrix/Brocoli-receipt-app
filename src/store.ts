import { create } from 'zustand';
import { Recette, PlanningEntry, ShoppingItem, AppState } from './types';
import { supabase } from './lib/supabase';

interface StoreState extends AppState {
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
}

interface StoreActions {
  // Global
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUserId: (userId: string | null) => void;
  syncWithSupabase: () => Promise<void>;
  
  // Recettes
  addRecette: (recette: Recette) => Promise<void>;
  updateRecette: (recette: Recette) => Promise<void>;
  deleteRecette: (id: string) => Promise<void>;
  
  // Planning
  setPlanningEntry: (date: string, recetteId: string | null, suggestionLibre: string | null) => Promise<void>;
  
  // Courses
  addToShoppingList: (ingredients: { quantite: number, unite: string, nom: string }[]) => Promise<void>;
  addManualShoppingItem: (item: { quantite: number, unite: string, nom: string }) => Promise<void>;
  toggleShoppingItem: (id: string) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  updateShoppingItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
  clearShoppingList: () => Promise<void>;
  clearBoughtItems: () => Promise<void>;
}

const initialData: AppState = {
  recettes: [],
  planning: [],
  courses: [],
};

export const useStore = create<StoreState & StoreActions>()(
  (set, get) => ({
    ...initialData,
    loading: false,
    error: null,
    currentUserId: null,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setUserId: (userId) => {
      set({ currentUserId: userId });
      if (userId) get().syncWithSupabase();
    },

    syncWithSupabase: async () => {
      const userId = get().currentUserId;
      if (!userId) return;

      set({ loading: true });
      try {
        const [recipesRes, planningRes, shoppingRes] = await Promise.all([
          supabase.from('recipes').select('*').eq('user_id', userId),
          supabase.from('planning').select('*').eq('user_id', userId),
          supabase.from('shopping_items').select('*').eq('user_id', userId),
        ]);

        if (recipesRes.error) throw recipesRes.error;
        if (planningRes.error) throw planningRes.error;
        if (shoppingRes.error) throw shoppingRes.error;

        // Map Supabase columns to camelCase for recipes
        const mappedRecipes = (recipesRes.data || []).map((r: any) => ({
          id: r.id,
          nom: r.nom,
          categorie: r.categorie,
          portions: r.portions,
          prepMin: r.prepMin,
          cuissonMin: r.cuissonMin,
          calories: r.calories,
          ingredients: r.ingredients,
          instructions: r.instructions,
          estIA: r.estIA ?? false,
          image: r.image ?? '',
          dateCreation: r.created_at || r.dateCreation
        }));

        // Map snake_case to camelCase for planning
        const mappedPlanning = (planningRes.data || []).map((p: any) => ({
          date: p.date,
          recetteId: p.recette_id,
          suggestionLibre: p.suggestion_libre
        }));

        set({
          recettes: mappedRecipes,
          planning: mappedPlanning,
          courses: (shoppingRes.data || []) as ShoppingItem[],
          loading: false
        });
      } catch (err: any) {
        console.error('Error syncing with Supabase:', err);
        set({ error: err.message, loading: false });
      }
    },

    addRecette: async (recette) => {
      const userId = get().currentUserId;
      const prevRecettes = get().recettes;
      
      // Ensure ID is a valid format if not already set or if it's a legacy random string
      const finalRecette = {
        ...recette,
        id: (recette.id && recette.id.length > 10) ? recette.id : crypto.randomUUID()
      };

      set({ recettes: [finalRecette, ...prevRecettes] });

      if (userId) {
        try {
          const { error } = await supabase.from('recipes').insert([{
            id: finalRecette.id,
            nom: finalRecette.nom,
            categorie: finalRecette.categorie,
            portions: finalRecette.portions,
            prepMin: finalRecette.prepMin,
            cuissonMin: finalRecette.cuissonMin,
            calories: finalRecette.calories,
            ingredients: finalRecette.ingredients,
            instructions: finalRecette.instructions,
            image: finalRecette.image,
            estIA: finalRecette.estIA,
            user_id: userId
          }]);
          if (error) {
            console.error('Supabase Error Details:', error);
            throw error;
          }
        } catch (err: any) {
          console.error('Catch Error adding recipe:', err);
          set({ recettes: prevRecettes, error: err.message });
        }
      }
    },

    updateRecette: async (recette) => {
      const userId = get().currentUserId;
      const prevRecettes = get().recettes;
      set({
        recettes: prevRecettes.map(r => r.id === recette.id ? recette : r)
      });

      if (userId) {
        try {
          const { error } = await supabase.from('recipes').update({
            nom: recette.nom,
            categorie: recette.categorie,
            portions: recette.portions,
            prepMin: recette.prepMin,
            cuissonMin: recette.cuissonMin,
            calories: recette.calories,
            ingredients: recette.ingredients,
            instructions: recette.instructions,
            image: recette.image,
            estIA: recette.estIA,
          }).eq('id', recette.id).eq('user_id', userId);
          if (error) throw error;
        } catch (err: any) {
          console.error('Error updating recipe:', err);
          set({ recettes: prevRecettes, error: err.message });
        }
      }
    },

    deleteRecette: async (id) => {
      const userId = get().currentUserId;
      const prevRecettes = get().recettes;
      const prevPlanning = get().planning;
      
      set({
        recettes: prevRecettes.filter(r => r.id !== id),
        planning: prevPlanning.map(p => p.recetteId === id ? { ...p, recetteId: null } : p)
      });

      if (userId) {
        try {
          const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', userId);
          if (error) throw error;
        } catch (err: any) {
          set({ recettes: prevRecettes, planning: prevPlanning, error: err.message });
        }
      }
    },

    setPlanningEntry: async (date, recetteId, suggestionLibre) => {
      const userId = get().currentUserId;
      const prevPlanning = get().planning;
      const existingIndex = prevPlanning.findIndex(p => p.date === date);
      const newPlanning = [...prevPlanning];
      const newEntry = { date, recetteId, suggestionLibre };

      if (existingIndex > -1) {
        newPlanning[existingIndex] = newEntry;
      } else {
        newPlanning.push(newEntry);
      }

      set({ planning: newPlanning });

      if (userId) {
        try {
          const { error } = await supabase.from('planning').upsert({
            date,
            recette_id: recetteId,
            suggestion_libre: suggestionLibre,
            user_id: userId
          }, { onConflict: 'user_id,date' });
          if (error) throw error;
        } catch (err: any) {
          set({ planning: prevPlanning, error: err.message });
        }
      }
    },

    addToShoppingList: async (ingredients) => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      const newCourses = [...prevCourses];
      const addedItems: ShoppingItem[] = [];

      ingredients.forEach(ing => {
        const existing = newCourses.find(c => 
          c.nom.toLowerCase() === ing.nom.toLowerCase() && 
          c.unite.toLowerCase() === ing.unite.toLowerCase() &&
          !c.achete
        );
        
        if (existing) {
          existing.quantite += ing.quantite;
        } else {
          const newItem = {
            id: crypto.randomUUID(),
            quantite: ing.quantite,
            unite: ing.unite,
            nom: ing.nom,
            achete: false
          };
          newCourses.push(newItem);
          addedItems.push(newItem);
        }
      });

      set({ courses: newCourses });

      if (userId) {
        try {
          if (addedItems.length > 0) {
            const { error } = await supabase.from('shopping_items').insert(
              addedItems.map(item => ({ ...item, user_id: userId }))
            );
            if (error) throw error;
          }
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },

    addManualShoppingItem: async (item) => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      const newItem = { ...item, id: crypto.randomUUID(), achete: false };
      set({ courses: [...prevCourses, newItem] });

      if (userId) {
        try {
          const { error } = await supabase.from('shopping_items').insert([{ ...newItem, user_id: userId }]);
          if (error) throw error;
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },

    toggleShoppingItem: async (id) => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      const item = prevCourses.find(c => c.id === id);
      if (!item) return;

      set({
        courses: prevCourses.map(c => c.id === id ? { ...c, achete: !c.achete } : c)
      });

      if (userId) {
        try {
          const { error } = await supabase.from('shopping_items').update({ achete: !item.achete }).eq('id', id).eq('user_id', userId);
          if (error) throw error;
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },

    deleteShoppingItem: async (id) => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      set({ courses: prevCourses.filter(c => c.id !== id) });

      if (userId) {
        try {
          const { error } = await supabase.from('shopping_items').delete().eq('id', id).eq('user_id', userId);
          if (error) throw error;
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },

    updateShoppingItem: async (id, updates) => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      set({
        courses: prevCourses.map(c => c.id === id ? { ...c, ...updates } : c)
      });

      if (userId) {
        try {
          const { error } = await supabase.from('shopping_items').update(updates).eq('id', id).eq('user_id', userId);
          if (error) throw error;
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },

    clearShoppingList: async () => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      set({ courses: [] });

      if (userId) {
        try {
          const { error } = await supabase.from('shopping_items').delete().eq('user_id', userId);
          if (error) throw error;
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },

    clearBoughtItems: async () => {
      const userId = get().currentUserId;
      const prevCourses = get().courses;
      set({ courses: prevCourses.filter(c => !c.achete) });

      if (userId) {
        try {
          const { error } = await supabase.from('shopping_items').delete().eq('user_id', userId).eq('achete', true);
          if (error) throw error;
        } catch (err: any) {
          set({ courses: prevCourses, error: err.message });
        }
      }
    },
  })
);
