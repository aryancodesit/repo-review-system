import { GoogleGenAI } from '@google/genai';
import { Logger } from './logger';
import { SYSTEM_PROMPT } from '../config/prompts';
import { FileData } from './validator';

/**
 * Initializes the AI SDK and manages generation requests, returning a stream.
 */
export async function generateCodeReviewStream(filesData: FileData[], deployedUrl: string | null): Promise<ReadableStream> {
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

  Logger.info("Sending payload to Gemini 2.5 Flash (Streaming)...");
  
  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: codebaseContext }] }
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT
    }
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.text) {
            controller.enqueue(new TextEncoder().encode(chunk.text));
          }
        }
      } catch (err) {
        Logger.error("Stream error:", err);
        controller.error(err);
      } finally {
        Logger.info("Stream completely sent to client.");
        controller.close();
      }
    }
  });
}
