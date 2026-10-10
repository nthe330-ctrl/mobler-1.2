import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({ model: 'gemini-3.7-flash', contents: 'Hello' }).then(res => console.log(res.text)).catch(console.error);
