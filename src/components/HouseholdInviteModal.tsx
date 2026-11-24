import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  RefreshCw, 
  MessageCircle, 
  Mail, 
  Smartphone, 
  Users, 
  Crown, 
  ShieldCheck, 
  QrCode,
  Sparkles,
  Link2
} from 'lucide-react';
import { useStore } from '../store';

interface HouseholdInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HouseholdInviteModal({ isOpen, onClose }: HouseholdInviteModalProps) {
  const { household, regenerateHouseholdCode, getCurrentMember } = useStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateNotice, setRegenerateNotice] = useState<string | null>(null);

  const currentMember = getCurrentMember();
  const isChef = currentMember?.estCreateur || currentMember?.role === 'chef' || currentMember?.competences?.inviter_membres;

  if (!isOpen || !household) return null;

  const inviteCode = household.codeInvitation || 'MAISON-0000';
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(inviteCode)}`;

  const invitationMessage = `👨‍👩‍👧‍👦 Rejoins notre Maison "${household.nom}" sur l'application BROCOLI !\n\n🔑 Code d'invitation : ${inviteCode}\n\n👉 Ou clique directement sur ce lien pour rejoindre notre carnet familial et notre planning : \n${joinUrl}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = inviteCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = joinUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rejoins la ${household.nom} sur BROCOLI`,
          text: invitationMessage,
          url: joinUrl,
        });
        return;
      } catch {
        // User cancelled or not supported
      }
    }
    // Fallback to copy link
    handleCopyLink();
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(invitationMessage)}`;
    window.open(url, '_blank');
  };

  const handleShareSms = () => {
    const url = `sms:?body=${encodeURIComponent(invitationMessage)}`;
    window.location.href = url;
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Invitation à rejoindre notre Maison familiale sur BROCOLI`);
    const body = encodeURIComponent(invitationMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleRegenerate = async () => {
    if (!confirm("Voulez-vous générer un nouveau code ? L'ancien code ne fonctionnera plus pour les nouvelles invitations.")) {
      return;
    }
    try {
      setIsRegenerating(true);
      const newCode = await regenerateHouseholdCode();
      if (newCode) {
        setRegenerateNotice(`Nouveau code généré : ${newCode}`);
        setTimeout(() => setRegenerateNotice(null), 3000);
      }
    } finally {
      setIsRegenerating(false);
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
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 z-10 space-y-0"
      >
        {/* Header with decorative badge */}
        <div className="p-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Users size={24} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-400/30 text-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                Version Familiale
              </span>
              <h2 className="text-xl font-black tracking-tight">{household.nom}</h2>
            </div>
          </div>

          <p className="text-xs text-emerald-100/90 mt-3 leading-relaxed">
            Invitez votre conjoint(e), vos enfants ou vos colocataires pour partager en direct votre carnet de recettes, vos repas de la semaine et votre liste de courses.
          </p>
        </div>

        {/* Notice on code regeneration */}
        <AnimatePresence>
          {regenerateNotice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 text-emerald-800 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b border-emerald-100"
            >
              <Check size={16} className="text-emerald-600" />
              <span>{regenerateNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code display card */}
        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 p-6 rounded-3xl border border-emerald-100 text-center space-y-3 relative overflow-hidden shadow-inner">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
              <Crown size={12} className="text-amber-500" />
              <span>Code de liaison officiel</span>
            </div>

            <div className="font-mono text-3xl sm:text-4xl font-black text-slate-900 tracking-widest py-1 select-all">
              {inviteCode}
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Ce code unique rattache instantanément toute personne à votre Maison avec les droits configurés dans la matrice.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleCopyCode}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                  copiedCode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedCode ? 'Code copié !' : 'Copier le code'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {copiedLink ? <Check size={16} /> : <Link2 size={16} />}
                <span>{copiedLink ? 'Lien copié !' : 'Copier le lien direct'}</span>
              </button>
            </div>
          </div>

          {/* Quick share actions */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Partager l'invitation en 1 clic :</span>
              <span className="text-[10px] font-normal text-slate-400">WhatsApp, SMS, Mail</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl flex flex-col items-center gap-1.5 transition-all border border-emerald-100 group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <MessageCircle size={16} />
                </div>
                <span className="text-[11px] font-bold">WhatsApp</span>
              </button>

              <button
                onClick={handleShareSms}
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-2xl flex flex-col items-center gap-1.5 transition-all border border-blue-100 group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Smartphone size={16} />
                </div>
                <span className="text-[11px] font-bold">SMS</span>
              </button>

              <button
                onClick={handleShareEmail}
                className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-2xl flex flex-col items-center gap-1.5 transition-all border border-purple-100 group"
              >
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Mail size={16} />
                </div>
                <span className="text-[11px] font-bold">E-mail</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl flex flex-col items-center gap-1.5 transition-all border border-slate-200 group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Share2 size={16} />
                </div>
                <span className="text-[11px] font-bold">Autre</span>
              </button>
            </div>
          </div>

          {/* How it works badge */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Comment votre invité(e) rejoint votre Maison ?</span>
            </div>
            <ol className="list-decimal list-inside text-slate-600 space-y-1 text-[11px] leading-relaxed">
              <li>Il ou elle ouvre l'application sur son téléphone ou ordinateur.</li>
              <li>Dans <strong>Paramètres &gt; Espace Familial</strong>, clique sur <strong>Rejoindre une Maison</strong>.</li>
              <li>Saisit votre code <strong className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded">{inviteCode}</strong> (ou clique simplement sur votre lien partagé).</li>
              <li>Ses recettes et menus sont immédiatement reliés aux vôtres !</li>
            </ol>
          </div>

          {/* Regenerate code if Chef */}
          {isChef && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Code compromis ou partagé par erreur ?</span>
              <button
                disabled={isRegenerating}
                onClick={handleRegenerate}
                className="text-slate-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                <span>Renouveler le code</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
