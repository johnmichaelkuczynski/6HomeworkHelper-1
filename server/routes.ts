import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { processAssignmentSchema, emailSolutionSchema, type ProcessAssignmentRequest, type ProcessAssignmentResponse, type EmailSolutionRequest, type AssignmentListItem } from "@shared/schema";
import { ZodError } from "zod";
import Tesseract from "tesseract.js";
import pdf2json from "pdf2json";
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// LLM imports
// @ts-ignore
import Anthropic from "@anthropic-ai/sdk";
// @ts-ignore
import OpenAI from "openai";
// @ts-ignore
import sgMail from "@sendgrid/mail";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize LLM clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || "default_key",
});

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

async function performOCR(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: m => console.log(m)
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // First try pdf2json
    const result = await new Promise<string>((resolve, reject) => {
      const pdfParser = new pdf2json();
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(new Error('PDF parsing failed'));
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          let text = '';
          if (pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    for (const textRun of textItem.R) {
                      if (textRun.T) {
                        text += decodeURIComponent(textRun.T) + ' ';
                      }
                    }
                  }
                }
              }
            }
          }
          resolve(text.trim());
        } catch (error) {
          reject(new Error('Failed to process PDF data'));
        }
      });
      
      pdfParser.parseBuffer(buffer);
    });
    
    if (result && result.trim()) {
      return result;
    }
    
    throw new Error('No text extracted');
  } catch (error) {
    // Fallback: instruct user to use alternative format
    console.error('PDF processing error:', error);
    throw new Error('PDF processing failed. Please save your PDF as a Word document (.docx) or take a screenshot and upload as an image (.png/.jpg) for better text extraction.');
  }
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    // Use mammoth for .docx files
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word document parsing error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

// Helper function to clean HTML and formatting from text
function cleanResponse(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/#{1,6}\s*/g, '') // Headers
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Code blocks
    // Clean up multiple line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function processWithAnthropic(text: string): Promise<string> {
  try {
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const message = await anthropic.messages.create({
      max_tokens: 4000,
      messages: [{ 
        role: 'user', 
        content: `Solve this homework assignment. Provide a clear, step-by-step solution with proper mathematical notation where applicable. Write in plain text only - do not use any HTML, markdown formatting, headers (###), bold (**text**), italics (*text*), bullet points, or special characters for formatting. Use only regular text with line breaks for organization. Do not add commentary or explanations beyond what is needed to solve the problem:\n\n${text}` 
      }],
      model: 'claude-3-7-sonnet-20250219',
    });

    const response = message.content[0]?.type === 'text' ? message.content[0].text : 'No response generated';
    return cleanResponse(response);
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw new Error('Failed to process with Anthropic');
  }
}

async function processWithOpenAI(text: string): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ 
        role: "user", 
        content: `Solve this homework assignment. Provide a clear, step-by-step solution with proper mathematical notation where applicable. Write in plain text only - do not use any HTML, markdown formatting, headers (###), bold (**text**), italics (*text*), bullet points, or special characters for formatting. Use only regular text with line breaks for organization. Do not add commentary or explanations beyond what is needed to solve the problem:\n\n${text}` 
      }],
      max_tokens: 4000,
    });

    const responseText = response.choices[0]?.message?.content || 'No response generated';
    return cleanResponse(responseText);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to process with OpenAI');
  }
}

async function processWithPerplexity(text: string): Promise<string> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || process.env.VITE_PERPLEXITY_API_KEY || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: `Solve this homework assignment. Provide a clear, step-by-step solution with proper mathematical notation where applicable. Write in plain text only - do not use any markdown formatting, headers (###), bold (**text**), italics (*text*), bullet points, or special characters for formatting. Use only regular text with line breaks for organization. Do not add commentary or explanations beyond what is needed to solve the problem:\n\n${text}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || 'No response generated';
    return cleanResponse(responseText);
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw new Error('Failed to process with Perplexity');
  }
}

async function checkAIDetection(text: string): Promise<any> {
  if (!process.env.GPTZERO_API_KEY) {
    return { probability: 0, message: 'AI detection not configured' };
  }

  const response = await fetch('https://api.gptzero.me/v2/predict/text', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GPTZERO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document: text
    }),
  });

  if (!response.ok) {
    throw new Error(`GPTZero API error: ${response.statusText}`);
  }

  return await response.json();
}

// HTML to PDF conversion using Puppeteer
async function convertHtmlToPdf(htmlContent: string, title: string = 'Assignment Solution'): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set content with proper HTML structure and math rendering
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']]
            },
            chtml: {
                scale: 1,
                minScale: 0.5,
                matchFontHeight: false
            }
        };
    </script>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            margin: 40px;
            background: white;
        }
        h1, h2, h3 {
            color: #000;
            margin-bottom: 16px;
            font-weight: bold;
        }
        .solution-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        @page {
            margin: 0.75in;
            size: letter;
        }
        @media print {
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="solution-content">${htmlContent}</div>
    <script>
        // Wait for MathJax to finish rendering
        if (window.MathJax) {
            window.MathJax.startup.promise.then(() => {
                window.mathJaxReady = true;
            });
        } else {
            window.mathJaxReady = true;
        }
    </script>
</body>
</html>`;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    // Wait for MathJax to render
    await page.waitForTimeout(3000); // Give MathJax time to render
    
    // Generate PDF with high quality settings
    const pdfBuffer = await page.pdf({
      format: 'letter',
      margin: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
        right: '0.75in'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('HTML to PDF conversion error:', error);
    throw new Error('Failed to convert HTML to PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// PDF Generation function using LaTeX/Tectonic
async function generatePDF(content: string, title: string = 'Assignment Solution', extractedText?: string): Promise<Buffer> {
  const tempId = randomBytes(16).toString('hex');
  const tempDir = path.join('/tmp', `latex_${tempId}`);
  const texFile = path.join(tempDir, 'document.tex');
  const pdfFile = path.join(tempDir, 'document.pdf');

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Escape LaTeX special characters in content
    const escapedContent = content
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/%/g, '\\%')
      .replace(/&/g, '\\&')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/_/g, '\\_')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}');

    const escapedExtractedText = extractedText ? extractedText
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/%/g, '\\%')
      .replace(/&/g, '\\&')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/_/g, '\\_')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}') : '';

    // Create LaTeX document
    const latexContent = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{geometry}
\\usepackage{fancyhdr}

\\geometry{letterpaper, margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{${new Date().toLocaleDateString()}}
\\lhead{Assignment Solution}
\\cfoot{\\thepage}

\\title{${title}}
\\author{AI-Generated Solution}
\\date{${new Date().toLocaleDateString()}}

\\begin{document}

\\maketitle

${extractedText ? `
\\section{Problem Statement}
\\begin{quote}
${escapedExtractedText}
\\end{quote}

` : ''}
\\section{Solution}

${escapedContent}

\\end{document}`;

    // Write LaTeX file
    fs.writeFileSync(texFile, latexContent, 'utf8');

    // Compile with tectonic
    execSync(`cd ${tempDir} && tectonic document.tex`, {
      stdio: 'pipe',
      timeout: 30000
    });

    // Read the generated PDF
    const pdfBuffer = fs.readFileSync(pdfFile);

    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { llmProvider } = req.body;
      if (!llmProvider || !['anthropic', 'openai', 'perplexity'].includes(llmProvider)) {
        return res.status(400).json({ error: "Invalid LLM provider" });
      }

      const startTime = Date.now();
      
      // Extract text from uploaded file
      let extractedText = '';
      const fileName = req.file.originalname;
      const fileType = req.file.mimetype;

      if (fileType.startsWith('image/')) {
        extractedText = await performOCR(req.file.buffer, fileName);
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileType === 'application/msword' ||
                 fileName.toLowerCase().endsWith('.docx') ||
                 fileName.toLowerCase().endsWith('.doc')) {
        extractedText = await extractTextFromWord(req.file.buffer);
      } else if (fileType === 'application/pdf') {
        extractedText = await extractTextFromPDF(req.file.buffer);
      } else {
        return res.status(400).json({ error: "File type not supported yet. Please use images or Word documents." });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ error: "No text could be extracted from the file" });
      }

      // Process with selected LLM
      let llmResponse = '';
      switch (llmProvider) {
        case 'anthropic':
          llmResponse = await processWithAnthropic(extractedText);
          break;
        case 'openai':
          llmResponse = await processWithOpenAI(extractedText);
          break;
        case 'perplexity':
          llmResponse = await processWithPerplexity(extractedText);
          break;
      }

      const processingTime = Date.now() - startTime;

      // Don't auto-save assignment

      const response: ProcessAssignmentResponse = {
        id: Date.now(), // Generate a temporary ID for the response
        extractedText,
        llmResponse,
        processingTime,
        success: true,
      };

      res.json(response);
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process upload" 
      });
    }
  });

  // Save assignment endpoint
  app.post("/api/save-assignment", async (req, res) => {
    try {
      const { inputText, title, specialInstructions } = req.body;
      
      if (!inputText) {
        return res.status(400).json({ error: "Input text is required" });
      }

      const assignment = await storage.createAssignment({
        inputText,
        inputType: 'text',
        fileName: title || null,
        extractedText: null,
        llmProvider: 'saved',
        llmResponse: '',
        processingTime: 0,
      });

      res.json({ 
        success: true, 
        id: assignment.id,
        message: "Assignment saved successfully"
      });
    } catch (error) {
      console.error('Save assignment error:', error);
      res.status(500).json({ error: "Failed to save assignment" });
    }
  });

  // Text processing endpoint
  app.post("/api/process-text", async (req, res) => {
    try {
      const { inputText, llmProvider } = processAssignmentSchema.parse(req.body);

      if (!inputText) {
        return res.status(400).json({ error: "Input text is required" });
      }

      const startTime = Date.now();

      // Process with selected LLM
      let llmResponse = '';
      switch (llmProvider) {
        case 'anthropic':
          llmResponse = await processWithAnthropic(inputText);
          break;
        case 'openai':
          llmResponse = await processWithOpenAI(inputText);
          break;
        case 'perplexity':
          llmResponse = await processWithPerplexity(inputText);
          break;
      }

      const processingTime = Date.now() - startTime;

      // Store assignment
      const assignment = await storage.createAssignment({
        inputText,
        inputType: 'text',
        fileName: null,
        extractedText: null,
        llmProvider,
        llmResponse,
        processingTime,
      });

      const response: ProcessAssignmentResponse = {
        id: assignment.id,
        extractedText: inputText,
        llmResponse,
        processingTime,
        success: true,
      };

      res.json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      
      console.error('Text processing error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process text" 
      });
    }
  });

  // Get all assignments
  app.get("/api/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAllAssignments();
      const assignmentList: AssignmentListItem[] = assignments.map(assignment => ({
        id: assignment.id,
        extractedText: assignment.extractedText,
        llmProvider: assignment.llmProvider,
        processingTime: assignment.processingTime || 0,
        createdAt: assignment.createdAt?.toISOString() || new Date().toISOString(),
        fileName: assignment.fileName,
      }));
      
      res.json(assignmentList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Get assignment by ID
  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  // Extract text from file endpoint (no LLM processing)
  app.post("/api/extract-text", upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let extractedText = "";
      const fileName = file.originalname.toLowerCase();
      
      if (fileName.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(file.buffer);
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        extractedText = await extractTextFromWord(file.buffer);
      } else if (fileName.match(/\.(png|jpg|jpeg)$/)) {
        extractedText = await performOCR(file.buffer, fileName);
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF, Word document, or image file." });
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: "No text could be extracted from the file" });
      }

      res.json({ 
        extractedText: extractedText.trim(),
        fileName: file.originalname 
      });
    } catch (error: any) {
      console.error('Text extraction error:', error);
      res.status(500).json({ error: error.message || 'Failed to extract text from file' });
    }
  });

  // Email solution endpoint
  app.post("/api/email-solution", async (req, res) => {
    try {
      const { email, content, title } = req.body;

      if (!email || !content) {
        return res.status(400).json({ error: "Email and content are required" });
      }

      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_VERIFIED_SENDER) {
        return res.status(500).json({ error: "Email service not configured" });
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || 'Homework Solution'}</title>
          <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
          <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
          <script>
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true
              }
            };
          </script>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1, h2 { color: #2563eb; }
            .solution-section { margin-top: 20px; }
            .math-content { white-space: pre-wrap; word-wrap: break-word; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${title || 'Homework Solution'}</h1>
          
          <div class="solution-section">
            <div class="math-content">${content}</div>
          </div>
          
          <div class="footer">
            <p>This solution was generated by the AI Homework Assistant.</p>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: email,
        from: process.env.SENDGRID_VERIFIED_SENDER,
        subject: title || 'Your Homework Solution',
        html: htmlContent,
      };

      await sgMail.send(msg);
      
      res.json({ success: true, message: 'Solution sent successfully!' });
    } catch (error: any) {
      console.error('Email sending error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to send email" 
      });
    }
  });

  // AI detection endpoint
  app.post("/api/ai-detection", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await checkAIDetection(text);
      res.json(result);
    } catch (error: any) {
      console.error('AI detection error:', error);
      res.status(500).json({ error: error.message || 'AI detection failed' });
    }
  });

  // HTML to PDF conversion endpoint
  app.post("/api/html-to-pdf", async (req, res) => {
    try {
      const { htmlContent, title } = req.body;
      
      if (!htmlContent || typeof htmlContent !== 'string') {
        return res.status(400).json({ error: "HTML content is required" });
      }

      const pdfBuffer = await convertHtmlToPdf(htmlContent, title);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title || 'assignment'}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('HTML to PDF conversion error:', error);
      res.status(500).json({ error: error.message || 'Failed to convert HTML to PDF' });
    }
  });

  // PDF generation endpoint (LaTeX fallback)
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { content, title, extractedText } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Content is required" });
      }

      const pdfBuffer = await generatePDF(content, title, extractedText);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title || 'assignment'}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate PDF' });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, provider, context } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      let chatPrompt = message;
      if (context) {
        chatPrompt = `Context: I'm working on this problem: "${context.problem}" and got this solution: "${context.solution}"\n\nQuestion: ${message}`;
      }

      let response = '';
      switch (provider) {
        case 'anthropic':
          response = await processWithAnthropic(chatPrompt);
          break;
        case 'openai':
          response = await processWithOpenAI(chatPrompt);
          break;
        case 'perplexity':
          response = await processWithPerplexity(chatPrompt);
          break;
        default:
          return res.status(400).json({ error: "Invalid provider" });
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Chat failed' });
    }
  });

  // Chat file upload endpoint
  app.post("/api/chat-upload", upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const { provider, message } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let extractedText = "";
      const fileName = file.originalname.toLowerCase();
      
      if (fileName.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(file.buffer);
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        extractedText = await extractTextFromWord(file.buffer);
      } else if (fileName.match(/\.(png|jpg|jpeg)$/)) {
        extractedText = await performOCR(file.buffer, fileName);
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF, Word document, or image file." });
      }

      let chatPrompt = message ? `${message}\n\nFile content:\n${extractedText}` : `Please analyze this file content:\n\n${extractedText}`;

      let response = '';
      switch (provider) {
        case 'anthropic':
          response = await processWithAnthropic(chatPrompt);
          break;
        case 'openai':
          response = await processWithOpenAI(chatPrompt);
          break;
        case 'perplexity':
          response = await processWithPerplexity(chatPrompt);
          break;
        default:
          return res.status(400).json({ error: "Invalid provider" });
      }

      res.json({ response, extractedText, fileName: file.originalname });
    } catch (error: any) {
      console.error('Chat upload error:', error);
      res.status(500).json({ error: error.message || 'Chat upload failed' });
    }
  });

  // Rewrite endpoint
  app.post("/api/rewrite", async (req, res) => {
    try {
      const { originalSolution, critique, provider, problem } = req.body;
      
      if (!originalSolution || !critique || !provider) {
        return res.status(400).json({ error: "Original solution, critique, and provider are required" });
      }

      const rewritePrompt = `I need you to rewrite this solution based on the critique provided.

Original Problem: ${problem}

Original Solution:
${originalSolution}

Critique/Feedback:
${critique}

Please provide an improved solution that addresses the feedback. Maintain proper mathematical notation and formatting.`;

      let rewrittenSolution = '';
      switch (provider) {
        case 'anthropic':
          rewrittenSolution = await processWithAnthropic(rewritePrompt);
          break;
        case 'openai':
          rewrittenSolution = await processWithOpenAI(rewritePrompt);
          break;
        case 'perplexity':
          rewrittenSolution = await processWithPerplexity(rewritePrompt);
          break;
        default:
          return res.status(400).json({ error: "Invalid provider" });
      }

      res.json({ rewrittenSolution });
    } catch (error: any) {
      console.error('Rewrite error:', error);
      res.status(500).json({ error: error.message || 'Rewrite failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
