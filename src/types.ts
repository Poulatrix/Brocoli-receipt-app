/**
 * Types pour l'application Mes Recettes
 */

export type CategorieRecette = 
  | 'Viande' 
  | 'Poisson' 
  | 'Végétarien' 
  | 'Pâtes' 
  | 'Soupe' 
  | 'Dessert' 
  | 'Entrée' 
  | 'Autre';

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
