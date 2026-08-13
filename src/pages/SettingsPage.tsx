import React, { useState } from 'react';
import { User, LogOut, Shield, Bell, Smartphone, Heart, Database, Trash2, CheckCircle2, Image as ImageIcon, Loader2, MessageSquarePlus, Bug, Lightbulb, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { FeedbackModal } from '../components/FeedbackModal';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { recettes, clearBase64Images } = useStore();

  const [cleaning, setCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const base64Count = recettes.filter(r => r.image && (r.image.startsWith('data:') || (r.image.length > 500 && !r.image.startsWith('http')))).length;
  const storageUrlCount = recettes.filter(r => r.image && r.image.startsWith('http')).length;
  const noImageCount = recettes.filter(r => !r.image).length;

  const handleClearBase64 = async () => {
    if (base64Count === 0) {
      setCleanMessage("Aucune image en Base64 n'a été détectée dans vos recettes.");
      return;
    }

    try {
      setCleaning(true);
      setCleanMessage(null);
      const res = await clearBase64Images();
      setCleanMessage(`Succès ! ${res.cleanedCount} image(s) Base64 ont été retirées de la base de données Supabase.`);
    } catch (err: any) {
      console.error("Error clearing base64 images:", err);
      setCleanMessage("Une erreur est survenue lors du nettoyage.");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 max-w-2xl mx-auto pb-24"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 px-1">Paramètres</h1>
        <p className="text-slate-500 px-1">Gérez votre compte et vos préférences.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
        {/* Profile Section */}
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 ring-4 ring-emerald-50/50">
            <User size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">{user?.email?.split('@')[0]}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Compte vérifié
            </div>
          </div>
        </div>

        {/* Feedback & Bug report section */}
        <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 rounded-3xl border border-emerald-100/80 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                <MessageSquarePlus size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Avis & Suggestions</h3>
                <p className="text-xs text-slate-500">Un bug à signaler ou une idée d'amélioration ?</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Communauté
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Votre avis compte énormément ! Transmettez-nous vos retours d'expérience, signalez un dysfonctionnement ou proposez les nouvelles fonctionnalités que vous aimeriez voir dans l'application.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99]"
            >
              <Bug size={16} />
              <span>Signaler un bug ou proposer une idée</span>
              <ChevronRight size={16} className="ml-1 opacity-70" />
            </button>
          </div>
        </div>

        {/* Supabase Storage & Database Image Cleaner */}
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 shadow-sm">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Optimisation Base de données & Storage</h3>
              <p className="text-xs text-slate-500">Stockage dans le bucket Supabase <span className="font-semibold text-emerald-700">recipe-images</span></p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base64 (à purifier)</p>
              <p className={`text-xl font-black mt-1 ${base64Count > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{base64Count}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL Storage</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{storageUrlCount}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sans image</p>
              <p className="text-xl font-black text-slate-600 mt-1">{noImageCount}</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              Pour éviter de charger des chaînes de caractères Base64 trop lourdes dans la base de données, vous pouvez purger les images en Base64 existantes. 
              Vous pourrez ensuite réimporter les images de vos recettes via le bucket <strong className="text-slate-800">recipe-images</strong> de Supabase Storage.
            </p>

            {cleanMessage && (
              <div className="flex items-center gap-2 text-xs font-semibold p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{cleanMessage}</span>
              </div>
            )}

            <button
              onClick={handleClearBase64}
              disabled={cleaning || base64Count === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
                base64Count > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {cleaning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Purge en cours dans la base de données...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Purger les {base64Count} image(s) Base64 de la BDD</span>
                </>
              )}
            </button>

            <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs">
              <p className="font-bold text-slate-800">💡 Résolution rapide si Supabase Storage renvoie une erreur :</p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                1. Dans votre Dashboard Supabase &gt; <strong>Storage</strong>, créez le bucket nommé <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-700">recipe-images</code> et décochez "Restricted" / activez <strong>Public Bucket</strong>.<br />
                2. Dans <strong>Policies</strong> pour ce bucket, ajoutez la règle <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">INSERT</code> pour le rôle public (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">anon</code>/ authenticated).<br />
                3. Vous pouvez aussi téléverser vos fichiers directement sur le Dashboard Supabase et coller leur URL dans les fiches recettes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                <Shield size={20} />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900">Sécurité</p>
                <p className="text-slate-500 text-xs text-nowrap">Mot de passe et authentification</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                <Bell size={20} />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900">Notifications</p>
                <p className="text-slate-500 text-xs text-nowrap">Alertes et rappels de planning</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                <Smartphone size={20} />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900">Appareils</p>
                <p className="text-slate-500 text-xs text-nowrap">Gérer vos sessions actives</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all font-bold group"
          >
            <LogOut className="group-hover:-translate-x-1 transition-transform" size={20} />
            Déconnexion
          </button>
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-1 text-slate-300">
          <Heart size={14} className="fill-current" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            Fait avec amour pour la cuisine
          </span>
        </div>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
          Version 2.1.0 • Supabase Cloud Sync & Storage
        </p>
      </div>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </motion.div>
  );
}
