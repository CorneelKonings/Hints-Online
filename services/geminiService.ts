import { GoogleGenAI, Type } from "@google/genai";
import { ThemeId, Difficulty } from "../types";
import { THEMES } from "../constants";

// Lazy init: Maak de client pas aan als we hem nodig hebben.
const getAIClient = () => {
  const key = process.env.API_KEY;
  if (!key) {
    // Geen error gooien hier, we vallen terug op de offline lijsten
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

// --- OFFLINE BACKUP LISTS (Fallback when AI fails or key is missing) ---
const FALLBACK_WORDS: Record<ThemeId, string[]> = {
  standard: [
    "Fiets", "Pannenkoek", "Gitaar", "Vliegtuig", "Olifant", "Kasteel", "Computer", "Pizza", 
    "Sleutel", "Tandenborstel", "Koffie", "Paraplu", "Giraffe", "Microfoon", "Spiegel", "Rugzak",
    "Zonnebril", "Bioscoop", "Chocolade", "Voetbal", "Klok", "Telefoon", "Schoen", "Krant", "Trein"
  ],
  christmas: [
    "Kerstbal", "Rudolph", "Kerstman", "Sneeuwpop", "Kerstboom", "Cadeautje", "Slee", "Openhaard",
    "Noordpool", "Elf", "Kerstmuts", "Stal", "Ster", "Glühwein", "Kalkoen", "Kerstkrans", "Kaars",
    "Kerststol", "Sneeuwvlok", "Schoorsteen", "Kerstdiner", "Lichtjes", "Kerstkaart", "Engel"
  ],
  summer: [
    "Zon", "Strand", "Ijsje", "Zwembad", "Zonnebrand", "BBQ", "Cocktail", "Vakantie", 
    "Kamperen", "Mug", "Tent", "Caravan", "Badlaken", "Teenslippers", "Zonnebril", "Palmboom",
    "Schelp", "Zandkasteel", "Zwemband", "Picknick", "Hangmat", "Parasol", "Watermeloen"
  ],
  winter: [
    "Sneeuw", "Ijsbeer", "Schaatsen", "Wanten", "Sjaal", "Warme Chocomel", "Openhaard", "Iglo",
    "Snert", "Winterjas", "Sneeuwbal", "Skiën", "Snowboard", "Haardvuur", "Dekentje", "Kachel",
    "Stamppot", "Oliebol", "Vuurwerk", "Muts", "Ijspegel", "Sneeuwstorm", "Pinguïn"
  ],
  autumn: [
    "Herfstblad", "Regen", "Paraplu", "Paddenstoel", "Egel", "Wind", "Storm", "Kastanje",
    "Eikel", "Pompoen", "Spin", "Laarzen", "Boswandeling", "Warme Trui", "Thee", "Halloween",
    "Eekhoorn", "Denappel", "Bladeren", "Regenjas", "Mist", "Vogelverschrikker"
  ]
};

// We generate 3 random nouns/concepts for the game based on theme/difficulty
export const generateGameWords = async (
  count: number = 3, 
  themeId: ThemeId, 
  difficulty: Difficulty,
  excludeWords: string[] = [] // History of words to avoid duplicates
): Promise<string[]> => {
  const fallbackList = FALLBACK_WORDS[themeId] || FALLBACK_WORDS.standard;
  
  // Helper to get random words from fallback
  const getFallbackWords = (cnt: number) => {
    // Filter out words we already used if possible
    let available = fallbackList.filter(w => !excludeWords.includes(w));
    // If we ran out of unique words, just use the full list
    if (available.length < cnt) available = fallbackList;
    
    // Shuffle
    const shuffled = available.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, cnt);
  };

  try {
    const ai = getAIClient();
    if (!ai) return getFallbackWords(count);

    const themeLabel = THEMES[themeId].label;
    
    let difficultyPrompt = "";
    switch(difficulty) {
        case 'easy': difficultyPrompt = "Zeer eenvoudige, concrete voorwerpen."; break;
        case 'medium': difficultyPrompt = "Alledaagse begrippen en voorwerpen."; break;
        case 'hard': difficultyPrompt = "Abstracte concepten, spreekwoorden of specifieke voorwerpen."; break;
    }

    const prompt = `Genereer ${count} unieke, creatieve Nederlandse zelfstandige naamwoorden voor het spel '30 Seconds'.
    
    Context:
    - Thema: ${themeLabel}
    - Niveau: ${difficulty} (${difficultyPrompt})
    - Random Seed: ${Date.now()}
    
    Regels:
    1. Het woord moet in het Nederlands zijn.
    2. Geen woorden uit deze lijst: ${JSON.stringify(excludeWords.slice(-20))}.
    3. Geef ALLEEN een JSON array van strings terug.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 1.0, // High creativity
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return getFallbackWords(count);
    
    const words = JSON.parse(text) as string[];
    if (!Array.isArray(words) || words.length === 0) return getFallbackWords(count);
    
    return words;
  } catch (error) {
    console.error("Gemini API Error (using fallback):", error);
    return getFallbackWords(count);
  }
};