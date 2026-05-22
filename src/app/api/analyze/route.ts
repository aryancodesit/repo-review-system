import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// The SDK will be initialized inside the POST handler to avoid build-time warnings


const SYSTEM_PROMPT = "You are an expert AI code reviewer and system architect. Your job is to analyze the provided codebase (either a GitHub repo or uploaded files) and generate a comprehensive review report.\n\n" +
"CRITICAL INSTRUCTION: You MUST output the report in EXACTLY the format below. Do not change the markdown structure, the table columns, or the section headers. Fill in the content dynamically based on your analysis of the codebase.\n\n" +
"=== EXACT FORMAT TO FOLLOW ===\n\n" +
"# 🕵️ [Project Name/Title] — User Review\n\n" +
"> **Reviewed by:** AI Code Analyzer  \n" +
"> **Platform:** [Target platform, e.g., Web, Node.js, Next.js, Python, etc.]  \n" +
"> **Stack:** [List key technologies found in the code, e.g., Next.js · React · TailwindCSS · Supabase]  \n" +
"> **Review type:** End-to-end Codebase & Architecture Review  \n\n" +
"---\n\n" +
"## 📊 Ratings at a Glance\n\n" +
"| # | Category | Score | Verdict |\n" +
"|---|----------|:-----:|---------|\n" +
"| 1 | Architecture & Structure | [X]/10 | [Short phrase, e.g., Clean & scalable] |\n" +
"| 2 | Code Quality & Readability | [X]/10 | [Short phrase] |\n" +
"| 3 | Security & Best Practices | [X]/10 | [Short phrase] |\n" +
"| 4 | Performance Optimization | [X]/10 | [Short phrase] |\n" +
"| 5 | Error Handling & Logging | [X]/10 | [Short phrase] |\n\n" +
"### 🏆 Overall Score: **[X.X] / 10**\n\n" +
"---\n\n" +
"## 1. Architecture & Structure — `[X]/10`\n\n" +
"**Overview:** [Brief 1-2 sentence description of the overall architecture pattern]\n\n" +
"### ✅ What works\n" +
"- [Point 1]\n" +
"- [Point 2]\n" +
"- [Point 3]\n\n" +
"### ⚠️ What could improve\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"---\n\n" +
"## 2. Code Quality & Readability — `[X]/10`\n\n" +
"**Style:** [Brief description of coding style, e.g., Functional, OOP, modular, etc.]\n\n" +
"### ✅ What works\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"### ⚠️ What could improve\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"---\n\n" +
"## 3. Security & Best Practices — `[X]/10`\n\n" +
"### ✅ What works\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"### ⚠️ What could improve\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"---\n\n" +
"## 4. Performance Optimization — `[X]/10`\n\n" +
"### ✅ What works\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"### ⚠️ What could improve\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"---\n\n" +
"## 5. Error Handling & Logging — `[X]/10`\n\n" +
"### ✅ What works\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"### ⚠️ What could improve\n" +
"- [Point 1]\n" +
"- [Point 2]\n\n" +
"---\n\n" +
"## 🐛 Issues Visible to a First-Time Reviewer\n\n" +
"| Severity | Issue | Where |\n" +
"|----------|-------|--------|\n" +
"| [🔴 High / 🟠 Medium / 🟡 Low] | [Description of issue] | [File/Module name] |\n" +
"| [Severity] | [Description] | [Location] |\n" +
"| [Severity] | [Description] | [Location] |\n\n" +
"---\n\n" +
"## 💡 Top 5 Improvements for Next Version\n\n" +
"1. **[Bold Title 1]** — [Explanation]\n" +
"2. **[Bold Title 2]** — [Explanation]\n" +
"3. **[Bold Title 3]** — [Explanation]\n" +
"4. **[Bold Title 4]** — [Explanation]\n" +
"5. **[Bold Title 5]** — [Explanation]\n\n" +
"---\n\n" +
"## 🏁 Final Verdict\n\n" +
"[Provide a comprehensive 2-3 paragraph summary of the project's overall state, its strengths, and the most critical areas needing attention. Be professional but engaging.]\n\n" +
"=== END FORMAT ===\n\n" +
"Analyze the provided files thoroughly and generate the report.";

// Helper to fetch github tree
async function fetchGithubRepoFiles(url: string) {
  // Extract owner and repo from URL
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  
  const owner = match[1];
  const repo = match[2].replace('.git', '');
  
  // Fetch default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoRes.ok) throw new Error("Could not find repository");
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;
  
  // Fetch tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
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
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`);
      const content = await res.text();
      return { path: file.path, content };
    })
  );
  
  return fileContents;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, files } = body;
    
    let filesData = [];
    
    if (type === 'github') {
      if (!url) return NextResponse.json({ error: "Missing GitHub URL" }, { status: 400 });
      filesData = await fetchGithubRepoFiles(url);
    } else if (type === 'local') {
      if (!files || !Array.isArray(files)) return NextResponse.json({ error: "Missing files array" }, { status: 400 });
      filesData = files;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    
    if (filesData.length === 0) {
      return NextResponse.json({ error: "No readable files found" }, { status: 400 });
    }
    
    // Construct the context payload for Gemini
    let codebaseContext = "Here are the files from the repository:\n\n";
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
