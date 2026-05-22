import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '../../../utils/logger';
import { fetchGithubRepoFiles, GithubAPIError } from '../../../utils/github';
import { validateLocalFiles, FileData } from '../../../utils/validator';
import { generateCodeReviewStream } from '../../../utils/ai';
import '../../../config/env'; // Trigger environment validation on load

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  Logger.info("Received POST request to /api/analyze");
  
  try {
    const body = await req.json();
    const { type, url, files, githubToken } = body;
    
    let filesData: FileData[] = [];
    let deployedUrl: string | null = null;
    
    if (type === 'github') {
      if (!url) {
        Logger.warn("Missing GitHub URL in request");
        return NextResponse.json({ error: "Missing GitHub URL" }, { status: 400 });
      }
      
      const githubResult = await fetchGithubRepoFiles(url, githubToken);
      filesData = githubResult.files;
      deployedUrl = githubResult.homepage;
      
    } else if (type === 'local') {
      if (!files || !Array.isArray(files)) {
        Logger.warn("Missing files array in local upload request");
        return NextResponse.json({ error: "Missing files array" }, { status: 400 });
      }
      
      filesData = validateLocalFiles(files);
      
    } else {
      Logger.warn(`Invalid request type: ${type}`);
      return NextResponse.json({ error: "Invalid type. Must be 'github' or 'local'." }, { status: 400 });
    }
    
    if (filesData.length === 0) {
      Logger.warn("No readable code files found to analyze");
      return NextResponse.json({ error: "No readable files found. Ensure you uploaded source code and not just binaries/lockfiles." }, { status: 400 });
    }
    
    const stream = await generateCodeReviewStream(filesData, deployedUrl);
    
    Logger.info("Starting AI stream response...");
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: unknown) {
    Logger.error("Error during code analysis pipeline:", error);
    
    if (error instanceof GithubAPIError) {
      return NextResponse.json({ error: error.message, code: 'GITHUB_API_ERROR' }, { status: error.statusCode });
    }
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: "An unexpected error occurred during analysis" }, { status: 500 });
  }
}
