import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseRecipe(rawText: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse et convertis ce texte de recette de cuisine en un objet JSON structuré en français. 
      Si le texte est succinct, développe les instructions pour qu'elles soient claires.
      
      Texte source: "${rawText}"
      
      Retourne uniquement un objet JSON suivant ce format exact:
      {
        "nom": "Nom de la recette",
        "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
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
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erreur lors de l'analyse de la recette:", error);
    return null;
  }
}
