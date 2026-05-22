import { GoogleGenAI } from '@google/genai';
import { Logger } from './logger';
import { SYSTEM_PROMPT } from '../config/prompts';
import { FileData } from './validator';

/**
 * Initializes the AI SDK and manages generation requests.
 */
export async function generateCodeReview(filesData: FileData[], deployedUrl: string | null): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let codebaseContext = deployedUrl ? `The user has provided a live deployed URL: ${deployedUrl}\n\n` : "";
  codebaseContext += "Here are the files from the repository:\n\n";
  
  filesData.forEach(file => {
    codebaseContext += `--- FILE: ${file.path} ---\n`;
    codebaseContext += `${file.content}\n\n`;
  });

  Logger.info("Sending payload to Gemini 2.5 Flash...");
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: codebaseContext }] }
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT
    }
  });

  Logger.info("Received review response from Gemini successfully.");
  
  if (!response.text) {
    throw new Error("AI returned an empty response.");
  }
  
  return response.text;
}
