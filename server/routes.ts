import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { processAssignmentSchema, emailSolutionSchema, type ProcessAssignmentRequest, type ProcessAssignmentResponse, type EmailSolutionRequest, type AssignmentListItem } from "@shared/schema";
import { ZodError } from "zod";
import Tesseract from "tesseract.js";
import pdf2json from "pdf2json";

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

async function processWithAnthropic(text: string): Promise<string> {
  try {
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const message = await anthropic.messages.create({
      max_tokens: 4000,
      messages: [{ 
        role: 'user', 
        content: `Solve this homework assignment. Provide a clear, step-by-step solution with proper mathematical notation where applicable. Do not add commentary or explanations beyond what is needed to solve the problem:\n\n${text}` 
      }],
      model: 'claude-3-7-sonnet-20250219',
    });

    return message.content[0]?.type === 'text' ? message.content[0].text : 'No response generated';
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
        content: `Solve this homework assignment. Provide a clear, step-by-step solution with proper mathematical notation where applicable. Do not add commentary or explanations beyond what is needed to solve the problem:\n\n${text}` 
      }],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || 'No response generated';
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
            content: `Solve this homework assignment. Provide a clear, step-by-step solution with proper mathematical notation where applicable. Do not add commentary or explanations beyond what is needed to solve the problem:\n\n${text}`
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
    return data.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw new Error('Failed to process with Perplexity');
  }
}

async function checkAIDetection(text: string): Promise<any> {
  if (!process.env.GPTZERO_API_KEY) {
    throw new Error('GPTZero API key not configured');
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

  // Email solution endpoint
  app.post("/api/email-solution", async (req, res) => {
    try {
      const { email, extractedText, llmResponse, provider } = emailSolutionSchema.parse(req.body);

      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ error: "Email service not configured. SendGrid API key is missing." });
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Your Homework Solution</title>
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
            .problem-section { background: #f8fafc; padding: 15px; border-left: 3px solid #3b82f6; margin-bottom: 20px; }
            .solution-section { margin-top: 20px; }
            .math-content { white-space: pre-wrap; word-wrap: break-word; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Your Homework Solution</h1>
          <p>Generated using ${provider} AI</p>
          
          ${extractedText ? `
            <div class="problem-section">
              <h2>Problem:</h2>
              <p>${extractedText}</p>
            </div>
          ` : ''}
          
          <div class="solution-section">
            <h2>Solution:</h2>
            <div class="math-content">${llmResponse}</div>
          </div>
          
          <div class="footer">
            <p>This solution was generated by our AI homework assistant. Please review and verify the work.</p>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@homeworkassistant.com',
        subject: 'Your Homework Solution',
        html: htmlContent,
      };

      await sgMail.send(msg);
      
      res.json({ success: true, message: 'Solution sent to your email successfully!' });
    } catch (error: any) {
      console.error('Email sending error:', error);
      if (error.code === 403) {
        res.status(403).json({ error: "Email sending failed. Please verify your SendGrid sender email address." });
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Failed to send email" 
        });
      }
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

  const httpServer = createServer(app);
  return httpServer;
}
