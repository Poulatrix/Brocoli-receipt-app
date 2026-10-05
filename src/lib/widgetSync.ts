import { PlanningEntry, Recette } from '../types';
import { getDishImage } from './dishImages';
import { WidgetMealData } from './widgetRenderer';

/**
 * Maps planning entries and recipes into high-performance widget meal payloads.
 */
export function buildWidgetMealsMap(
  planning: PlanningEntry[], 
  recettes: Recette[]
): Record<string, WidgetMealData> {
  const map: Record<string, WidgetMealData> = {};

  for (const entry of planning) {
    if (!entry.date || entry.date.startsWith('1900-')) {
      continue; // Skip unscheduled drafts
    }

    if (entry.recetteId) {
      const recipe = recettes.find(r => r.id === entry.recetteId);
      if (recipe) {
        map[entry.date] = {
          nom: recipe.nom || 'Sans nom',
          categorie: recipe.categorie || 'Recette',
          image: recipe.image || getDishImage(recipe.nom),
          prepMin: Number(recipe.prepMin || 0),
          cuissonMin: Number(recipe.cuissonMin || 0),
          portions: Number(recipe.portions) || 4,
          type: 'recipe',
          dateStr: entry.date
        };
        continue;
      }
    }

    if (entry.suggestionLibre) {
      map[entry.date] = {
        nom: entry.suggestionLibre,
        categorie: 'Idée libre',
        image: getDishImage(entry.suggestionLibre),
        portions: 4,
        prepMin: null,
        cuissonMin: null,
        type: 'custom',
        dateStr: entry.date
      };
    }
  }

  return map;
}

/**
 * Sends the entire active meal schedule to the server so that the iOS widget
 * can display today's and upcoming days' meals with zero latency and high resilience.
 */
export async function syncWidgetSchedule(
  planning: PlanningEntry[],
  recettes: Recette[],
  userId?: string | null
): Promise<{ success: boolean; count: number; todayMeal: WidgetMealData | null }> {
  try {
    const mealsByDate = buildWidgetMealsMap(planning, recettes);
    
    // Determine Paris today date
    let todayISO = '';
    try {
      todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
    } catch {
      todayISO = new Date().toISOString().split('T')[0];
    }

    const todayMeal = mealsByDate[todayISO] || null;

    const response = await fetch('/api/widget/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || undefined,
        mealsByDate,
        todayMeal,
        date: todayISO
      })
    });

    if (!response.ok) {
      return { success: false, count: 0, todayMeal: null };
    }

    const resData = await response.json();
    return {
      success: true,
      count: Object.keys(mealsByDate).length,
      todayMeal
    };
  } catch (err) {
    console.warn("Widget sync warning:", err);
    return { success: false, count: 0, todayMeal: null };
  }
}
