import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API: Text parse
  app.post("/api/parse", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText) {
        return res.status(400).json({ error: "Texte manquant" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY non configurée" });
      }

      const responseData = await ai.models.generateContent({
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

      if (!responseData.text) {
        return res.status(500).json({ error: "Réponse vide de Gemini" });
      }

      return res.json(JSON.parse(responseData.text));
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ error: error?.message || "Erreur lors de l'analyse" });
    }
  });

  // API: Generate recipe from title / meal idea
  app.post("/api/generate-from-title", async (req, res) => {
    try {
      const { title, hint } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Titre du plat manquant" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY non configurée" });
      }

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

      const responseData = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!responseData.text) {
        return res.status(500).json({ error: "Réponse vide de Gemini" });
      }

      return res.json(JSON.parse(responseData.text));
    } catch (error: any) {
      console.error("Gemini Generate Recipe Error:", error);
      return res.status(500).json({ error: error?.message || "Erreur lors de la génération" });
    }
  });

  // API: Image parse (Photo analysis)
  app.post("/api/parse-image", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", promptText } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image manquante" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY non configurée" });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

      const prompt = `Tu es un chef cuisinier expert et un numériseur de recettes.
Analyse l'image fournie qui peut être :
- La photo d'une recette (livre de cuisine, fiche manuscrite, magazine, écran).
- La photo d'un plat préparé.
- La photo d'ingrédients ou du contenu d'un frigo/placard.

${promptText ? `Information ou consigne complémentaire de l'utilisateur: "${promptText}"` : ''}

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

      const responseData = await ai.models.generateContent({
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

      if (!responseData.text) {
        return res.status(500).json({ error: "Réponse vide de Gemini" });
      }

      return res.json(JSON.parse(responseData.text));
    } catch (error: any) {
      console.error("Gemini Image API Error:", error);
      return res.status(500).json({ error: error?.message || "Erreur lors de l'analyse de l'image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
