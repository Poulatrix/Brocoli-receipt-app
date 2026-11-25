import type { VercelRequest, VercelResponse } from '@vercel/node';
import { renderWidgetHtml, WidgetMealData } from '../src/lib/widgetRenderer.js';
import { getDishImage } from '../src/lib/dishImages.js';
import { getServerSupabase, getParisTodayISO } from '../src/lib/householdBackend.js';

function getAction(req: VercelRequest): string {
  const fromQuery = req.query.__action;
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.replace(/^\/+|\/+$/g, '');
  }
  if (Array.isArray(fromQuery) && fromQuery.length > 0) {
    return fromQuery.join('/').replace(/^\/+|\/+$/g, '');
  }
  const url = new URL(req.url || '/', 'https://localhost');
  const qAction = url.searchParams.get('__action');
  if (qAction && qAction.trim()) {
    return qAction.replace(/^\/+|\/+$/g, '');
  }
  return url.pathname
    .replace(/^\/api\/widget\/?/, '')
    .replace(/^\/widget\/?/, '')
    .replace(/\/+$/, '');
}

function resolveAppUrl(req: VercelRequest): string {
  const appParam = typeof req.query.app === 'string' ? req.query.app : undefined;
  if (appParam && appParam.startsWith('http')) return appParam.replace(/\/+$/, '');
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const forwardedHost = typeof req.headers['x-forwarded-host'] === 'string'
    ? req.headers['x-forwarded-host']
    : typeof req.headers.host === 'string'
    ? req.headers.host
    : '';
  const proto = typeof req.headers['x-forwarded-proto'] === 'string' ? req.headers['x-forwarded-proto'] : 'https';
  if (forwardedHost) return `${proto}://${forwardedHost}`.replace(/\/+$/, '');
  return 'https://localhost';
}

async function fetchTodayMealFromSupabase(userId?: string, dateParam?: string): Promise<WidgetMealData | null> {
  const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getParisTodayISO();
  const supabase = getServerSupabase();
  if (!supabase) return null;

  try {
    let planningQuery = supabase.from('planning').select('*').eq('date', targetDate);
    if (userId) {
      planningQuery = planningQuery.or(`user_id.eq.${userId},user_id.is.null`);
    }
    const { data: planningList, error: pErr } = await planningQuery;
    if (!pErr && planningList && planningList.length > 0) {
      const entry = planningList.find((p: any) => p.user_id === userId) || planningList[0];

      if (entry.recette_id) {
        const { data: recipe } = await supabase.from('recipes').select('*').eq('id', entry.recette_id).maybeSingle();
        if (recipe) {
          return {
            nom: recipe.nom || 'Sans nom',
            categorie: recipe.categorie || 'Recette',
            image: recipe.image || recipe.image_url || getDishImage(recipe.nom),
            prepMin: Number(recipe.prepMin ?? recipe.prep_min ?? 0),
            cuissonMin: Number(recipe.cuissonMin ?? recipe.cuisson_min ?? 0),
            portions: Number(recipe.portions) || 4,
            type: 'recipe',
            dateStr: targetDate,
          };
        }
      }

      if (entry.suggestion_libre) {
        return {
          nom: entry.suggestion_libre,
          categorie: 'Idée libre',
          image: getDishImage(entry.suggestion_libre),
          portions: 4,
          type: 'custom',
          dateStr: targetDate,
        };
      }
    }
  } catch (err) {
    console.warn('[Vercel /api/widget] Supabase query error:', err);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = getAction(req);
  const mode = typeof req.query.__mode === 'string' ? req.query.__mode : undefined;
  const userId = typeof req.query.user === 'string' && req.query.user.trim() ? req.query.user.trim() : undefined;
  const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
  const targetDate = dateParam || getParisTodayISO();

  if (action === 'sync' && req.method === 'POST') {
    const { mealsByDate, meal, todayMeal, date } = req.body || {};
    const d = date || targetDate;
    const count = mealsByDate && typeof mealsByDate === 'object' ? Object.keys(mealsByDate).length : meal || todayMeal ? 1 : 0;
    return res.status(200).json({
      success: true,
      count,
      targetDate: d,
      hasMeal: Boolean((mealsByDate && mealsByDate[d]) || meal || todayMeal),
      todayMeal: (mealsByDate && mealsByDate[d]) || meal || todayMeal || null,
    });
  }

  if (action === 'today' && (mode === 'api' || (!mode && req.url?.includes('/api/widget')))) {
    const meal = await fetchTodayMealFromSupabase(userId, dateParam);
    return res.status(200).json({ date: targetDate, hasMeal: Boolean(meal), meal });
  }

  if (action === 'today.js') {
    const appUrl = resolveAppUrl(req);
    const uid = userId || '';
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(`(async () => {
  const API_URL = "${appUrl}/api/widget/today?user=${uid}";
  const APP_URL = "${appUrl}";
  if (typeof ListWidget !== 'undefined') {
    let data = { hasMeal: false };
    try { data = await new Request(API_URL).loadJSON(); } catch (e) {}
    const widget = new ListWidget();
    widget.backgroundColor = new Color("#F8F6F0");
    widget.url = APP_URL;
    const title = widget.addText(data.hasMeal && data.meal ? data.meal.nom : "Aucun repas prévu pour aujourd'hui");
    title.font = Font.boldSystemFont(13);
    title.textColor = new Color("#1C1917");
    Script.setWidget(widget);
    Script.complete();
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.href = "${appUrl}/widget/today?user=${uid}";
  }
})();`);
  }

  const sizeParam = (typeof req.query.size === 'string' ? req.query.size : (typeof req.query.format === 'string' ? req.query.format : 'small')) as any;
  const themeParam = typeof req.query.theme === 'string' ? (req.query.theme as any) : 'auto';
  const appUrl = resolveAppUrl(req);
  const meal = await fetchTodayMealFromSupabase(userId, dateParam);
  const html = renderWidgetHtml({
    meal,
    appUrl,
    dateStr: targetDate,
    size: sizeParam,
    theme: themeParam,
    title: meal ? `Au menu : ${meal.nom}` : "Au menu aujourd'hui",
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
  return res.status(200).send(html);
}
