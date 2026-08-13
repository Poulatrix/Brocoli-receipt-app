import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bug, Lightbulb, Send, CheckCircle2, Loader2, MessageSquarePlus, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();

  const [type, setType] = useState<FeedbackType>('bug');
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [severite, setSeverite] = useState<'mineur' | 'modere' | 'bloquant'>('modere');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sujet.trim() || !message.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);

    const feedbackData = {
      type,
      type_label: type === 'bug' ? 'Bug / Anomalie' : 'Amélioration / Suggestion',
      sujet: sujet.trim(),
      message: message.trim(),
      email: email.trim() || user?.email || 'anonyme',
      user_id: user?.id || null,
      severite: type === 'bug' ? severite : null,
      created_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
    };

    try {
      // 1. Try sending to Supabase 'feedbacks' table
      const { error } = await supabase.from('feedbacks').insert([feedbackData]);

      if (error) {
        console.warn("Table Supabase 'feedbacks' non trouvée ou inaccessible, sauvegarde fallback locale:", error.message);
        // Fallback: Save to localStorage for persistence
        const existing = JSON.parse(localStorage.getItem('app_feedbacks') || '[]');
        existing.push(feedbackData);
        localStorage.setItem('app_feedbacks', JSON.stringify(existing));
      }

      setSubmitted(true);
    } catch (err: any) {
      console.warn("Erreur envoi feedback, sauvegarde fallback locale:", err);
      const existing = JSON.parse(localStorage.getItem('app_feedbacks') || '[]');
      existing.push(feedbackData);
      localStorage.setItem('app_feedbacks', JSON.stringify(existing));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setSujet('');
    setMessage('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-sm">
              <MessageSquarePlus size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Vos retours & suggestions</h2>
              <p className="text-xs text-slate-500">Signalez un problème ou proposez une idée</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Merci pour votre retour !</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Votre message a bien été pris en compte. Vos retours nous aident grandement à améliorer l'application !
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleResetAndClose}
                    className="btn-primary py-2.5 px-6 text-sm mx-auto shadow-md"
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            ) : (
              <form key="form" onSubmit={handleSubmit} className="space-y-5">
                {/* Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Type de retour
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('bug')}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        type === 'bug'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900 ring-2 ring-rose-500/20 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        type === 'bug' ? 'bg-rose-500 text-white' : 'bg-white text-slate-400'
                      }`}>
                        <Bug size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-xs">Signaler un Bug</p>
                        <p className="text-[10px] opacity-75">Dysfonctionnement</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('feature')}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        type === 'feature'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        type === 'feature' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400'
                      }`}>
                        <Lightbulb size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-xs">Amélioration</p>
                        <p className="text-[10px] opacity-75">Idée ou suggestion</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bug Severity if type is bug */}
                {type === 'bug' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Sévérité du bug
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'mineur', label: 'Gêne mineure', color: 'slate' },
                        { id: 'modere', label: 'Gêne modérée', color: 'amber' },
                        { id: 'bloquant', label: 'Bloquant', color: 'rose' },
                      ].map((sev) => (
                        <button
                          key={sev.id}
                          type="button"
                          onClick={() => setSeverite(sev.id as any)}
                          className={`flex-1 py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                            severite === sev.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {sev.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Sujet
                  </label>
                  <input
                    type="text"
                    required
                    value={sujet}
                    onChange={(e) => setSujet(e.target.value)}
                    placeholder={
                      type === 'bug'
                        ? 'Ex: Erreur lors de la sauvegarde de la recette...'
                        : 'Ex: Ajouter un filtre par temps de cuisson...'
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Description détaillée
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      type === 'bug'
                        ? 'Décrivez les étapes qui ont mené au problème...'
                        : 'Expliquez comment cette amélioration vous aiderait...'
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50 resize-none"
                  />
                </div>

                {/* Email for reply */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Votre e-mail de contact (optionnel)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100 font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !sujet.trim() || !message.trim()}
                    className="flex-[2] btn-primary py-3 px-4 text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Envoyer mon retour</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
