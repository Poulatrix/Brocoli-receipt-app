import React from 'react';
import { User, LogOut, Shield, Bell, Smartphone, Heart } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { motion } from 'motion/react';

export function SettingsPage() {
  const { user, signOut } = useAuth();

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
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 ring-4 ring-blue-50/50">
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

        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-sm">
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
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-sm">
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
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-sm">
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
          Version 2.0.0 • Supabase Cloud Sync
        </p>
      </div>
    </motion.div>
  );
}
