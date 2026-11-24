import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Home, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  Sparkles,
  ChefHat,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../store';
import { HouseholdRole } from '../types';

interface HouseholdJoinModalProps {
  isOpen: boolean;
  initialCode?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HouseholdJoinModal({ isOpen, initialCode = '', onClose, onSuccess }: HouseholdJoinModalProps) {
  const { joinHousehold, currentUserEmail } = useStore();
  const [code, setCode] = useState(initialCode);
  const [nom, setNom] = useState(currentUserEmail ? currentUserEmail.split('@')[0] : '');
  const [role, setRole] = useState<HouseholdRole>('cuisinier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Veuillez saisir le code d'invitation.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await joinHousehold(code.trim().toUpperCase(), role, nom.trim());
      if (res.success) {
        setSuccessMessage("Félicitations ! Vous avez rejoint la Maison familiale avec succès.");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(res.error || "Impossible de rejoindre la Maison avec ce code.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 z-10"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Home size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Rejoindre une Maison</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Connectez-vous à la cuisine de votre famille
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Code d'invitation de la Maison
            </label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex: MAISON-7842"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold uppercase tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Le code à 8 ou 10 caractères partagé par le créateur de votre foyer.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Votre prénom ou surnom dans la maison
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Maman, Papa, Lucas..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Votre profil culinaire
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('cuisinier')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  role === 'cuisinier'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-lg">🍳</div>
                <div className="text-[11px] font-bold mt-1">Cuisinier</div>
                <div className="text-[9px] text-slate-400">Parent / Chef</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('commis')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  role === 'commis'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-lg">🧑‍🍳</div>
                <div className="text-[11px] font-bold mt-1">Commis</div>
                <div className="text-[9px] text-slate-400">Ado / Aide</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('enfant')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  role === 'enfant'
                    ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-lg">👶</div>
                <div className="text-[11px] font-bold mt-1">Gourmand</div>
                <div className="text-[9px] text-slate-400">Enfant</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Le Chef de maison pourra affiner vos permissions dans la matrice de compétences.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connexion à la Maison...</span>
                </>
              ) : (
                <>
                  <span>Rejoindre la Maison familiale</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
