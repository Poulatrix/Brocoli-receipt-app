export async function parseRecipe(rawText: string) {
  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to parse recipe');
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de l'analyse de la recette via API:", error);
    return null;
  }
}
