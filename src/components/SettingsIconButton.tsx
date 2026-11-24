import { Settings } from 'lucide-react';
import { useServiceWorkerUpdate } from '../contexts/ServiceWorkerUpdateContext';

interface SettingsIconButtonProps {
  isActive: boolean;
  onClick: () => void;
}

/**
 * Bouton de navigation vers les réglages avec pastille de mise à jour PWA.
 * Affiche une pastille rouge en haut à droite de l'icône lorsqu'une nouvelle version est prête.
 */
export function SettingsIconButton({ isActive, onClick }: SettingsIconButtonProps) {
  const { updateAvailable } = useServiceWorkerUpdate();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={updateAvailable ? 'Réglages, mise à jour disponible' : 'Réglages'}
      className={`p-3 rounded-full transition-all duration-300 relative group flex items-center justify-center ${
        isActive
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
      }`}
    >
      <span className="sw-icon-wrapper">
        <Settings size={20} strokeWidth={isActive ? 2.5 : 2} />
        {/* Pastille ronde affichée uniquement lorsqu'une mise à jour attend d'être appliquée */}
        {updateAvailable && <span className="sw-update-badge" aria-hidden="true" />}
      </span>
    </button>
  );
}
