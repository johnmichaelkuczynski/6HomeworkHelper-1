import { assignments, users, tokenUsage, dailyUsage, type Assignment, type InsertAssignment, type User, type InsertUser, type TokenUsage, type InsertTokenUsage, type DailyUsage, type InsertDailyUsage } from "@shared/schema";
import { db } from "./db";
import { eq, isNull, and, sum } from "drizzle-orm";

export interface IStorage {
  // Assignment methods with user isolation
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignment(id: number, userId?: number): Promise<Assignment | undefined>;
  getAllAssignments(userId?: number): Promise<Assignment[]>;
  deleteAssignment(id: number, userId?: number): Promise<void>;
  cleanupEmptyAssignments(): Promise<void>;
  
  // User management methods
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserTokenBalance(userId: number, balance: number): Promise<void>;
  
  // Token usage methods
  createTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage>;
  getDailyUsage(sessionId: string, date: string): Promise<DailyUsage | undefined>;
  createOrUpdateDailyUsage(sessionId: string, date: string, tokens: number): Promise<void>;
  getUserTokenBalance(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db
      .insert(assignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async getAssignment(id: number, userId?: number): Promise<Assignment | undefined> {
    const conditions = [eq(assignments.id, id)];
    
    // SECURITY: Always enforce user isolation for authenticated users
    if (userId) {
      conditions.push(eq(assignments.userId, userId));
    }
    
    const [assignment] = await db.select().from(assignments).where(and(...conditions));
    return assignment || undefined;
  }

  async getAllAssignments(userId?: number): Promise<Assignment[]> {
    const conditions = [];
    
    // SECURITY: Always enforce user isolation for authenticated users
    if (userId) {
      conditions.push(eq(assignments.userId, userId));
    } else {
      // For anonymous users, only show assignments without a userId
      conditions.push(isNull(assignments.userId));
    }
    
    return await db.select().from(assignments).where(and(...conditions)).orderBy(assignments.createdAt);
  }

  async deleteAssignment(id: number, userId?: number): Promise<void> {
    const conditions = [eq(assignments.id, id)];
    
    // SECURITY: Always enforce user isolation for authenticated users
    if (userId) {
      conditions.push(eq(assignments.userId, userId));
    }
    
    await db.delete(assignments).where(and(...conditions));
  }

  async cleanupEmptyAssignments(): Promise<void> {
    // Empty assignments already cleaned via SQL
    return;
  }

  // User management methods
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUserTokenBalance(userId: number, balance: number): Promise<void> {
    await db
      .update(users)
      .set({ tokenBalance: balance })
      .where(eq(users.id, userId));
  }

  // Token usage methods
  async createTokenUsage(insertUsage: InsertTokenUsage): Promise<TokenUsage> {
    const [usage] = await db
      .insert(tokenUsage)
      .values(insertUsage)
      .returning();
    return usage;
  }

  async getDailyUsage(sessionId: string, date: string): Promise<DailyUsage | undefined> {
    const [usage] = await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.sessionId, sessionId), eq(dailyUsage.date, date)));
    return usage || undefined;
  }

  async createOrUpdateDailyUsage(sessionId: string, date: string, tokens: number): Promise<void> {
    const existing = await this.getDailyUsage(sessionId, date);
    
    if (existing) {
      await db
        .update(dailyUsage)
        .set({ totalTokens: existing.totalTokens + tokens })
        .where(eq(dailyUsage.id, existing.id));
    } else {
      await db
        .insert(dailyUsage)
        .values({ sessionId, date, totalTokens: tokens });
    }
  }

  async getUserTokenBalance(userId: number): Promise<number> {
    const user = await this.getUserById(userId);
    return user?.tokenBalance || 0;
  }
}

export class MemStorage implements IStorage {
  private assignments: Map<number, Assignment>;
  private currentId: number;
  private storageFile: string;

  constructor() {
    this.storageFile = './assignments.json';
    this.assignments = new Map();
    this.currentId = 1;
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        this.currentId = data.currentId || 1;
        if (data.assignments) {
          for (const [id, assignment] of Object.entries(data.assignments)) {
            this.assignments.set(Number(id), {
              ...assignment as Assignment,
              createdAt: new Date((assignment as any).createdAt)
            });
          }
        }
      }
    } catch (error) {
      console.log('No existing assignments file found, starting fresh');
    }
  }

  private saveToFile() {
    try {
      import('fs').then(fs => {
        const data = {
          currentId: this.currentId,
          assignments: Object.fromEntries(this.assignments)
        };
        fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
      });
    } catch (error) {
      console.error('Failed to save assignments:', error);
    }
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = this.currentId++;
    const assignment: Assignment = {
      id,
      inputText: insertAssignment.inputText || null,
      inputType: insertAssignment.inputType,
      fileName: insertAssignment.fileName || null,
      extractedText: insertAssignment.extractedText || null,
      llmProvider: insertAssignment.llmProvider,
      llmResponse: insertAssignment.llmResponse || null,
      graphData: insertAssignment.graphData || null,
      graphImages: insertAssignment.graphImages || null,
      processingTime: insertAssignment.processingTime || null,
      createdAt: new Date(),
    };
    this.assignments.set(id, assignment);
    this.saveToFile(); // Save immediately after creating
    console.log(`Saved assignment ${id} to storage. Total assignments: ${this.assignments.size}`);
    return assignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async deleteAssignment(id: number): Promise<void> {
    this.assignments.delete(id);
    this.saveToFile();
  }

  async cleanupEmptyAssignments(): Promise<void> {
    const toDelete: number[] = [];
    this.assignments.forEach((assignment, id) => {
      if (!assignment.fileName) {
        toDelete.push(id);
      }
    });
    toDelete.forEach(id => this.assignments.delete(id));
    this.saveToFile();
  }
}

export const storage = new DatabaseStorage();
