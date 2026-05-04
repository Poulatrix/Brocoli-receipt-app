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

  const { rawText } = request.body;

  if (!rawText) {
    return response.status(400).json({ error: 'Missing rawText' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const responseData = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
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

    if (!responseData.text) return response.status(500).json({ error: 'Empty response from Gemini' });
    return response.status(200).json(JSON.parse(responseData.text));
  } catch (error) {
    console.error("Gemini API Error:", error);
    return response.status(500).json({ error: 'Failed to parse recipe' });
  }
}
