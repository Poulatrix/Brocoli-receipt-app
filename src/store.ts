import { create } from 'zustand';
import { 
  Recette, 
  PlanningEntry, 
  ShoppingItem, 
  AppState, 
  Household, 
  HouseholdMember, 
  HouseholdRole, 
  HouseholdCompetenceKey, 
  HouseholdCompetences,
  McpPendingMutation,
  DEFAULT_ROLE_COMPETENCES
} from './types';
import { supabase, uploadImageToSupabase } from './lib/supabase';

interface StoreState extends AppState {
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  currentUserEmail: string | null;
  household: Household | null;
  householdLoading: boolean;
  householdError: string | null;
  householdNeedsSetup: boolean;
}

interface StoreActions {
  // Global
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUserData: (userId: string | null, email?: string | null) => void;
  syncWithSupabase: () => Promise<void>;
  
  // Maison & Compétences familiales
  syncHousehold: () => Promise<Household | null>;
  joinHousehold: (code: string, role?: HouseholdRole, nom?: string) => Promise<{ success: boolean; error?: string }>;
  updateHouseholdInfo: (updates: { nom?: string; roleCompetencesPreset?: Record<HouseholdRole, HouseholdCompetences> }) => Promise<void>;
  updateHouseholdMember: (targetMemberId: string, updates: { role?: HouseholdRole; competences?: Partial<HouseholdCompetences>; nom?: string; avatar?: string }) => Promise<void>;
  removeHouseholdMember: (targetMemberId: string) => Promise<void>;
  regenerateHouseholdCode: () => Promise<string | null>;
  leaveHousehold: () => Promise<void>;
  hasCompetence: (key: HouseholdCompetenceKey) => boolean;
  getCurrentMember: () => HouseholdMember | null;
  configureMcp: (updates: { enabled?: boolean; boundUserId?: string; regenerateToken?: boolean }) => Promise<{ success: boolean; token?: string; error?: string }>;
  syncMcpMirror: () => Promise<void>;
  
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

const getStoredHousehold = (): Household | null => {
  try {
    const raw = localStorage.getItem('mes_recettes_household');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

async function getHouseholdAuthHeaders(includeContentType = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData?.session?.access_token;
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
  } catch {}
  return headers;
}

let isSyncingMcpMirror = false;

export const useStore = create<StoreState & StoreActions>()(
  (set, get) => ({
    ...initialData,
    loading: false,
    error: null,
    currentUserId: null,
    currentUserEmail: null,
    household: getStoredHousehold(),
    householdLoading: false,
    householdError: null,
    householdNeedsSetup: false,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setUserId: (userId) => {
      set({ currentUserId: userId });
      if (userId) {
        get().syncHousehold();
        get().syncWithSupabase();
      }
    },
    setUserData: (userId, email) => {
      set({ currentUserId: userId, currentUserEmail: email ?? null });
      if (userId) {
        get().syncHousehold();
        get().syncWithSupabase();
      }
    },

    syncHousehold: async () => {
      const userId = get().currentUserId;
      const email = get().currentUserEmail || '';
      if (!userId) return null;

      set({ householdLoading: true, householdError: null, householdNeedsSetup: false });
      try {
        const headers = await getHouseholdAuthHeaders(false);
        const res = await fetch(`/api/households/my?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`, {
          headers,
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error("L'API Maison Familiale (/api/households/my) n'a pas répondu en JSON.");
        }
        const data = await res.json();
        if (data.success && data.household) {
          set({
            household: data.household,
            householdLoading: false,
            householdError: null,
            householdNeedsSetup: false,
          });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
          return data.household;
        }
        set({
          householdLoading: false,
          householdError: data?.error || "Impossible de charger votre Maison Familiale.",
          householdNeedsSetup: Boolean(data?.needsSetup),
        });
      } catch (err: any) {
        console.warn("Could not sync household from backend:", err);
        set({
          householdLoading: false,
          householdError: err?.message || "Serveur Maison Familiale inaccessible.",
        });
      }
      return null;
    },

    joinHousehold: async (code, role = 'cuisinier', nom) => {
      const userId = get().currentUserId;
      const email = get().currentUserEmail || '';
      if (!userId) return { success: false, error: "Vous devez être connecté pour rejoindre une Maison." };

      set({ householdLoading: true, householdError: null });
      try {
        const headers = await getHouseholdAuthHeaders(true);
        const res = await fetch('/api/households/join', {
          method: 'POST',
          headers,
          body: JSON.stringify({ code, userId, email, nom, role })
        });
        const data = await res.json();
        if (data.success && data.household) {
          set({
            household: data.household,
            householdLoading: false,
            householdError: null,
            householdNeedsSetup: false,
          });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
          await get().syncWithSupabase();
          return { success: true };
        } else {
          set({
            householdLoading: false,
            householdNeedsSetup: Boolean(data?.needsSetup),
          });
          return { success: false, error: data.error || "Impossible de rejoindre cette Maison." };
        }
      } catch (err: any) {
        set({ householdLoading: false });
        return { success: false, error: err.message || "Erreur de connexion." };
      }
    },

    updateHouseholdInfo: async (updates) => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return;

      try {
        const headers = await getHouseholdAuthHeaders(true);
        const res = await fetch('/api/households/update', {
          method: 'POST',
          headers,
          body: JSON.stringify({ householdId: household.id, userId, ...updates })
        });
        const data = await res.json();
        if (data.success && data.household) {
          set({ household: data.household });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to update household:", err);
      }
    },

    updateHouseholdMember: async (targetMemberId, updates) => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return;

      try {
        const headers = await getHouseholdAuthHeaders(true);
        const res = await fetch('/api/households/member/update', {
          method: 'POST',
          headers,
          body: JSON.stringify({ householdId: household.id, userId, targetMemberId, ...updates })
        });
        const data = await res.json();
        if (data.success && data.household) {
          set({ household: data.household });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to update household member:", err);
      }
    },

    removeHouseholdMember: async (targetMemberId) => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return;

      try {
        const headers = await getHouseholdAuthHeaders(true);
        const res = await fetch('/api/households/member/remove', {
          method: 'POST',
          headers,
          body: JSON.stringify({ householdId: household.id, userId, targetMemberId })
        });
        const data = await res.json();
        if (data.success && data.household) {
          set({ household: data.household });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
          await get().syncWithSupabase();
        }
      } catch (err) {
        console.error("Failed to remove household member:", err);
      }
    },

    regenerateHouseholdCode: async () => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return null;

      try {
        const headers = await getHouseholdAuthHeaders(true);
        const res = await fetch('/api/households/regenerate-code', {
          method: 'POST',
          headers,
          body: JSON.stringify({ householdId: household.id, userId })
        });
        const data = await res.json();
        if (data.success && data.household) {
          set({ household: data.household });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
          return data.codeInvitation;
        }
      } catch (err) {
        console.error("Failed to regenerate code:", err);
      }
      return null;
    },

    leaveHousehold: async () => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return;

      try {
        const headers = await getHouseholdAuthHeaders(true);
        await fetch('/api/households/leave', {
          method: 'POST',
          headers,
          body: JSON.stringify({ householdId: household.id, userId })
        });
        try {
          localStorage.removeItem('mes_recettes_household');
        } catch {}
        set({ household: null, householdError: null, householdNeedsSetup: false });
        await get().syncHousehold();
        await get().syncWithSupabase();
      } catch (err) {
        console.error("Failed to leave household:", err);
      }
    },

    hasCompetence: (key) => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return true;

      const member = household.membres.find(m => m.userId === userId);
      if (!member) return true;
      if (member.estCreateur || member.role === 'chef') return true;

      if (member.competences && member.competences[key] !== undefined) {
        return Boolean(member.competences[key]);
      }

      const role = member.role || 'cuisinier';
      const roleDefaults = DEFAULT_ROLE_COMPETENCES[role] || DEFAULT_ROLE_COMPETENCES.cuisinier;
      return Boolean(roleDefaults[key] ?? true);
    },

    getCurrentMember: () => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) return null;
      return household.membres.find(m => m.userId === userId) || null;
    },

    configureMcp: async (updates) => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId) {
        return { success: false, error: "Vous devez être connecté à une Maison." };
      }

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const jwt = sessionData?.session?.access_token;
          if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`;
          }
        } catch {}

        const res = await fetch('/api/households/mcp/configure', {
          method: 'POST',
          headers,
          body: JSON.stringify({ householdId: household.id, userId, ...updates })
        });
        const data = await res.json();
        if (data.success && data.household) {
          set({ household: data.household });
          try {
            localStorage.setItem('mes_recettes_household', JSON.stringify(data.household));
          } catch {}
          return { success: true, token: data.token };
        }
        return { success: false, error: data.error || "Impossible de mettre à jour le serveur MCP." };
      } catch (err: any) {
        return { success: false, error: err?.message || "Erreur réseau lors de la configuration MCP." };
      }
    },

    syncMcpMirror: async () => {
      const household = get().household;
      const userId = get().currentUserId;
      if (!household || !userId || isSyncingMcpMirror) return;

      isSyncingMcpMirror = true;
      try {
        const { recettes, planning, courses } = get();
        const headers = await getHouseholdAuthHeaders(true);
        const res = await fetch('/api/households/mcp/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            householdId: household.id,
            userId,
            recettes,
            planning,
            courses,
          })
        });
        const data = await res.json();
        if (!data.success || !Array.isArray(data.pendingMutations) || data.pendingMutations.length === 0) {
          return;
        }

        const ackIds: string[] = [];
        const mutations: McpPendingMutation[] = data.pendingMutations;

        for (const mut of mutations) {
          try {
            if (mut.type === 'add_shopping_items' && Array.isArray(mut.payload?.items)) {
              const createdItems: ShoppingItem[] = Array.isArray(mut.payload.createdItems) ? mut.payload.createdItems : [];
              const currentCourses = get().courses;
              const newItemsToInsert: ShoppingItem[] = [];
              const mergedIngredients: { quantite: number; unite: string; nom: string }[] = [];

              for (const raw of mut.payload.items) {
                const matchCreated = createdItems.find(
                  ci => ci.nom.toLowerCase() === String(raw.nom).toLowerCase() &&
                        (ci.unite || '').toLowerCase() === String(raw.unite || '').toLowerCase()
                );
                const alreadyInStore = currentCourses.some(
                  c => !c.achete &&
                       c.nom.toLowerCase() === String(raw.nom).toLowerCase() &&
                       (c.unite || '').toLowerCase() === String(raw.unite || '').toLowerCase()
                );
                if (!alreadyInStore && matchCreated && !currentCourses.some(c => c.id === matchCreated.id)) {
                  newItemsToInsert.push(matchCreated);
                } else {
                  mergedIngredients.push({
                    quantite: Number(raw.quantite) || 1,
                    unite: String(raw.unite || ''),
                    nom: String(raw.nom),
                  });
                }
              }

              if (newItemsToInsert.length > 0) {
                set({ courses: [...get().courses, ...newItemsToInsert] });
                const { error } = await supabase
                  .from('shopping_items')
                  .insert(newItemsToInsert.map(it => ({ ...it, user_id: userId })));
                if (error) console.warn("MCP pending shopping insert fallback:", error.message);
              }
              if (mergedIngredients.length > 0) {
                await get().addToShoppingList(mergedIngredients);
              }
              ackIds.push(mut.id);
            } else if (mut.type === 'toggle_shopping_item' && mut.payload) {
              const target =
                get().courses.find(c => c.id === mut.payload.id) ||
                get().courses.find(c => c.nom.toLowerCase() === String(mut.payload.nom || '').toLowerCase());
              if (target) {
                await get().updateShoppingItem(target.id, { achete: Boolean(mut.payload.achete) });
              }
              ackIds.push(mut.id);
            } else if (mut.type === 'suggest_meal' && mut.payload?.date) {
              await get().setPlanningEntry(
                mut.payload.date,
                mut.payload.recetteId ?? null,
                mut.payload.suggestionLibre ?? null
              );
              ackIds.push(mut.id);
            }
          } catch (mutErr) {
            console.warn("Could not apply pending MCP mutation:", mut.id, mutErr);
          }
        }

        if (ackIds.length > 0) {
          const ackHeaders = await getHouseholdAuthHeaders(true);
          await fetch('/api/households/mcp/ack', {
            method: 'POST',
            headers: ackHeaders,
            body: JSON.stringify({ householdId: household.id, userId, mutationIds: ackIds })
          });
        }
      } catch (err) {
        console.warn("MCP mirror sync failed:", err);
      } finally {
        isSyncingMcpMirror = false;
      }
    },

    syncWithSupabase: async () => {
      const userId = get().currentUserId;
      const household = get().household;
      const memberIds = household && household.membres && household.membres.length > 0
        ? Array.from(new Set([userId, ...household.membres.map(m => m.userId)].filter(Boolean)))
        : (userId ? [userId] : []);

      set({ loading: true });
      try {
        const idFilter = memberIds.length > 0
          ? `${memberIds.map(id => `user_id.eq.${id}`).join(',')},user_id.is.null`
          : 'user_id.is.null';

        const recipeQuery = memberIds.length > 0 
          ? supabase.from('recipes').select('*').or(idFilter)
          : supabase.from('recipes').select('*').is('user_id', null);

        const planningQuery = memberIds.length > 0
          ? supabase.from('planning').select('*').or(idFilter)
          : supabase.from('planning').select('*').is('user_id', null);

        const shoppingQuery = memberIds.length > 0
          ? supabase.from('shopping_items').select('*').or(idFilter)
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
