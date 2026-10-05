import React, { useState, useMemo } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  RefreshCw, 
  Code, 
  Layers, 
  Sparkles, 
  Info,
  Calendar,
  Eye,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStore } from '../store';
import { formatFrenchDateString } from '../lib/widgetRenderer';
import { syncWidgetSchedule } from '../lib/widgetSync';

export function JsWidgetSettingsModule() {
  const { user } = useAuth();
  const { planning, recettes } = useStore();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJsUrl, setCopiedJsUrl] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [previewKey, setPreviewKey] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [activeFormatTab, setActiveFormatTab] = useState<'web' | 'script'>('web');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Compute today's date ISO in Paris time
  const todayISO = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  const dateInfo = useMemo(() => formatFrenchDateString(todayISO), [todayISO]);

  // Find today's meal in local store to show info
  const todayMealInfo = useMemo(() => {
    const entry = planning.find(p => p.date === todayISO);
    if (!entry) return null;
    if (entry.recetteId) {
      const rec = recettes.find(r => r.id === entry.recetteId);
      if (rec) return { nom: rec.nom, categorie: rec.categorie || 'Recette', type: 'recipe' };
    }
    if (entry.suggestionLibre) {
      return { nom: entry.suggestionLibre, categorie: 'Idée libre', type: 'custom' };
    }
    return null;
  }, [planning, recettes, todayISO]);

  // Base origin & query params
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (user?.id) params.set('user', user.id);
    if (origin && !origin.includes('localhost')) {
      params.set('app', origin);
    }
    return params.toString();
  }, [user?.id, origin]);

  const widgetUrl = `${origin}/widget/today?${[queryParams, `size=${selectedSize}`].filter(Boolean).join('&')}`;
  const scriptUrl = `${origin}/widget/today.js?${[queryParams, `size=${selectedSize}`].filter(Boolean).join('&')}`;

  const previewIframeUrl = `${origin}/widget/today?${[queryParams, `size=${selectedSize}`, `t=${previewKey}`].filter(Boolean).join('&')}`;

  const handleCopy = (text: string, isJs = false) => {
    navigator.clipboard.writeText(text);
    if (isJs) {
      setCopiedJsUrl(true);
      setTimeout(() => setCopiedJsUrl(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncWidgetSchedule(planning, recettes, user?.id);
      if (res.success) {
        setSyncFeedback(`${res.count} date(s) synchronisée(s) vers le widget !`);
        setPreviewKey(k => k + 1);
      } else {
        setSyncFeedback("Échec de synchronisation. Vérifiez la connexion réseau.");
      }
    } catch {
      setSyncFeedback("Erreur lors de la synchronisation.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Dimensions of the preview simulator
  const previewDimensions = {
    small: { width: 168, height: 168, label: 'Petit (1x1)' },
    medium: { width: 338, height: 168, label: 'Moyen (2x1)' },
    large: { width: 338, height: 338, label: 'Grand (2x2)' }
  }[selectedSize];

  return (
    <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-stone-500/5 to-teal-500/10 rounded-3xl border border-emerald-100/90 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Widget iOS & Écran d'accueil</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                JsWidget
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Affichez le bento « Aujourd'hui » en direct sur votre iPhone/iPad
            </p>
          </div>
        </div>

        <a 
          href="https://github.com/Villy21/JsWidget" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all w-fit"
        >
          <span>Doc Villy21/JsWidget</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Description & current status */}
      <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs text-slate-600 leading-relaxed">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Calendar size={14} className="text-emerald-600 shrink-0" />
            <span>Repas pour aujourd'hui ({dateInfo.fullFormatted}) :</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
              todayMealInfo 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {todayMealInfo ? `🍽️ ${todayMealInfo.nom}` : '⚠️ Aucun repas défini'}
            </span>
          </div>
        </div>

        {!todayMealInfo && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>
              Aucun plat n'est actuellement planifié pour la date d'aujourd'hui. Le widget affichera donc l'état <strong>« Aucun repas planifié »</strong> et vous permettra de choisir un repas en un clic. Pour voir votre plat affiché, attribuez un repas à la date d'aujourd'hui dans l'onglet Planning.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            Le widget génère automatiquement le bento avec photo, badges et temps de préparation, et actualise le menu tous les jours.
          </p>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto disabled:opacity-50"
            title="Forcer la synchronisation avec le serveur du widget"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Synchronisation..." : "Synchroniser le planning"}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl font-medium border border-emerald-200 animate-in fade-in">
            <CheckCircle2 size={14} />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* Format selector tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveFormatTab('web')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFormatTab === 'web'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white/70 text-slate-600 hover:bg-white'
          }`}
        >
          <Layers size={14} />
          <span>URL Web (WidgetWeb / JsWidget)</span>
        </button>
        <button
          onClick={() => setActiveFormatTab('script')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFormatTab === 'script'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white/70 text-slate-600 hover:bg-white'
          }`}
        >
          <Code size={14} />
          <span>Script JavaScript / Scriptable</span>
        </button>
      </div>

      {/* URL Copy and action bar */}
      <div className="space-y-4">
        {/* Format Selector Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/80 rounded-2xl border border-slate-200">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Choisissez le format de votre Widget :
            </div>
            <div className="text-[11px] text-slate-500">
              {selectedSize === 'small' 
                ? "Format Carré (1x1) — Idéal pour votre widget d'écran d'accueil actuel"
                : selectedSize === 'medium'
                ? "Format Bento (2x1) — Photo à gauche, détails à droite"
                : "Format Grand (2x2) — Pleine largeur avec photo haute définition"}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedSize === size
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {size === 'small' ? 'Petit (1x1)' : size === 'medium' ? 'Moyen (2x1)' : 'Grand (2x2)'}
              </button>
            ))}
          </div>
        </div>

        {activeFormatTab === 'web' ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              URL du Widget {selectedSize === 'small' ? '(Format Carré 1x1)' : selectedSize === 'medium' ? '(Format Bento 2x1)' : '(Format Grand 2x2)'} :
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  readOnly 
                  value={widgetUrl}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 select-all pr-10 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(widgetUrl, false)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                    copiedUrl 
                      ? 'bg-green-600 text-white shadow-green-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                  }`}
                  title="Copier l'URL"
                >
                  {copiedUrl ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedUrl ? 'Copié !' : 'Copier l\'URL'}</span>
                </button>

                <a 
                  href={widgetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <Eye size={15} />
                  <span className="hidden sm:inline">Tester</span>
                </a>

                <button
                  onClick={() => setShowQr(!showQr)}
                  className={`p-2.5 rounded-xl border transition-all shadow-xs ${
                    showQr ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  title="Afficher le QR code pour scanner avec iPhone"
                >
                  <QrCode size={16} />
                </button>
              </div>
            </div>

            {/* Note pour WidgetWeb / Crop */}
            <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>🎯 Réglage dans l'application WidgetWeb (iPhone) :</span>
              </div>
              <p>
                Collez l'URL ci-dessus dans <strong>WidgetWeb</strong>. La page affiche maintenant une carte <strong>carrée dédiée 1:1</strong> avec photo plein format, titre et badges parfaitement agencés.
              </p>
              <p className="text-emerald-800">
                Dans WidgetWeb, ajustez simplement le cadre rouge autour de la carte carrée puis touchez <strong>« Mise à jour »</strong> en haut à droite. Le widget sur votre écran d'accueil sera alors complet et sans aucune coupure !
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              URL du script JavaScript (.js) :
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  readOnly 
                  value={scriptUrl}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 select-all pr-10 shadow-xs"
                />
              </div>

              <button
                onClick={() => handleCopy(scriptUrl, true)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                  copiedJsUrl 
                    ? 'bg-green-600 text-white shadow-green-600/20' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                }`}
              >
                {copiedJsUrl ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedJsUrl ? 'Copié !' : 'Copier script .js'}</span>
              </button>
            </div>
          </div>
        )}

        {/* QR Code preview if toggled */}
        {showQr && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-slate-800">Scannez ce QR Code avec l'appareil photo de votre iPhone :</p>
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(widgetUrl)}`} 
                alt="QR Code Widget URL"
                className="w-36 h-36"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Ouvre directement la vue HTML prête pour WidgetWeb
            </p>
          </div>
        )}
      </div>

      {/* Simulator & Live Preview */}
      <div className="space-y-3 pt-2 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Aperçu en direct du Widget :</span>
          </div>

          {/* Size selector buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedSize === size
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {size === 'small' ? 'Petit (1x1)' : size === 'medium' ? 'Moyen (2x1)' : 'Grand (2x2)'}
              </button>
            ))}
            
            <button
              onClick={() => setPreviewKey(k => k + 1)}
              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-all ml-1"
              title="Rafraîchir l'aperçu"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Live Simulator Viewport */}
        <div className="w-full bg-[#E5E5EA] dark:bg-[#1C1C1E] p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-200 overflow-hidden min-h-[220px]">
          <div 
            style={{ 
              width: `${previewDimensions.width}px`, 
              height: `${previewDimensions.height}px` 
            }}
            className="transition-all duration-300 relative rounded-[22px] overflow-hidden shadow-2xl ring-1 ring-black/10 bg-white"
          >
            <iframe 
              key={`${previewIframeUrl}-${previewKey}`}
              src={previewIframeUrl}
              title="Widget Preview Simulator"
              className="w-full h-full border-0 pointer-events-auto"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            Format simulé : {previewDimensions.label} • iOS Home Screen Widget
          </span>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="bg-emerald-900/5 border border-emerald-200/60 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-emerald-950">
          <Info size={14} className="text-emerald-700" />
          <span>Comment installer le widget sur votre iPhone avec JsWidget :</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed pl-1">
          <li>Installez l'application <strong>WidgetWeb / JsWidget</strong> sur votre iPhone (depuis l'App Store ou GitHub).</li>
          <li>Sélectionnez le format <strong>Petit (1x1)</strong> ci-dessus et copiez l'<strong>URL du Widget</strong> (ou scannez le QR code).</li>
          <li>Dans l'application WidgetWeb, ajoutez votre widget en collant cette URL.</li>
          <li>Dans l'écran de cadrage de WidgetWeb, ajustez le cadre rouge autour de la carte carrée et appuyez sur <strong>« Mise à jour »</strong> en haut à droite.</li>
          <li>Sur votre écran d'accueil iOS, le widget <strong>WidgetWeb</strong> affiche désormais le repas du jour en plein format, net et sans aucune coupure !</li>
        </ol>
      </div>

    </div>
  );
}
