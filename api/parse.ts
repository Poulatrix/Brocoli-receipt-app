import dotenv from "dotenv";
dotenv.config({ override: true });

import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];

function getGenAI() {
  return new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

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
    const genAI = getGenAI();
    let responseData: any = null;
    let lastErr: any = null;

    for (const model of GEMINI_MODELS) {
      try {
        responseData = await genAI.models.generateContent({
          model,
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
        if (responseData?.text) break;
      } catch (err: any) {
        lastErr = err;
        const isAuthOrLeaked = err?.message?.includes("leaked") || err?.message?.includes("PERMISSION_DENIED") || err?.status === 403;
        if (isAuthOrLeaked) throw err;
      }
    }

    if (!responseData?.text && lastErr) throw lastErr;
    if (!responseData?.text) return response.status(200).json({ success: false, error: 'Empty response from Gemini' });

    const cleanJson = responseData.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleanJson);
    return response.status(200).json({ success: true, data: parsed, ...parsed });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const isLeakedOrAuth = error?.message?.includes("leaked") || error?.message?.includes("PERMISSION_DENIED") || error?.status === 403;
    const userMessage = isLeakedOrAuth
      ? "Votre clé API Gemini doit être renouvelée dans le panneau Paramètres > Secrets d'AI Studio."
      : (error?.message || 'Failed to parse recipe');
    return response.status(200).json({ success: false, error: userMessage, isLeakedKey: isLeakedOrAuth });
  }
}
