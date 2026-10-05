import { getDishImage } from './dishImages';

export interface WidgetMealData {
  nom: string;
  categorie?: string;
  image?: string;
  prepMin?: number | null;
  cuissonMin?: number | null;
  portions?: number | null;
  type?: 'recipe' | 'custom';
  dateStr?: string;
}

export interface WidgetRenderOptions {
  meal: WidgetMealData | null;
  appUrl: string;
  dateStr?: string;
  size?: 'auto' | 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark' | 'auto';
  title?: string;
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const DAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'
];

export function formatFrenchDateString(isoDateStr?: string): { dayName: string; dateNum: number; monthName: string; fullFormatted: string } {
  let d = new Date();
  if (isoDateStr && /^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    const [year, month, day] = isoDateStr.split('-').map(Number);
    d = new Date(year, month - 1, day);
  }
  const dayName = DAYS_FR[d.getDay()];
  const dateNum = d.getDate();
  const monthName = MONTHS_FR[d.getMonth()];
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return {
    dayName: capitalizedDay,
    dateNum,
    monthName,
    fullFormatted: `${capitalizedDay} ${dateNum} ${monthName}`
  };
}

/**
 * Generates an ultra-clean, dedicated HTML document compliant with iOS WidgetWeb / JsWidget.
 * Ensures the widget card fits perfectly into the iOS WidgetWeb crop box without clipping text or duplicating content.
 */
export function renderWidgetHtml(options: WidgetRenderOptions): string {
  const { meal, appUrl, dateStr, size = 'auto', theme = 'light', title = "Au menu aujourd'hui" } = options;
  const dateInfo = formatFrenchDateString(dateStr);

  const mealNom = meal?.nom ? meal.nom.trim() : null;
  const mealCategory = meal?.categorie || (meal?.type === 'custom' ? 'Idée libre' : 'Recette');
  const mealImage = meal?.image || (mealNom ? getDishImage(mealNom) : '');
  const totalMin = (meal?.prepMin || 0) + (meal?.cuissonMin || 0);
  const portions = meal?.portions || 4;

  const escapedNom = mealNom ? mealNom.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
  const escapedCategory = mealCategory.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const rawSafeAppUrl = appUrl.replace(/"/g, '&quot;');
  const homeUrl = rawSafeAppUrl.includes('?') ? `${rawSafeAppUrl}&tab=home` : `${rawSafeAppUrl}?tab=home`;
  const planningUrl = rawSafeAppUrl.includes('?') ? `${rawSafeAppUrl}&tab=planning` : `${rawSafeAppUrl}?tab=planning`;

  // Effective mode: small by default if auto and screen is portrait/square
  const effectiveMode = size === 'auto' ? 'small' : size;

  return `<!DOCTYPE html>
<html lang="fr" class="mode-${effectiveMode} theme-${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <!-- Requis par JsWidget (Villy21/JsWidget) -->
  <meta name="js-widget-title" content="${title}">
  <title>${title} • BROCOLI</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
    :root {
      --font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      --bg-page: #0F172A;
      --card-bg: #FFFFFF;
      --text-dark: #0F172A;
      --text-muted: #64748B;
      --emerald: #059669;
      --emerald-light: #ECFDF5;
      --emerald-border: #A7F3D0;
      --radius-widget: 22px;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg-page: #F1F5F9;
      }
    }
    .theme-dark {
      --bg-page: #000000;
      --card-bg: #1C1C1E;
      --text-dark: #F8FAFC;
      --text-muted: #94A3B8;
    }
    .theme-light {
      --bg-page: #F1F5F9;
      --card-bg: #FFFFFF;
      --text-dark: #0F172A;
      --text-muted: #64748B;
    }

    html, body {
      width: 100%;
      height: 100%;
      background-color: var(--bg-page);
      font-family: var(--font-family);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
    }

    /* Container surrounding the single widget card */
    .stage {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }

    /* ========================================================
       1. FORMAT PETIT (1x1 CARRÉ) - SPÉCIFIQUE WIDGETWEB / IOS
       ======================================================== */
    .widget-card-small {
      width: min(94vw, 94vh, 360px);
      height: min(94vw, 94vh, 360px);
      aspect-ratio: 1 / 1;
      border-radius: var(--radius-widget);
      position: relative;
      overflow: hidden;
      text-decoration: none;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
      background-color: #1E293B;
      border: 1px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    .small-bg-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      z-index: 1;
    }

    /* Dégradé supérieur pour rendre lisibles les badges du haut */
    .small-gradient-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 65px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
      z-index: 2;
    }

    /* Dégradé inférieur pour rendre le titre et les infos parfaitement lisibles */
    .small-gradient-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 140px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.65) 55%, transparent 100%);
      z-index: 2;
    }

    /* Rangée haute du widget carré */
    .small-top-row {
      position: relative;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .badge-today-green {
      background: var(--emerald);
      color: #FFFFFF;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
      line-height: 1.2;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    .badge-cat-glass {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    /* Zone basse du widget carré avec le titre et métadonnées */
    .small-bottom-box {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }

    .small-dish-title {
      font-size: 16px;
      font-weight: 800;
      line-height: 1.22;
      color: #FFFFFF;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 6px rgba(0,0,0,0.85);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .small-dish-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    }

    .meta-tag-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* ========================================================
       2. FORMAT MOYEN (2x1 HORIZONTAL BENTO)
       ======================================================== */
    .widget-card-medium {
      width: min(96vw, 380px);
      height: auto;
      aspect-ratio: 2.15 / 1;
      border-radius: var(--radius-widget);
      background-color: var(--card-bg);
      border: 1px solid rgba(226, 232, 240, 0.8);
      text-decoration: none;
      color: inherit;
      display: flex;
      align-items: stretch;
      padding: 10px;
      gap: 12px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .medium-photo-side {
      width: 110px;
      min-width: 110px;
      height: 100%;
      border-radius: 14px;
      position: relative;
      overflow: hidden;
      background: #E2E8F0;
    }

    .medium-photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .medium-photo-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .medium-info-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
      padding: 2px 0;
    }

    .medium-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .medium-date-text {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .medium-title-area {
      margin: 3px 0;
    }

    .medium-cat-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--emerald);
      margin-bottom: 2px;
    }

    .medium-title-text {
      font-size: 15px;
      font-weight: 800;
      color: var(--text-dark);
      line-height: 1.25;
      letter-spacing: -0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .medium-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .medium-pills-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .medium-pill-meta {
      background: rgba(100, 116, 139, 0.08);
      color: var(--text-muted);
      font-size: 9.5px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 5px;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .medium-open-btn {
      background: var(--emerald);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
    }

    /* ========================================================
       3. FORMAT GRAND (2x2)
       ======================================================== */
    .widget-card-large {
      width: min(94vw, 94vh, 360px);
      height: min(94vw, 94vh, 360px);
      aspect-ratio: 1 / 1;
      border-radius: var(--radius-widget);
      background-color: var(--card-bg);
      border: 1px solid rgba(226, 232, 240, 0.8);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 8px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .large-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .large-photo-box {
      flex: 1;
      min-height: 120px;
      border-radius: 14px;
      position: relative;
      overflow: hidden;
      background: #E2E8F0;
    }

    .large-photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .large-title-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    /* ========================================================
       ÉTAT VIDE (AUCUN REPAS PLANIFIÉ)
       ======================================================== */
    .widget-card-empty {
      width: min(94vw, 94vh, 360px);
      height: min(94vw, 94vh, 360px);
      aspect-ratio: 1 / 1;
      border-radius: var(--radius-widget);
      background-color: var(--card-bg);
      border: 1px solid rgba(226, 232, 240, 0.8);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
      gap: 10px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }

    .empty-icon-bubble {
      width: 50px;
      height: 50px;
      border-radius: 16px;
      background: var(--emerald-light);
      color: var(--emerald);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.15);
    }

    .empty-main-text {
      font-size: 14px;
      font-weight: 800;
      color: var(--text-dark);
      line-height: 1.3;
      max-width: 220px;
    }

    .empty-sub-text {
      font-size: 11px;
      color: var(--text-muted);
    }

    .empty-action-btn {
      background: var(--emerald);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 8px;
      margin-top: 4px;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
    }
  </style>
</head>
<body>
  <div class="stage" id="widget-stage">
    ${!mealNom ? `
      <!-- ============================================
           ÉTAT VIDE : AUCUN REPAS DÉFINI POUR CE JOUR
           ============================================ -->
      <a href="${planningUrl}" target="_blank" class="widget-card-empty" id="widget-action">
        <div class="empty-icon-bubble">🍽️</div>
        <div>
          <span class="badge-today-green" style="display:inline-block; margin-bottom: 6px;">AUJOURD'HUI</span>
          <p class="empty-main-text">Aucun repas planifié</p>
          <p class="empty-sub-text">${dateInfo.fullFormatted}</p>
        </div>
        <span class="empty-action-btn">Choisir un repas &rarr;</span>
      </a>
    ` : effectiveMode === 'medium' ? `
      <!-- ============================================
           FORMAT MOYEN (2x1 RECTANGLE HORIZONTAL BENTO)
           ============================================ -->
      <a href="${homeUrl}" target="_blank" class="widget-card-medium" id="widget-action">
        <!-- Photo à gauche -->
        <div class="medium-photo-side">
          <img src="${mealImage}" alt="${escapedNom}" class="medium-photo-img" loading="eager" referrerpolicy="no-referrer" />
          <span class="medium-photo-badge">${escapedCategory}</span>
        </div>

        <!-- Informations à droite -->
        <div class="medium-info-side">
          <div class="medium-header-row">
            <span class="badge-today-green">AUJOURD'HUI</span>
            <span class="medium-date-text">${dateInfo.dateNum} ${dateInfo.monthName}</span>
          </div>

          <div class="medium-title-area">
            <div class="medium-cat-label">${escapedCategory}</div>
            <h1 class="medium-title-text">${escapedNom}</h1>
          </div>

          <div class="medium-footer-row">
            <div class="medium-pills-wrap">
              ${totalMin > 0 ? `<span class="medium-pill-meta">⏱ ${totalMin}m</span>` : ''}
              ${portions ? `<span class="medium-pill-meta">👥 ${portions}p</span>` : ''}
            </div>
            <span class="medium-open-btn">Ouvrir &rarr;</span>
          </div>
        </div>
      </a>
    ` : effectiveMode === 'large' ? `
      <!-- ============================================
           FORMAT GRAND (2x2)
           ============================================ -->
      <a href="${homeUrl}" target="_blank" class="widget-card-large" id="widget-action">
        <div class="large-header-row">
          <span class="badge-today-green">AUJOURD'HUI</span>
          <span class="medium-date-text">${dateInfo.fullFormatted}</span>
        </div>

        <div class="large-photo-box">
          <img src="${mealImage}" alt="${escapedNom}" class="large-photo-img" loading="eager" referrerpolicy="no-referrer" />
          <span class="medium-photo-badge">${escapedCategory}</span>
        </div>

        <div class="large-title-block">
          <div class="medium-cat-label">${escapedCategory}</div>
          <h1 class="medium-title-text" style="font-size: 17px;">${escapedNom}</h1>
          <div class="medium-footer-row" style="margin-top: 4px;">
            <div class="medium-pills-wrap">
              ${totalMin > 0 ? `<span class="medium-pill-meta">⏱ ${totalMin} min</span>` : ''}
              ${portions ? `<span class="medium-pill-meta">👥 ${portions} pers.</span>` : ''}
            </div>
            <span class="medium-open-btn">Voir le repas &rarr;</span>
          </div>
        </div>
      </a>
    ` : `
      <!-- =========================================================
           FORMAT PETIT (1x1 CARRÉ) - LE FORMAT DE VOTRE ÉCRAN D'ACCUEIL
           ========================================================= -->
      <a href="${homeUrl}" target="_blank" class="widget-card-small" id="widget-action">
        <!-- Photo plein format -->
        <img src="${mealImage}" alt="${escapedNom}" class="small-bg-image" loading="eager" referrerpolicy="no-referrer" />
        
        <!-- Dégradés pour lisibilité du texte -->
        <div class="small-gradient-top"></div>
        <div class="small-gradient-bottom"></div>

        <!-- Rangée haute : Badge AUJOURD'HUI & Catégorie -->
        <div class="small-top-row">
          <span class="badge-today-green">AUJOURD'HUI</span>
          <span class="badge-cat-glass">${escapedCategory}</span>
        </div>

        <!-- Rangée basse : Titre du plat & Métadonnées complètes -->
        <div class="small-bottom-box">
          <h1 class="small-dish-title">${escapedNom}</h1>
          <div class="small-dish-meta">
            ${totalMin > 0 ? `<span class="meta-tag-item">⏱ ${totalMin}m</span>` : ''}
            ${portions ? `<span class="meta-tag-item">👥 ${portions}p</span>` : ''}
            <span>•</span>
            <span>${dateInfo.dateNum} ${dateInfo.monthName}</span>
          </div>
        </div>
      </a>
    `}
  </div>

  <!-- Intégration Villy21/JsWidget & WidgetWeb -->
  <script>
    try {
      if (window.__wweb2Log) {
        window.__wweb2Log("BROCOLI Widget prêt: ${escapedNom || 'Aucun repas'}");
      }
      if (window.__wweb2WaitMillisecondsToWidgetIsReady) {
        window.__wweb2WaitMillisecondsToWidgetIsReady(50);
      }
    } catch (err) {
      console.warn("JsWidget hook:", err);
    }
  </script>
</body>
</html>`;
}
