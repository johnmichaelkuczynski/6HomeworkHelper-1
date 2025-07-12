import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and token tracking
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  tokenBalance: integer("token_balance").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Token usage tracking
export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // for anonymous users
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  remainingBalance: integer("remaining_balance"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily usage tracking for free users
export const dailyUsage = pgTable("daily_usage", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  totalTokens: integer("total_tokens").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // for anonymous users
  inputText: text("input_text"),
  inputType: text("input_type").notNull(), // 'text', 'image', 'pdf', 'doc'
  fileName: text("file_name"),
  extractedText: text("extracted_text"),
  llmProvider: text("llm_provider").notNull(), // 'anthropic', 'openai', 'perplexity'
  llmResponse: text("llm_response"),
  graphData: text("graph_data").array(), // JSON strings containing graph configuration and data
  graphImages: text("graph_images").array(), // base64 encoded graph images
  processingTime: integer("processing_time"), // in milliseconds
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
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
  llmProvider: z.enum(['anthropic', 'openai', 'azure', 'perplexity', 'deepseek']),
  fileData: z.string().optional(), // base64 encoded file data
  sessionId: z.string().optional(), // for anonymous users
});

export type ProcessAssignmentRequest = z.infer<typeof processAssignmentSchema>;

export const processAssignmentResponseSchema = z.object({
  id: z.number(),
  extractedText: z.string().optional(),
  llmResponse: z.string(),
  graphData: z.array(z.string()).optional(),
  graphImages: z.array(z.string()).optional(),
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

// User authentication schemas
export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  tokenBalance: z.number(),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;

// Payment schemas
export const purchaseCreditsSchema = z.object({
  amount: z.enum(['1', '10', '100', '1000']),
});

export type PurchaseCreditsRequest = z.infer<typeof purchaseCreditsSchema>;

// Token usage tracking
export const tokenCheckSchema = z.object({
  inputText: z.string(),
  sessionId: z.string().optional(),
});

export const tokenUsageResponseSchema = z.object({
  canProcess: z.boolean(),
  inputTokens: z.number(),
  estimatedOutputTokens: z.number(),
  remainingBalance: z.number().optional(),
  dailyUsage: z.number().optional(),
  dailyLimit: z.number().optional(),
  message: z.string().optional(),
});

export type TokenCheckRequest = z.infer<typeof tokenCheckSchema>;
export type TokenUsageResponse = z.infer<typeof tokenUsageResponseSchema>;

// Insert schemas for new tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTokenUsageSchema = createInsertSchema(tokenUsage).omit({
  id: true,
  createdAt: true,
});

export const insertDailyUsageSchema = createInsertSchema(dailyUsage).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;
export type InsertDailyUsage = z.infer<typeof insertDailyUsageSchema>;
export type User = typeof users.$inferSelect;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type DailyUsage = typeof dailyUsage.$inferSelect;
