import React, { useState } from 'react';
import { 
  Home, 
  Users, 
  Shield, 
  UserPlus, 
  KeyRound, 
  Crown, 
  ChefHat, 
  Sparkles, 
  Edit2, 
  Check, 
  X, 
  LogOut, 
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Copy,
  Database,
  Loader2
} from 'lucide-react';
import { useStore } from '../store';
import { HouseholdInviteModal } from './HouseholdInviteModal';
import { HouseholdJoinModal } from './HouseholdJoinModal';
import { CompetenceMatrixModal } from './CompetenceMatrixModal';
import { COMPETENCE_DESCRIPTIONS, HouseholdCompetenceKey } from '../types';

const SUPABASE_SETUP_SQL = `create table if not exists public.households (
  id text primary key,
  nom text not null,
  code_invitation text unique not null,
  createur_user_id text not null,
  date_creation timestamptz not null default now(),
  role_competences_preset jsonb not null default '{}'::jsonb,
  membres jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_households_code_invitation
  on public.households (upper(code_invitation));

create table if not exists public.household_mcp_secrets (
  household_id text primary key references public.households(id) on delete cascade,
  token_hash text not null default '',
  token_preview text not null default '',
  enabled boolean not null default false,
  bound_user_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_mcp_mirrors (
  household_id text primary key references public.households(id) on delete cascade,
  recettes jsonb not null default '[]'::jsonb,
  planning jsonb not null default '[]'::jsonb,
  courses jsonb not null default '[]'::jsonb,
  pending_mutations jsonb not null default '[]'::jsonb,
  last_synced_at bigint not null default 0
);

alter table public.households enable row level security;
alter table public.household_mcp_secrets enable row level security;
alter table public.household_mcp_mirrors enable row level security;

drop policy if exists "Authenticated users manage households" on public.households;
create policy "Authenticated users manage households"
  on public.households for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage mcp secrets" on public.household_mcp_secrets;
create policy "Authenticated users manage mcp secrets"
  on public.household_mcp_secrets for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage mcp mirrors" on public.household_mcp_mirrors;
create policy "Authenticated users manage mcp mirrors"
  on public.household_mcp_mirrors for all to authenticated using (true) with check (true);`;

export function HouseholdSection() {
  const { 
    household, 
    householdLoading,
    householdError,
    householdNeedsSetup,
    syncHousehold,
    getCurrentMember, 
    updateHouseholdInfo, 
    leaveHousehold 
  } = useStore();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [householdName, setHouseholdName] = useState(household?.nom || 'Maison Familiale');
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const currentMember = getCurrentMember();
  const isChef = currentMember?.estCreateur || currentMember?.role === 'chef' || currentMember?.competences?.gerer_maison;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  if (!household) {
    return (
      <div className="p-6 bg-[#FAF8F4] rounded-3xl border border-stone-200/90 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0">
              <Home size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Maison Familiale & Invitations</h3>
              <p className="text-xs text-slate-500">
                Invitez vos proches avec un code foyer et gérez la matrice de compétences.
              </p>
            </div>
          </div>
        </div>

        {householdLoading ? (
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-200 text-xs font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin text-emerald-600 shrink-0" />
            <span>Chargement de votre espace Maison Familiale...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Espace Maison non initialisé sur cette session</p>
                <p className="text-amber-800 leading-relaxed">
                  {householdError || "Impossible de joindre le serveur des Maisons Familiales pour le moment."}
                </p>
              </div>
            </div>

            {householdNeedsSetup && (
              <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Database size={15} className="text-emerald-700 shrink-0" />
                    <span>Configuration Supabase requise (1 fois)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSql(v => !v)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
                  >
                    {showSql ? 'Masquer le SQL' : 'Afficher le script SQL'}
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exécutez le script <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono">supabase_households_mcp.sql</code> dans le <strong>SQL Editor</strong> de votre projet Supabase, puis cliquez sur Réessayer.
                </p>
                {showSql && (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        {sqlCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{sqlCopied ? 'Script copié' : 'Copier le script SQL'}</span>
                      </button>
                    </div>
                    <pre className="bg-stone-900 text-stone-100 rounded-2xl p-3.5 text-[11px] font-mono overflow-x-auto max-h-56">
                      {SUPABASE_SETUP_SQL}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => syncHousehold()}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <RefreshCw size={15} />
                <span>Réessayer</span>
              </button>

              <button
                type="button"
                onClick={() => setIsJoinOpen(true)}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-slate-800 border border-stone-300 rounded-xl text-xs font-bold transition-colors"
              >
                <KeyRound size={15} />
                <span>Rejoindre avec un code</span>
              </button>
            </div>
          </div>
        )}

        <HouseholdJoinModal
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
        />
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!householdName.trim()) return;
    await updateHouseholdInfo({ nom: householdName.trim() });
    setIsEditingName(false);
  };

  const activeCompetencesCount = Object.values(currentMember?.competences || {}).filter(Boolean).length;

  return (
    <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 rounded-3xl border border-emerald-100/90 shadow-sm space-y-6">
      {/* Header section with household name */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 text-xl font-bold">
            🏡
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-emerald-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nom de votre Maison"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    title="Sauvegarder"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setHouseholdName(household.nom); }}
                    className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                    title="Annuler"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-extrabold text-slate-900 text-lg">{household.nom}</h3>
                  {isChef && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-slate-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-white/80"
                      title="Renommer la Maison"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Espace partagé • <span className="font-semibold text-emerald-700">{household.membres.length} membre(s)</span>
            </p>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm ${
            currentMember?.role === 'chef'
              ? 'bg-amber-100 text-amber-900 border border-amber-200'
              : currentMember?.role === 'cuisinier'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
              : currentMember?.role === 'commis'
              ? 'bg-blue-100 text-blue-900 border border-blue-200'
              : 'bg-purple-100 text-purple-900 border border-purple-200'
          }`}>
            <span>{currentMember?.role === 'chef' ? '👑' : currentMember?.role === 'cuisinier' ? '🍳' : currentMember?.role === 'commis' ? '🧑‍🍳' : '👶'}</span>
            <span>
              {currentMember?.role === 'chef' ? 'Chef de Maison' :
               currentMember?.role === 'cuisinier' ? 'Cuisinier' :
               currentMember?.role === 'commis' ? 'Commis' :
               currentMember?.role === 'enfant' ? 'Petit Gourmand' : 'Membre'}
            </span>
          </div>
        </div>
      </div>

      {/* Members avatars bar */}
      <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="flex -space-x-2">
            {household.membres.map((m) => (
              <div
                key={m.id}
                title={`${m.nom} (${m.role})`}
                className="w-10 h-10 rounded-full bg-white border-2 border-emerald-100 flex items-center justify-center text-lg shadow-sm hover:scale-110 transition-transform cursor-pointer"
              >
                {m.avatar || '👤'}
              </div>
            ))}
          </div>

          <div className="pl-3 text-xs">
            <p className="font-bold text-slate-800">
              {household.membres.map(m => m.nom).join(', ')}
            </p>
            <p className="text-[11px] text-slate-400">
              Code d'invitation : <span className="font-mono font-bold text-emerald-800">{household.codeInvitation}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="shrink-0 p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
        >
          <UserPlus size={15} />
          <span className="hidden sm:inline">Inviter un proche</span>
        </button>
      </div>

      {/* Main Action Buttons: Matrix, Invite, Join */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setIsMatrixOpen(true)}
          className="p-4 bg-white hover:bg-slate-50 border border-emerald-200/80 rounded-2xl text-left transition-all shadow-sm hover:shadow group flex items-start gap-3.5"
        >
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Shield size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs">Matrice de compétences</h4>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Limiter les accès et possibilités de chaque membre (recettes, planning, IA, courses).
            </p>
          </div>
        </button>

        <button
          onClick={() => setIsJoinOpen(true)}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all shadow-sm hover:shadow group flex items-start gap-3.5"
        >
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <KeyRound size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs">Rejoindre une autre Maison</h4>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Vous avez reçu un code d'invitation ? Connectez-vous au foyer d'un proche.
            </p>
          </div>
        </button>
      </div>

      {/* Summary of current permissions for this user */}
      <div className="pt-2 border-t border-emerald-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">Vos capacités actives :</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-lg text-[10px]">
            {activeCompetencesCount} sur {Object.keys(COMPETENCE_DESCRIPTIONS).length} compétences
          </span>
        </div>

        {!currentMember?.estCreateur && (
          <button
            onClick={() => {
              if (confirm("Voulez-vous vraiment quitter cette Maison ? Vous perdrez l'accès aux recettes et planning partagés.")) {
                leaveHousehold();
              }
            }}
            className="text-rose-600 hover:text-rose-700 font-semibold text-[11px] flex items-center gap-1 self-start sm:self-auto"
          >
            <LogOut size={12} />
            <span>Quitter cette Maison</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <HouseholdInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <HouseholdJoinModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      <CompetenceMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
      />
    </div>
  );
}
