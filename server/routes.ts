import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { processAssignmentSchema, type ProcessAssignmentRequest, type ProcessAssignmentResponse } from "@shared/schema";
import { ZodError } from "zod";
import Tesseract from "tesseract.js";
// import pdfParse from "pdf-parse";

// LLM imports
// @ts-ignore
import Anthropic from "@anthropic-ai/sdk";
// @ts-ignore
import OpenAI from "openai";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      // If no text found, it might be a scanned PDF - use OCR
      console.log('No text found in PDF, attempting OCR fallback');
      return await performOCR(buffer, 'scanned.pdf');
    }
    
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    // Fallback to OCR if PDF parsing fails
    try {
      console.log('PDF parsing failed, attempting OCR fallback');
      return await performOCR(buffer, 'fallback.pdf');
    } catch (ocrError) {
      console.error('OCR fallback also failed:', ocrError);
      throw new Error('Failed to extract text from PDF');
    }
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

      // Store assignment
      const assignment = await storage.createAssignment({
        inputText: null,
        inputType: 'image',
        fileName,
        extractedText,
        llmProvider,
        llmResponse,
        processingTime,
      });

      const response: ProcessAssignmentResponse = {
        id: assignment.id,
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

  const httpServer = createServer(app);
  return httpServer;
}
