import { GoogleGenAI } from "@google/genai";

// Client-side fallback instance if /api endpoint is unavailable
const getAiFallback = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
};

export async function parseRecipe(rawText: string) {
  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("API /api/parse request failed, trying client fallback:", err);
  }

  // Fallback to direct call
  try {
    const ai = getAiFallback();
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyse et convertis ce texte de recette de cuisine en un objet JSON structuré en français. 
Si le texte est succinct, développe les instructions pour qu'elles soient claires.

Texte source: "${rawText}"

Retourne uniquement un objet JSON suivant ce format exact:
{
  "nom": "Nom de la recette",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "saison": "ete | hiver | toute_annee",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Farine" }
  ],
  "instructions": [
    { "titre": "Préparation", "texte": "Mélanger la farine..." }
  ]
}`
        }]
      }],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("L'IA n'a pas retourné de texte");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erreur lors de l'analyse texte de la recette:", error);
    return null;
  }
}

export async function generateRecipeFromTitle(title: string, hint?: string) {
  try {
    const res = await fetch("/api/generate-from-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, hint }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("API /api/generate-from-title failed, trying fallback:", err);
  }

  try {
    const ai = getAiFallback();
    const prompt = `Tu es un chef cuisinier expert.
Génère une recette de cuisine complète, délicieuse, équilibrée et facile à suivre pour le plat suivant : "${title}".
${hint ? `Consigne ou préférence spécifique : "${hint}"` : ''}

Retourne UNIQUEMENT un objet JSON suivant ce format exact en français :
{
  "nom": "${title}",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "saison": "ete | hiver | toute_annee",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Farine" }
  ],
  "instructions": [
    { "titre": "Étape 1", "texte": "Description claire et pédagogique..." }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("L'IA n'a pas retourné de recette");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erreur lors de la génération de recette par titre:", error);
    return null;
  }
}

export async function parseRecipeFromImage(
  imageBase64: string, 
  mimeType: string = "image/jpeg", 
  promptText?: string
) {
  try {
    const res = await fetch("/api/parse-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType, promptText }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("API /api/parse-image failed, trying client fallback:", err);
  }

  // Fallback
  try {
    const ai = getAiFallback();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const prompt = `Tu es un chef cuisinier expert et un numériseur de recettes.
Analyse l'image fournie qui peut être :
- La photo d'une recette (livre de cuisine, fiche manuscrite, magazine, écran).
- La photo d'un plat préparé.
- La photo d'ingrédients ou du contenu d'un frigo/placard.

${promptText ? `Information ou consigne complémentaire: "${promptText}"` : ''}

Identifie ou compose la recette correspondante de façon détaillée, exacte et appétissante.

Retourne uniquement un objet JSON suivant ce format exact:
{
  "nom": "Nom du plat",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "saison": "ete | hiver | toute_annee",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Ingrédient" }
  ],
  "instructions": [
    { "titre": "Étape 1", "texte": "Description claire de la préparation..." }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: cleanBase64,
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("L'IA n'a pas pu analyser l'image.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erreur lors de l'analyse d'image:", error);
    return null;
  }
}
