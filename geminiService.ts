import { GoogleGenAI, Type } from "@google/genai";
import { ThemeId, Difficulty } from "../types";
import { THEMES } from "../constants";

// Lazy init: Maak de client pas aan als we hem nodig hebben.
// Dit voorkomt crashes bij het opstarten van de app als de env var mist.
const getAIClient = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API Key ontbreekt! Zorg dat VITE_API_KEY of API_KEY is ingesteld in .env");
    throw new Error("API Key ontbreekt");
  }
  return new GoogleGenAI({ apiKey: key });
};

// We generate 3 random nouns/concepts for the game based on theme/difficulty
export const generateGameWords = async (
  count: number = 3, 
  themeId: ThemeId, 
  difficulty: Difficulty
): Promise<string[]> => {
  try {
    const ai = getAIClient();
    const themeLabel = THEMES[themeId].label;
    
    let difficultyPrompt = "";
    switch(difficulty) {
        case 'easy': difficultyPrompt = "Zeer eenvoudige, alledaagse woorden die iedereen kent. Ook voor kinderen geschikt."; break;
        case 'medium': difficultyPrompt = "Uitdagende alledaagse bekende woorden."; break;
        case 'hard': difficultyPrompt = "Moeilijke, abstracte of specifieke woorden. Echt voor gevorderden."; break;
    }

    const prompt = `Genereer ${count} unieke, creatieve Nederlandse zelfstandige naamwoorden voor een hints-spel (zoals 30 Seconds).
    
    Context:
    - Thema: ${themeLabel}
    - Niveau: ${difficulty} (${difficultyPrompt})
    
    Regels:
    1. Geen eenvoudige duplicaten.
    2. Mix van categorieën passend bij het thema.
    3. Het woord moet in het Nederlands zijn.
    4. Als het thema 'Standaard winter herfst of zomer' is, mag het overal over gaan.
    
    Geef ALLEEN een JSON array van strings terug.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return ["Fout", "Bij", "Laden"]; // Fallback
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Theme specific fallbacks
    if (themeId === 'christmas') return ["Kerstbal", "Slee", "Rudolph"];
    if (themeId === 'summer') return ["Zon", "Strandbal", "Ijsje"];
    return ["Fiets", "Kaas", "Tulp"]; // Fallback
  }
};