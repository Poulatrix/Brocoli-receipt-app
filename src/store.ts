import { create } from 'zustand';
import { Recette, PlanningEntry, ShoppingItem, AppState } from './types';
import { supabase, uploadImageToSupabase } from './lib/supabase';

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
  clearBase64Images: () => Promise<{ cleanedCount: number }>;
  
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

async function saveRecipeToDatabase(finalRecette: Recette, userId: string) {
  const payload: Record<string, any> = {
    id: finalRecette.id,
    nom: finalRecette.nom,
    categorie: finalRecette.categorie,
    portions: finalRecette.portions,
    prepMin: finalRecette.prepMin,
    cuissonMin: finalRecette.cuissonMin,
    calories: finalRecette.calories,
    ingredients: finalRecette.ingredients,
    instructions: finalRecette.instructions,
    image: finalRecette.image || '',
    estIA: finalRecette.estIA ?? false,
    favori: finalRecette.favori ?? false,
    saison: finalRecette.saison || 'toute_annee',
    user_id: userId
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await supabase.from('recipes').upsert(payload, { onConflict: 'id' });

    if (!res.error) {
      return; // Success!
    }

    const errMessage = res.error.message || '';
    console.warn(`Supabase upsert attempt ${attempt + 1} failed:`, errMessage);

    // Extract missing column name if PostgREST rejected it
    const match = errMessage.match(/Could not find the '([^']+)' column/i) || 
                  errMessage.match(/column "([^"]+)" of relation "recipes" does not exist/i) ||
                  errMessage.match(/column "([^"]+)" does not exist/i) ||
                  errMessage.match(/column '([^']+)' does not exist/i);

    if (match && match[1]) {
      const missingCol = match[1];
      console.warn(`Column '${missingCol}' missing in Supabase schema. Adapting payload...`);

      // If camelCase time or image/flag columns are missing, attempt snake_case mapping
      if (missingCol === 'prepMin' && !('prep_min' in payload)) {
        delete payload.prepMin;
        payload.prep_min = finalRecette.prepMin;
        continue;
      }
      if (missingCol === 'cuissonMin' && !('cuisson_min' in payload)) {
        delete payload.cuissonMin;
        payload.cuisson_min = finalRecette.cuissonMin;
        continue;
      }
      if (missingCol === 'estIA' && !('est_ia' in payload)) {
        delete payload.estIA;
        payload.est_ia = finalRecette.estIA ?? false;
        continue;
      }
      if (missingCol === 'image' && !('image_url' in payload)) {
        delete payload.image;
        payload.image_url = finalRecette.image || '';
        continue;
      }

      // If missing column is in payload, remove it to allow saving the rest of the recipe
      if (missingCol in payload) {
        delete payload[missingCol];
        continue;
      }
    }

    // Try direct update fallback
    const updateRes = await supabase.from('recipes').update(payload).eq('id', finalRecette.id).eq('user_id', userId);
    if (!updateRes.error) {
      return;
    }

    throw new Error(res.error.message);
  }
}

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

      set({ loading: true });
      try {
        const recipeQuery = userId 
          ? supabase.from('recipes').select('*').or(`user_id.eq.${userId},user_id.is.null`)
          : supabase.from('recipes').select('*').is('user_id', null);

        const planningQuery = userId
          ? supabase.from('planning').select('*').or(`user_id.eq.${userId},user_id.is.null`)
          : supabase.from('planning').select('*').is('user_id', null);

        const shoppingQuery = userId
          ? supabase.from('shopping_items').select('*').or(`user_id.eq.${userId},user_id.is.null`)
          : supabase.from('shopping_items').select('*').is('user_id', null);

        const [recipesRes, planningRes, shoppingRes] = await Promise.all([
          recipeQuery,
          planningQuery,
          shoppingQuery,
        ]);

        if (recipesRes.error) throw recipesRes.error;
        if (planningRes.error) throw planningRes.error;
        if (shoppingRes.error) throw shoppingRes.error;

        const safeParseArray = (val: any) => {
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try {
              const p = JSON.parse(val);
              if (Array.isArray(p)) return p;
            } catch {
              return [];
            }
          }
          return [];
        };

        // Map Supabase columns to camelCase for recipes
        const mappedRecipes = (recipesRes.data || []).map((r: any) => ({
          id: r.id,
          nom: r.nom || 'Sans nom',
          categorie: r.categorie || 'Autre',
          portions: Number(r.portions) || 4,
          prepMin: Number(r.prepMin ?? r.prep_min ?? 0),
          cuissonMin: Number(r.cuissonMin ?? r.cuisson_min ?? 0),
          calories: r.calories ? Number(r.calories) : undefined,
          ingredients: safeParseArray(r.ingredients),
          instructions: safeParseArray(r.instructions),
          estIA: r.estIA ?? r.est_ia ?? false,
          favori: r.favori ?? false,
          saison: r.saison || 'toute_annee',
          image: r.image ?? r.image_url ?? '',
          dateCreation: r.created_at || r.dateCreation || new Date().toISOString()
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

      // Automatically upload base64 images to Supabase Storage if needed
      if (finalRecette.image && finalRecette.image.startsWith('data:image/')) {
        try {
          const storageUrl = await uploadImageToSupabase(finalRecette.image, userId);
          finalRecette.image = storageUrl;
        } catch (uploadErr) {
          console.error("Image upload to storage failed:", uploadErr);
        }
      }

      set({ recettes: [finalRecette, ...prevRecettes] });

      if (userId) {
        try {
          await saveRecipeToDatabase(finalRecette, userId);
        } catch (err: any) {
          console.error('Catch Error adding recipe:', err);
          set({ error: `Erreur sauvegarde Supabase: ${err.message}` });
        }
      }
    },

    updateRecette: async (recette) => {
      const userId = get().currentUserId;
      const prevRecettes = get().recettes;

      const finalRecette = { ...recette };
      // Automatically upload base64 images to Supabase Storage if needed
      if (finalRecette.image && finalRecette.image.startsWith('data:image/')) {
        try {
          const storageUrl = await uploadImageToSupabase(finalRecette.image, userId);
          finalRecette.image = storageUrl;
        } catch (uploadErr) {
          console.error("Image upload to storage failed:", uploadErr);
        }
      }

      set({
        recettes: prevRecettes.map(r => r.id === finalRecette.id ? finalRecette : r)
      });

      if (userId) {
        try {
          await saveRecipeToDatabase(finalRecette, userId);
        } catch (err: any) {
          console.error('Error updating recipe:', err);
          set({ error: `Erreur mise à jour Supabase: ${err.message}` });
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

    clearBase64Images: async () => {
      const userId = get().currentUserId;
      const recettes = get().recettes;

      const base64Items = recettes.filter(r => r.image && (r.image.startsWith('data:') || (r.image.length > 500 && !r.image.startsWith('http'))));
      if (base64Items.length === 0) {
        return { cleanedCount: 0 };
      }

      // Update local state by stripping base64 images
      const updatedRecettes = recettes.map(r => {
        if (r.image && (r.image.startsWith('data:') || (r.image.length > 500 && !r.image.startsWith('http')))) {
          return { ...r, image: '' };
        }
        return r;
      });

      set({ recettes: updatedRecettes });

      // Update Supabase DB table 'recipes'
      if (userId) {
        for (const r of base64Items) {
          try {
            await supabase
              .from('recipes')
              .update({ image: '' })
              .eq('id', r.id)
              .eq('user_id', userId);
          } catch (err) {
            console.error(`Error clearing base64 image for recipe ${r.id}:`, err);
          }
        }
      }

      return { cleanedCount: base64Items.length };
    },

    setPlanningEntry: async (date, recetteId, suggestionLibre) => {
      const userId = get().currentUserId;
      const prevPlanning = get().planning;

      // Handle deletion
      if (recetteId === null && suggestionLibre === null) {
        set({ planning: prevPlanning.filter(p => p.date !== date) });
        if (userId) {
          try {
            const { error } = await supabase.from('planning').delete().eq('date', date).eq('user_id', userId);
            if (error) throw error;
          } catch (err: any) {
            set({ planning: prevPlanning, error: err.message });
          }
        }
        return;
      }

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
