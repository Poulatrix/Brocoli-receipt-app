/**
 * Types pour l'application Mes Recettes
 */

export type CategorieRecette = string;
export type SaisonRecette = 'ete' | 'hiver' | 'toute_annee';

export interface Ingredient {
  id: string;
  quantite: number;
  unite: string;
  nom: string;
}

export interface Instruction {
  id: string;
  titre: string;
  texte: string;
}

export interface Recette {
  id: string;
  nom: string;
  categorie: CategorieRecette;
  image: string; // URL ou base64
  portions: number;
  prepMin: number;
  cuissonMin: number;
  calories: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  estIA: boolean;
  favori: boolean;
  saison?: SaisonRecette;
  dateCreation: string;
}

export interface PlanningEntry {
  date: string; // YYYY-MM-DD
  recetteId: string | null;
  suggestionLibre: string | null;
}

export interface ShoppingItem {
  id: string;
  quantite: number;
  unite: string;
  nom: string;
  achete: boolean;
}

export interface AppState {
  recettes: Recette[];
  planning: PlanningEntry[];
  courses: ShoppingItem[];
}

export type HouseholdRole = 'chef' | 'cuisinier' | 'commis' | 'enfant' | 'custom';

export type HouseholdCompetenceKey =
  | 'voir_recettes'
  | 'creer_recettes'
  | 'editer_recettes'
  | 'supprimer_recettes'
  | 'utiliser_ia'
  | 'gerer_planning'
  | 'suggerer_repas'
  | 'gerer_courses'
  | 'cocher_courses'
  | 'vider_courses'
  | 'inviter_membres'
  | 'gerer_maison';

export type HouseholdCompetences = Record<HouseholdCompetenceKey, boolean>;

export interface HouseholdMember {
  id: string;
  userId: string;
  nom: string;
  email: string;
  avatar?: string;
  role: HouseholdRole;
  competences: HouseholdCompetences;
  dateRejoint: string;
  estCreateur: boolean;
}

export interface HouseholdMcpConfig {
  enabled: boolean;
  boundUserId: string;
  tokenPreview: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface McpPendingMutation {
  id: string;
  type: 'add_shopping_items' | 'toggle_shopping_item' | 'suggest_meal';
  payload: any;
  createdAt: string;
}

export interface Household {
  id: string;
  nom: string;
  codeInvitation: string;
  createurUserId: string;
  dateCreation: string;
  membres: HouseholdMember[];
  roleCompetencesPreset?: Record<HouseholdRole, HouseholdCompetences>;
  mcpConfig?: HouseholdMcpConfig;
}

export const DEFAULT_ROLE_COMPETENCES: Record<HouseholdRole, HouseholdCompetences> = {
  chef: {
    voir_recettes: true,
    creer_recettes: true,
    editer_recettes: true,
    supprimer_recettes: true,
    utiliser_ia: true,
    gerer_planning: true,
    suggerer_repas: true,
    gerer_courses: true,
    cocher_courses: true,
    vider_courses: true,
    inviter_membres: true,
    gerer_maison: true,
  },
  cuisinier: {
    voir_recettes: true,
    creer_recettes: true,
    editer_recettes: true,
    supprimer_recettes: false,
    utiliser_ia: true,
    gerer_planning: true,
    suggerer_repas: true,
    gerer_courses: true,
    cocher_courses: true,
    vider_courses: true,
    inviter_membres: true,
    gerer_maison: false,
  },
  commis: {
    voir_recettes: true,
    creer_recettes: false,
    editer_recettes: false,
    supprimer_recettes: false,
    utiliser_ia: false,
    gerer_planning: false,
    suggerer_repas: true,
    gerer_courses: true,
    cocher_courses: true,
    vider_courses: false,
    inviter_membres: false,
    gerer_maison: false,
  },
  enfant: {
    voir_recettes: true,
    creer_recettes: false,
    editer_recettes: false,
    supprimer_recettes: false,
    utiliser_ia: false,
    gerer_planning: false,
    suggerer_repas: true,
    gerer_courses: false,
    cocher_courses: true,
    vider_courses: false,
    inviter_membres: false,
    gerer_maison: false,
  },
  custom: {
    voir_recettes: true,
    creer_recettes: false,
    editer_recettes: false,
    supprimer_recettes: false,
    utiliser_ia: false,
    gerer_planning: false,
    suggerer_repas: true,
    gerer_courses: true,
    cocher_courses: true,
    vider_courses: false,
    inviter_membres: false,
    gerer_maison: false,
  }
};

export const COMPETENCE_DESCRIPTIONS: Record<HouseholdCompetenceKey, { label: string; description: string; icon: string }> = {
  voir_recettes: {
    label: "Consulter les recettes",
    description: "Lire les fiches recettes, voir les ingrédients et étapes de préparation.",
    icon: "BookOpen"
  },
  creer_recettes: {
    label: "Créer des recettes",
    description: "Ajouter de nouvelles recettes au carnet familial (saisie ou import).",
    icon: "PlusCircle"
  },
  editer_recettes: {
    label: "Modifier les recettes",
    description: "Modifier les ingrédients, quantités, temps et photos des recettes.",
    icon: "Edit3"
  },
  supprimer_recettes: {
    label: "Supprimer des recettes",
    description: "Supprimer définitivement des recettes du carnet de la maison.",
    icon: "Trash2"
  },
  utiliser_ia: {
    label: "Assistant IA Gemini",
    description: "Numériser une recette par photo ou inventer un plat avec l'IA.",
    icon: "Sparkles"
  },
  gerer_planning: {
    label: "Gérer le Planning",
    description: "Assigner, modifier et verrouiller les repas du calendrier de la semaine.",
    icon: "Calendar"
  },
  suggerer_repas: {
    label: "Suggérer des plats",
    description: "Proposer des idées de repas et suggérer des plats pour le planning familial.",
    icon: "Lightbulb"
  },
  gerer_courses: {
    label: "Gérer les Courses",
    description: "Ajouter des ingrédients ou articles manuels à la liste de courses.",
    icon: "ShoppingCart"
  },
  cocher_courses: {
    label: "Cocher en magasin",
    description: "Cocher les articles au supermarché lorsqu'ils sont achetés.",
    icon: "CheckSquare"
  },
  vider_courses: {
    label: "Vider / Nettoyer la liste",
    description: "Effacer la liste de courses ou supprimer les articles achetés.",
    icon: "CheckCircle2"
  },
  inviter_membres: {
    label: "Inviter des proches",
    description: "Afficher et partager le code d'invitation de la maison.",
    icon: "UserPlus"
  },
  gerer_maison: {
    label: "Administrer la Maison",
    description: "Modifier le nom de la maison, gérer les rôles et la matrice de compétences.",
    icon: "ShieldAlert"
  }
};

