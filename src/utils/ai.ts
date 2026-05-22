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
  
  const MAX_RETRIES = 3;
  let attempt = 0;
  let stream: any;

  while (attempt < MAX_RETRIES) {
    try {
      stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: codebaseContext }] }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT
        }
      });
      break; // Success, exit retry loop
    } catch (err: any) {
      attempt++;
      const errorMessage = err.message || "";
      Logger.warn(`Gemini API Attempt ${attempt} failed: ${errorMessage}`);

      // If it's a 503 (Unavailable) or 429 (Too Many Requests), we retry
      if (errorMessage.includes("503") || errorMessage.includes("429") || errorMessage.includes("UNAVAILABLE")) {
        if (attempt >= MAX_RETRIES) {
          throw new Error("Google Gemini AI is currently overloaded or you have hit your rate limit. Please wait a minute and try again.");
        }
        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = Math.pow(2, attempt) * 1000;
        Logger.info(`Waiting ${backoffMs}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        // If it's some other error (e.g., auth failure, bad request), throw immediately
        throw new Error("Failed to communicate with Gemini AI: " + (err.message || "Unknown error"));
      }
    }
  }

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
