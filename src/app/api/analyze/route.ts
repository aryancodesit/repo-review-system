import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// The SDK will be initialized inside the POST handler to avoid build-time warnings

import { SYSTEM_PROMPT } from './prompt';

// Helper to fetch github tree
async function fetchGithubRepoFiles(url: string, githubToken?: string) {
  // Extract owner and repo from URL
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  
  const owner = match[1];
  const repo = match[2].replace('.git', '');
  
  const headers: HeadersInit = {};
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  
  // Fetch default branch and metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (repoRes.status === 403 || repoRes.status === 429) {
    throw new Error("GitHub API rate limit exceeded. Please provide a GitHub Personal Access Token.");
  }
  if (!repoRes.ok) throw new Error("Could not find repository");
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;
  const homepage = repoData.homepage;
  
  // Fetch tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
  if (treeRes.status === 403 || treeRes.status === 429) {
    throw new Error("GitHub API rate limit exceeded. Please provide a GitHub Personal Access Token.");
  }
  if (!treeRes.ok) throw new Error("Could not fetch repository tree");
  const treeData = await treeRes.json();
  
  // Filter for interesting code files, max 30 to avoid payload limits
  const validExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.json', '.html', '.css'];
  const filesToFetch = treeData.tree
    .filter((file: any) => file.type === 'blob')
    .filter((file: any) => validExtensions.some(ext => file.path.endsWith(ext)))
    .filter((file: any) => !file.path.includes('node_modules') && !file.path.includes('.git') && !file.path.includes('package-lock.json'))
    .slice(0, 30); // LIMIT to 30 files for AI context window
    
  const fileContents = await Promise.all(
    filesToFetch.map(async (file: any) => {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`, { headers });
      const content = await res.text();
      return { path: file.path, content };
    })
  );
  
  return { files: fileContents, homepage };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, files, githubToken } = body;
    
    let filesData = [];
    let deployedUrl = null;
    
    if (type === 'github') {
      if (!url) return NextResponse.json({ error: "Missing GitHub URL" }, { status: 400 });
      const githubResult = await fetchGithubRepoFiles(url, githubToken);
      filesData = githubResult.files;
      deployedUrl = githubResult.homepage;
    } else if (type === 'local') {
      if (!files || !Array.isArray(files)) return NextResponse.json({ error: "Missing files array" }, { status: 400 });
      
      // Server-side validation
      const validExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.html', '.css'];
      filesData = files.filter((f: any) => {
        if (!f.path || typeof f.content !== 'string') return false;
        if (f.content.length > 200 * 1024) return false; // Strictly skip anything over 200KB characters on the server
        return validExtensions.some(ext => f.path.endsWith(ext));
      });
      
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    
    if (filesData.length === 0) {
      return NextResponse.json({ error: "No readable files found" }, { status: 400 });
    }
    
    // Construct the context payload for Gemini
    let codebaseContext = deployedUrl ? `The user has provided a live deployed URL: ${deployedUrl}\n\n` : "";
    codebaseContext += "Here are the files from the repository:\n\n";
    filesData.forEach(file => {
      codebaseContext += `--- FILE: ${file.path} ---\n`;
      codebaseContext += `${file.content}\n\n`;
    });
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY environment variable is missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Call Gemini using the new SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + "\n\n" + codebaseContext }] }
      ]
    });
    
    return NextResponse.json({ report: response.text });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred during analysis" }, { status: 500 });
  }
}
