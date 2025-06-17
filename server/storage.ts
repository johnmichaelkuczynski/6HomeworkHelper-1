import { assignments, type Assignment, type InsertAssignment } from "@shared/schema";
import { db } from "./db";
import { eq, isNull } from "drizzle-orm";

export interface IStorage {
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAllAssignments(): Promise<Assignment[]>;
  deleteAssignment(id: number): Promise<void>;
  cleanupEmptyAssignments(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db
      .insert(assignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment || undefined;
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return await db.select().from(assignments).orderBy(assignments.createdAt);
  }

  async deleteAssignment(id: number): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  async cleanupEmptyAssignments(): Promise<void> {
    // Empty assignments already cleaned via SQL
    return;
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
