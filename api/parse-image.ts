import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType = 'image/jpeg', promptText } = request.body;

  if (!imageBase64) {
    return response.status(400).json({ error: 'Missing imageBase64' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const prompt = `Tu es un chef cuisinier expert et un numériseur de recettes.
Analyse l'image fournie qui peut être :
- La photo d'une recette (livre de cuisine, manuscrit, magazine, écran).
- La photo d'un plat préparé.
- La photo d'ingrédients ou du contenu d'un frigo/placard.

${promptText ? `Information ou consigne complémentaire: "${promptText}"` : ''}

Identifie ou compose la recette correspondante de façon détaillée, exacte et appétissante.

Retourne uniquement un objet JSON suivant ce format exact:
{
  "nom": "Nom du plat",
  "categorie": "Viande | Poisson | Végétarien | Pâtes | Soupe | Dessert | Entrée | Autre",
  "portions": 4,
  "prepMin": 15,
  "cuissonMin": 20,
  "calories": 450,
  "ingredients": [
    { "quantite": 200, "unite": "g", "nom": "Ingrédient" }
  ],
  "instructions": [
    { "titre": "Étape 1", "texte": "Description claire..." }
  ]
}`;

    const responseData = await genAI.models.generateContent({
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

    if (!responseData.text) return response.status(500).json({ error: 'Empty response from Gemini' });
    return response.status(200).json(JSON.parse(responseData.text));
  } catch (error) {
    console.error("Gemini API Image Error:", error);
    return response.status(500).json({ error: 'Failed to analyze recipe photo' });
  }
}
