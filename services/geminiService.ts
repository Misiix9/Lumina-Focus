
import { GoogleGenAI, Type } from "@google/genai";
import { Language, AiAnalysis, QuizQuestion, Flashcard, Quest, ConceptMapData, Boss, ExamQuestion } from "../types";
import { BOSS_TEMPLATES } from "../constants";

let dynamicApiKey: string = "";

export const setApiKey = (key: string) => {
    dynamicApiKey = key;
};

const getClient = () => {
    const key = dynamicApiKey || process.env.API_KEY;
    if (!key) throw new Error("Gemini API Key Missing. Please configure it in settings.");
    return new GoogleGenAI({ apiKey: key });
}

// 1. Analyze Session & Generate Report
export const analyzeSession = async (subject: string, notes: string, duration: number, language: Language): Promise<AiAnalysis> => {
  try {
    const ai = getClient();
    const prompt = `
      Analyze these study notes for the subject "${subject}". 
      Duration: ${duration} minutes.
      Notes: "${notes}"
      
      Provide a structured analysis in JSON.
      - Summary: A 1-sentence summary.
      - Score: 0-100 based on depth and detail relative to duration.
      - Grade: S (Excellent), A, B, C, D.
      - KeyTakeaways: Array of 3 short bullet points.
      
      Language: ${language === Language.HU ? 'Hungarian' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                score: { type: Type.INTEGER },
                grade: { type: Type.STRING, enum: ["S", "A", "B", "C", "D"] },
                keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        }
      }
    });

    return JSON.parse(response.text!) as AiAnalysis;
  } catch (error) {
    console.error("AI Analysis failed", error);
    return {
      summary: language === Language.HU ? "Sikeres tanulás!" : "Good session!",
      score: 80,
      grade: 'B',
      keyTakeaways: ["Focus maintained", "Topics covered", "Progress recorded"]
    };
  }
};

// 2. Generate Quiz
export const generateQuiz = async (subject: string, notes: string, language: Language): Promise<QuizQuestion[]> => {
    try {
        const ai = getClient();
        const prompt = `
          Create a 3-question multiple choice quiz based on these study notes: "${notes}" for subject "${subject}".
          Language: ${language === Language.HU ? 'Hungarian' : 'English'}
        `;
    
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.INTEGER, description: "Index of correct option (0-3)" }
                    }
                }
            }
          }
        });
    
        return JSON.parse(response.text!) as QuizQuestion[];
    } catch (error) {
        return [];
    }
}

// 3. Generate Flashcards
export const generateFlashcards = async (subject: string, notes: string, language: Language): Promise<Flashcard[]> => {
  try {
    const ai = getClient();
    const prompt = `
      Create 4 study flashcards based on: "${notes}" for subject "${subject}".
      Keep fronts concise and backs informative.
      Language: ${language === Language.HU ? 'Hungarian' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                }
            }
        }
      }
    });

    return JSON.parse(response.text!) as Flashcard[];
  } catch (error) {
    return [];
  }
};

// 4. Generate Daily Quests
export const generateDailyQuests = async (userLevel: number, language: Language): Promise<Quest[]> => {
  const quests: Quest[] = [
    {
      id: Date.now() + '1',
      description: language === Language.HU ? 'Tanulj 45 percet' : 'Study for 45 minutes',
      target: 45,
      progress: 0,
      type: 'minutes',
      isCompleted: false,
      xpReward: 50 + (userLevel * 10)
    },
    {
      id: Date.now() + '2',
      description: language === Language.HU ? 'Végezz el 2 tanulási szakaszt' : 'Complete 2 study sessions',
      target: 2,
      progress: 0,
      type: 'sessions',
      isCompleted: false,
      xpReward: 100
    },
    {
      id: Date.now() + '3',
      description: language === Language.HU ? 'Szerezz S értékelést' : 'Achieve an S Grade',
      target: 1,
      progress: 0,
      type: 'score',
      isCompleted: false,
      xpReward: 200
    }
  ];
  return quests;
};

// 5. Explain Concept
export const explainConcept = async (concept: string, language: Language): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      Explain the concept "${concept}" in simple terms, like I am 12 years old.
      Use analogies. Keep it under 150 words.
      Language: ${language === Language.HU ? 'Hungarian' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not explain concept.";
  } catch (error) {
    return "AI Service Unavailable.";
  }
};

// 6. Generate Study Plan
export const generateStudyPlan = async (goal: string, language: Language): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      Create a bullet-point study plan based on this goal: "${goal}".
      Break it down into actionable steps.
      Language: ${language === Language.HU ? 'Hungarian' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate plan.";
  } catch (error) {
    return "AI Service Unavailable.";
  }
};

// 7. Grade Essay
export const gradeEssay = async (essay: string, language: Language): Promise<{grade: string, feedback: string}> => {
    try {
        const ai = getClient();
        const prompt = `
          Grade the following essay text. Provide a letter grade (A-F) and brief constructive feedback.
          Essay: "${essay.substring(0, 2000)}"
          Language: ${language === Language.HU ? 'Hungarian' : 'English'}
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.STRING },
                        feedback: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text!) as {grade: string, feedback: string};
    } catch (e) {
        return { grade: "N/A", feedback: "AI Error" };
    }
}

// 8. Generate Podcast Script
export const generatePodcastScript = async (topic: string, language: Language): Promise<string> => {
    try {
        const ai = getClient();
        const prompt = `
          Write a short podcast dialogue (approx 2 minutes) between two hosts, Alex and Sam, discussing "${topic}".
          Make it engaging and educational.
          Language: ${language === Language.HU ? 'Hungarian' : 'English'}
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text || "";
    } catch (e) { return ""; }
}

// 9. Generate Concept Map
export const generateConceptMap = async (topic: string, language: Language): Promise<ConceptMapData> => {
    try {
        const ai = getClient();
        const prompt = `
          Create a concept map for "${topic}". Return a JSON with nodes (id, label) and edges (from, to).
          Limit to 8 nodes.
          Language: ${language === Language.HU ? 'Hungarian' : 'English'}
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, label: {type: Type.STRING}, x: {type: Type.INTEGER}, y: {type: Type.INTEGER} } } },
                        edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { from: {type: Type.STRING}, to: {type: Type.STRING} } } }
                    }
                }
            }
        });
        return JSON.parse(response.text!) as ConceptMapData;
    } catch (e) { return { nodes: [], edges: [] }; }
}

// 10. Generate Boss
export const generateBoss = async (subject: string, level: number): Promise<Boss> => {
    // Simplified to use templates + random variation, or AI if needed. 
    // For speed, we'll just modify a template.
    const template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
    return {
        ...template,
        id: Date.now().toString(),
        hp: template.maxHp * level,
        maxHp: template.maxHp * level,
        level: level
    };
}

// 11. Generate Exam Simulator
export const generateExam = async (topic: string, language: Language): Promise<ExamQuestion[]> => {
    try {
        const ai = getClient();
        const prompt = `
          Create a challenging 3-question exam for the topic: "${topic}".
          Questions should test deep understanding.
          Return JSON.
          Language: ${language === Language.HU ? 'Hungarian' : 'English'}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.INTEGER },
                        question: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["multiple_choice"] },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
          }
        });

        return JSON.parse(response.text!) as ExamQuestion[];
    } catch (e) {
        return [];
    }
}
