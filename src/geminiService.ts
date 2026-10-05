export interface ParsedRecipeResult {
  nom: string;
  categorie: string;
  saison?: string;
  portions?: number;
  prepMin?: number;
  cuissonMin?: number;
  calories?: number;
  ingredients?: Array<{
    nom: string;
    quantite?: number;
    unite?: string;
  }>;
  instructions?: Array<{
    titre?: string;
    texte: string;
  }>;
  error?: string;
}

/**
 * Safely parse HTTP response, preventing any "Unexpected token '<'" JSON crashes
 * and handling API error messages cleanly.
 */
async function safelyParseResponse(res: Response, defaultErrorMsg: string): Promise<ParsedRecipeResult> {
  const contentType = res.headers.get("content-type") || "";
  let json: any = null;

  if (contentType.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  } else {
    // If response was not JSON (e.g. proxy HTML error page from Cloud Run or gateway)
    const rawText = await res.text().catch(() => "");
    if (rawText.includes("leaked") || rawText.includes("PERMISSION_DENIED")) {
      throw new Error("Votre clé API Gemini doit être renouvelée dans le panneau Paramètres > Secrets d'AI Studio.");
    }
    if (res.status === 413 || rawText.includes("Payload Too Large")) {
      throw new Error("L'image est trop volumineuse pour être envoyée au serveur.");
    }
    throw new Error(defaultErrorMsg);
  }

  if (!json) {
    throw new Error(defaultErrorMsg);
  }

  // Check error indicator in JSON
  if (json.success === false || json.error) {
    const errorMsg = json.error || defaultErrorMsg;
    throw new Error(errorMsg);
  }

  // If payload is wrapped in { success: true, data: { ... } } or root object
  const result: ParsedRecipeResult = json.data || json;
  if (!result || !result.nom) {
    throw new Error("La réponse du serveur ne contient pas de recette exploitable.");
  }

  return result;
}

/**
 * Parses raw text recipe via server API proxy
 */
export async function parseRecipe(rawText: string): Promise<ParsedRecipeResult | null> {
  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });

    return await safelyParseResponse(res, "Erreur lors de l'analyse de la recette.");
  } catch (err: any) {
    console.error("Erreur parseRecipe:", err?.message || err);
    throw err;
  }
}

/**
 * Generates a recipe from a title / meal idea via server API proxy
 */
export async function generateRecipeFromTitle(title: string, hint?: string): Promise<ParsedRecipeResult | null> {
  try {
    const res = await fetch("/api/generate-from-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, hint }),
    });

    return await safelyParseResponse(res, "Erreur lors de la génération de la recette.");
  } catch (err: any) {
    console.error("Erreur generateRecipeFromTitle:", err?.message || err);
    throw err;
  }
}

/**
 * Parses recipe from an image photo via server API proxy
 */
export async function parseRecipeFromImage(
  imageBase64: string, 
  mimeType: string = "image/jpeg", 
  promptText?: string
): Promise<ParsedRecipeResult | null> {
  try {
    const res = await fetch("/api/parse-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType, promptText }),
    });

    return await safelyParseResponse(res, "Erreur lors de l'analyse de l'image.");
  } catch (err: any) {
    console.error("Erreur parseRecipeFromImage:", err?.message || err);
    throw err;
  }
}
