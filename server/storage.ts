import { assignments, type Assignment, type InsertAssignment } from "@shared/schema";

export interface IStorage {
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAllAssignments(): Promise<Assignment[]>;
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
      const fs = require('fs');
      const data = {
        currentId: this.currentId,
        assignments: Object.fromEntries(this.assignments)
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save assignments:', error);
    }
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = this.currentId++;
    const assignment: Assignment = {
      ...insertAssignment,
      id,
      createdAt: new Date(),
    };
    this.assignments.set(id, assignment);
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
}

export const storage = new MemStorage();
