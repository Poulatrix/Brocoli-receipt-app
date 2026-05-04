import React, { useState } from 'react';
import { ChefHat, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccess(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'authentification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 space-y-8">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ChefHat size={40} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">
              {isSignUp ? 'Créer un compte' : 'Bon retour !'}
            </h1>
            <p className="text-slate-500">
              {isSignUp 
                ? 'Rejoignez-nous pour gérer vos recettes.' 
                : 'Connectez-vous pour accéder à votre cuisine.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm">
              Compte créé ! Vérifiez vos emails pour confirmer votre inscription.
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-900/10 disabled:opacity-50"
          >
            {loading ? 'Traitement...' : (isSignUp ? 'Créer mon compte' : 'Se connecter')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(false);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isSignUp 
              ? 'Déjà un compte ? Connectez-vous' 
              : 'Pas encore de compte ? Inscrivez-vous'}
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest leading-relaxed">
          Vos données sont synchronisées en temps réel<br/>sur tous vos appareils.
        </p>
      </div>
    </div>
  );
}
