import { useState } from 'react';
import { RefreshCw, Download, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useServiceWorkerUpdate } from '../contexts/ServiceWorkerUpdateContext';

/**
 * Section "Mise à jour" affichée uniquement dans la page des réglages.
 * Respecte les zones sûres iPhone (env(safe-area-inset-bottom)) et les cibles tactiles (>= 44px).
 */
export function AppUpdateSection() {
  const { updateAvailable, isChecking, applyUpdate, checkForUpdate } =
    useServiceWorkerUpdate();

  // Message contextuel affiché après une recherche manuelle sans nouvelle version
  const [manualFeedback, setManualFeedback] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleCheckForUpdate = async () => {
    setManualFeedback(null);
    const found = await checkForUpdate();
    if (!found) {
      setManualFeedback('Déjà à jour');
    }
  };

  const handleApplyUpdate = () => {
    setIsApplying(true);
    applyUpdate();
  };

  return (
    <section
      aria-labelledby="app-update-heading"
      className="p-6 pwa-safe-area-bottom bg-[#FAF8F4] rounded-3xl border border-stone-200/90 space-y-5"
    >
      {/* En-tête de section et texte d'état principal */}
      <div className="flex items-start gap-3.5">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            updateAvailable
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {updateAvailable ? <Sparkles size={21} /> : <CheckCircle2 size={21} />}
        </div>

        <div className="space-y-1">
          <h3 id="app-update-heading" className="font-bold text-slate-900 text-base">
            Mise à jour
          </h3>
          <p
            className={`text-sm font-semibold ${
              updateAvailable ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {updateAvailable
              ? 'Une nouvelle version est disponible'
              : 'Votre app est à jour'}
          </p>
        </div>
      </div>

      {/* Actions tactiles adaptées à l'écran iPhone */}
      <div className="flex flex-col gap-3">
        {/* Bouton proéminent visible uniquement lorsqu'une mise à jour attend d'être appliquée */}
        {updateAvailable && (
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isApplying}
            className="w-full min-h-[50px] px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-70"
          >
            {isApplying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Application de la mise à jour…</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Mettre à jour</span>
              </>
            )}
          </button>
        )}

        {/* Bouton toujours visible pour lancer une vérification manuelle */}
        <button
          type="button"
          onClick={handleCheckForUpdate}
          disabled={isChecking || isApplying}
          className="w-full min-h-[46px] px-5 py-3 bg-white hover:bg-stone-50 active:scale-[0.99] text-slate-800 border border-stone-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          <RefreshCw size={15} className={isChecking ? 'animate-spin text-emerald-600' : 'text-slate-600'} />
          <span>
            {isChecking ? 'Recherche en cours…' : 'Rechercher une mise à jour'}
          </span>
        </button>

        {/* Retour explicite lorsqu'aucune mise à jour n'a été trouvée après vérification */}
        {!updateAvailable && manualFeedback && (
          <p
            role="status"
            className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5 pt-0.5"
          >
            <CheckCircle2 size={14} />
            <span>{manualFeedback}</span>
          </p>
        )}
      </div>
    </section>
  );
}
