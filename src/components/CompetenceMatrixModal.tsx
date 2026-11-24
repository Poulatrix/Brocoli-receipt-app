import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Shield, 
  Users, 
  Check, 
  RotateCcw, 
  Info, 
  Crown, 
  ChefHat, 
  Sparkles, 
  Calendar, 
  ShoppingCart, 
  BookOpen, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  CheckCircle2, 
  UserPlus, 
  ShieldAlert,
  UserCheck,
  UserX,
  Sliders,
  ChevronRight,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useStore } from '../store';
import { 
  HouseholdRole, 
  HouseholdCompetenceKey, 
  HouseholdCompetences, 
  COMPETENCE_DESCRIPTIONS, 
  DEFAULT_ROLE_COMPETENCES,
  HouseholdMember
} from '../types';

interface CompetenceMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_INFO: Record<HouseholdRole, { label: string; badge: string; icon: any; color: string; desc: string }> = {
  chef: {
    label: "Chef de Maison",
    badge: "Administrateur",
    icon: Crown,
    color: "amber",
    desc: "Contrôle total : gère les recettes, le planning, les membres et la matrice."
  },
  cuisinier: {
    label: "Cuisinier / Parent",
    badge: "Gestionnaire",
    icon: ChefHat,
    color: "emerald",
    desc: "Prépare les repas, ajoute et modifie les recettes, gère les menus et l'IA."
  },
  commis: {
    label: "Commis / Ado",
    badge: "Participant",
    icon: UserCheck,
    color: "blue",
    desc: "Consulte le carnet, suggère des idées de repas, coche et gère les courses."
  },
  enfant: {
    label: "Petit Gourmand",
    badge: "Observateur",
    icon: Sparkles,
    color: "purple",
    desc: "Consulte les recettes, suggère ses plats préférés et coche ses courses."
  },
  custom: {
    label: "Sur-mesure",
    badge: "Personnalisé",
    icon: Sliders,
    color: "slate",
    desc: "Droits individuels réglés spécifiquement dans la matrice."
  }
};

const COMPETENCE_KEYS: HouseholdCompetenceKey[] = [
  'voir_recettes',
  'creer_recettes',
  'editer_recettes',
  'supprimer_recettes',
  'utiliser_ia',
  'gerer_planning',
  'suggerer_repas',
  'gerer_courses',
  'cocher_courses',
  'vider_courses',
  'inviter_membres',
  'gerer_maison',
];

export function CompetenceMatrixModal({ isOpen, onClose }: CompetenceMatrixModalProps) {
  const { 
    household, 
    updateHouseholdInfo, 
    updateHouseholdMember, 
    removeHouseholdMember,
    getCurrentMember 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'matrix' | 'members'>('matrix');
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<HouseholdMember | null>(null);

  const currentMember = getCurrentMember();
  const isChef = currentMember?.estCreateur || currentMember?.role === 'chef' || currentMember?.competences?.gerer_maison;

  if (!isOpen || !household) return null;

  const currentPreset = household.roleCompetencesPreset || DEFAULT_ROLE_COMPETENCES;

  const handleTogglePresetCompetence = async (role: HouseholdRole, key: HouseholdCompetenceKey) => {
    if (!isChef) return;
    if (role === 'chef' && (key === 'gerer_maison' || key === 'voir_recettes')) {
      // Don't allow breaking chef core capability
      return;
    }

    const currentVal = Boolean(currentPreset[role]?.[key]);
    const updatedPreset = {
      ...currentPreset,
      [role]: {
        ...currentPreset[role],
        [key]: !currentVal
      }
    };

    await updateHouseholdInfo({ roleCompetencesPreset: updatedPreset });
    setSaveFeedback(`Compétence mise à jour pour le rôle ${ROLE_INFO[role].label} !`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleResetToDefaults = async () => {
    if (!isChef) return;
    if (confirm("Réinitialiser toutes les compétences aux valeurs recommandées par défaut ?")) {
      await updateHouseholdInfo({ roleCompetencesPreset: DEFAULT_ROLE_COMPETENCES });
      setSaveFeedback("Matrice réinitialisée aux réglages par défaut !");
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  const handleChangeMemberRole = async (memberId: string, newRole: HouseholdRole) => {
    if (!isChef) return;
    await updateHouseholdMember(memberId, { role: newRole });
    setSaveFeedback("Rôle du membre mis à jour !");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleToggleMemberGranularCompetence = async (member: HouseholdMember, key: HouseholdCompetenceKey) => {
    if (!isChef) return;
    const currentVal = Boolean(member.competences?.[key]);
    await updateHouseholdMember(member.id, {
      role: 'custom',
      competences: {
        ...member.competences,
        [key]: !currentVal
      }
    });
    setSaveFeedback(`Compétence modifiée pour ${member.nom} !`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !isChef) return;
    await removeHouseholdMember(memberToRemove.id);
    setMemberToRemove(null);
    setSaveFeedback(`${memberToRemove.nom} a été retiré de la Maison.`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const getCompetenceIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return BookOpen;
      case 'PlusCircle': return PlusCircle;
      case 'Edit3': return Edit3;
      case 'Trash2': return Trash2;
      case 'Sparkles': return Sparkles;
      case 'Calendar': return Calendar;
      case 'Lightbulb': return Lightbulb;
      case 'ShoppingCart': return ShoppingCart;
      case 'CheckSquare': return CheckSquare;
      case 'CheckCircle2': return CheckCircle2;
      case 'UserPlus': return UserPlus;
      case 'ShieldAlert': return ShieldAlert;
      default: return Info;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
        className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 z-10"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-emerald-50/30 to-slate-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Matrice de compétences</h2>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full tracking-wider">
                  {household.nom}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Définissez précisément les droits et accès de chaque membre de la famille.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Save feedback alert */}
        <AnimatePresence>
          {saveFeedback && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span>{saveFeedback}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sliders size={16} />
              <span>Matrice par Rôles</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users size={16} />
              <span>Membres du Foyer ({household.membres.length})</span>
            </button>
          </div>

          {activeTab === 'matrix' && isChef && (
            <button
              onClick={handleResetToDefaults}
              className="mb-2 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
              title="Restaurer les permissions recommandées"
            >
              <RotateCcw size={13} />
              <span>Réinitialiser par défaut</span>
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'matrix' ? (
            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 text-xs text-slate-600">
                <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-slate-800">Comment fonctionne la matrice :</span>{' '}
                  Chaque rôle prédéfini possède ses compétences. Les modifications effectuées ci-dessous s'appliquent immédiatement à tous les membres possédant ce rôle. Vous pouvez aussi personnaliser un membre individuellement dans l'onglet <strong>Membres du Foyer</strong>.
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="p-3.5 pl-4 font-bold text-slate-700 w-1/3">
                        Compétence / Capacité
                      </th>
                      {(['chef', 'cuisinier', 'commis', 'enfant'] as HouseholdRole[]).map((role) => {
                        const info = ROLE_INFO[role];
                        const IconComponent = info.icon;
                        return (
                          <th key={role} className="p-3.5 text-center font-bold text-slate-800 min-w-[120px]">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                role === 'chef' ? 'bg-amber-100 text-amber-700' :
                                role === 'cuisinier' ? 'bg-emerald-100 text-emerald-700' :
                                role === 'commis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                <IconComponent size={16} />
                              </div>
                              <span className="text-[11px] font-bold">{info.label}</span>
                              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{info.badge}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {COMPETENCE_KEYS.map((key) => {
                      const comp = COMPETENCE_DESCRIPTIONS[key];
                      const IconComponent = getCompetenceIcon(comp.icon);

                      return (
                        <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 pl-4">
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                <IconComponent size={15} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{comp.label}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{comp.description}</p>
                              </div>
                            </div>
                          </td>

                          {(['chef', 'cuisinier', 'commis', 'enfant'] as HouseholdRole[]).map((role) => {
                            const isAllowed = Boolean(currentPreset[role]?.[key]);
                            const isLocked = role === 'chef' && (key === 'gerer_maison' || key === 'voir_recettes');

                            return (
                              <td key={`${key}-${role}`} className="p-3.5 text-center align-middle">
                                <button
                                  type="button"
                                  disabled={!isChef || isLocked}
                                  onClick={() => handleTogglePresetCompetence(role, key)}
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                                    isAllowed
                                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                      : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                  } ${!isChef || isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                                  title={
                                    isLocked 
                                      ? "Compétence obligatoire pour le Chef" 
                                      : isChef 
                                        ? `Cliquer pour ${isAllowed ? 'retirer' : 'accorder'} la compétence` 
                                        : "Seul le Chef peut modifier la matrice"
                                  }
                                >
                                  {isAllowed ? <Check size={16} strokeWidth={2.5} /> : <X size={14} />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Roles explanations guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(['chef', 'cuisinier', 'commis', 'enfant'] as HouseholdRole[]).map((r) => {
                  const info = ROLE_INFO[r];
                  const IconComponent = info.icon;
                  return (
                    <div key={r} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        r === 'chef' ? 'bg-amber-100 text-amber-700' :
                        r === 'cuisinier' ? 'bg-emerald-100 text-emerald-700' :
                        r === 'commis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 text-xs">{info.label}</p>
                          <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-semibold">{info.badge}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{info.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Membres actifs de la Maison</h3>
                  <p className="text-xs text-slate-500">Ajustez le profil ou les permissions personnalisées de chaque membre.</p>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {household.membres.map((member) => {
                  const roleMeta = ROLE_INFO[member.role] || ROLE_INFO.custom;
                  const isCurrent = member.userId === currentMember?.userId;
                  const isCreator = member.estCreateur;

                  return (
                    <div
                      key={member.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-200 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-200">
                            {member.avatar || '👤'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{member.nom}</h4>
                              {isCurrent && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                                  C'est vous
                                </span>
                              )}
                              {isCreator && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full flex items-center gap-1">
                                  <Crown size={10} /> Créateur
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{member.email}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              A rejoint le {new Date(member.dateRejoint).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        {/* Role selector */}
                        <div className="flex items-center gap-2">
                          {isChef && !isCreator ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.id, e.target.value as HouseholdRole)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="chef">👑 Chef de Maison</option>
                              <option value="cuisinier">🍳 Cuisinier / Parent</option>
                              <option value="commis">🧑‍🍳 Commis / Ado</option>
                              <option value="enfant">👶 Petit Gourmand</option>
                              <option value="custom">🛠️ Sur-mesure (Personnalisé)</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                              member.role === 'chef' ? 'bg-amber-100 text-amber-800' :
                              member.role === 'cuisinier' ? 'bg-emerald-100 text-emerald-800' :
                              member.role === 'commis' ? 'bg-blue-100 text-blue-800' :
                              member.role === 'enfant' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {roleMeta.label}
                            </span>
                          )}

                          {isChef && !isCreator && (
                            <button
                              onClick={() => setMemberToRemove(member)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Retirer ce membre"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Granular competences badges & toggle */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Compétences accordées ({Object.values(member.competences || {}).filter(Boolean).length} / {COMPETENCE_KEYS.length})
                          </p>
                          {isChef && !isCreator && (
                            <button
                              onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <span>{selectedMember?.id === member.id ? 'Fermer le réglage fin' : 'Personnaliser case par case'}</span>
                              <ChevronRight size={13} className={selectedMember?.id === member.id ? 'rotate-90 transition-transform' : ''} />
                            </button>
                          )}
                        </div>

                        {/* Granular Editor Accordion */}
                        {selectedMember?.id === member.id ? (
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 mt-2">
                            <p className="text-[11px] font-bold text-slate-700">
                              Cochez ou décochez les compétences individuelles pour {member.nom} :
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {COMPETENCE_KEYS.map((k) => {
                                const allowed = Boolean(member.competences?.[k]);
                                const comp = COMPETENCE_DESCRIPTIONS[k];
                                return (
                                  <label
                                    key={k}
                                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                      allowed ? 'bg-white border-emerald-300 text-slate-900 shadow-sm' : 'bg-slate-100/60 border-slate-200 text-slate-400'
                                    }`}
                                    onClick={() => handleToggleMemberGranularCompetence(member, k)}
                                  >
                                    <span className="font-semibold">{comp.label}</span>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center text-white text-[10px] ${
                                      allowed ? 'bg-emerald-600' : 'bg-slate-300'
                                    }`}>
                                      {allowed ? <Check size={12} strokeWidth={3} /> : <X size={10} />}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {COMPETENCE_KEYS.map((k) => {
                              const allowed = Boolean(member.competences?.[k]);
                              const comp = COMPETENCE_DESCRIPTIONS[k];
                              if (!allowed) return null;
                              return (
                                <span
                                  key={k}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded-lg border border-emerald-100"
                                >
                                  <Check size={10} className="text-emerald-600" />
                                  <span>{comp.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-600" />
            <span>Sécurisation familiale active • Données synchronisées</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-xs"
          >
            Fermer la matrice
          </button>
        </div>

        {/* Confirm Member Deletion Dialog */}
        <AnimatePresence>
          {memberToRemove && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMemberToRemove(null)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 border border-slate-100 z-10"
              >
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                  <UserX size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Retirer {memberToRemove.nom} ?</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Ce membre n'aura plus accès aux recettes privées et au planning de la {household.nom}.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setMemberToRemove(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmRemoveMember}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20"
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
