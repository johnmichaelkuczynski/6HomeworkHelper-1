import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  inputText: text("input_text"),
  inputType: text("input_type").notNull(), // 'text', 'image', 'pdf', 'doc'
  fileName: text("file_name"),
  extractedText: text("extracted_text"),
  llmProvider: text("llm_provider").notNull(), // 'anthropic', 'openai', 'perplexity'
  llmResponse: text("llm_response"),
  processingTime: integer("processing_time"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

// API request/response types
export const processAssignmentSchema = z.object({
  inputText: z.string().optional(),
  inputType: z.enum(['text', 'image', 'pdf', 'doc']),
  fileName: z.string().optional(),
  llmProvider: z.enum(['anthropic', 'openai', 'azure', 'perplexity']),
  fileData: z.string().optional(), // base64 encoded file data
});

export type ProcessAssignmentRequest = z.infer<typeof processAssignmentSchema>;

export const processAssignmentResponseSchema = z.object({
  id: z.number(),
  extractedText: z.string().optional(),
  llmResponse: z.string(),
  processingTime: z.number(),
  success: z.boolean(),
});

export type ProcessAssignmentResponse = z.infer<typeof processAssignmentResponseSchema>;

export const emailSolutionSchema = z.object({
  email: z.string().email(),
  extractedText: z.string().optional(),
  llmResponse: z.string().optional(),
  provider: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
});

export type EmailSolutionRequest = z.infer<typeof emailSolutionSchema>;

export const assignmentListSchema = z.object({
  id: z.number(),
  extractedText: z.string().nullable(),
  llmProvider: z.string(),
  processingTime: z.number(),
  createdAt: z.string(),
  fileName: z.string().nullable(),
});

export type AssignmentListItem = z.infer<typeof assignmentListSchema>;
