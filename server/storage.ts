import { 
  users, devices, firmware, updateJobs, auditLogs,
  type User, type InsertUser, type Device, type InsertDevice,
  type Firmware, type InsertFirmware, type UpdateJob, type InsertUpdateJob,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Devices
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByIdentifier(identifier: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDeviceLastSeen(id: string): Promise<void>;
  updateDeviceFirmware(id: string, firmwareId: string): Promise<void>;
  
  // Firmware
  getFirmware(): Promise<Firmware[]>;
  getFirmwareById(id: string): Promise<Firmware | undefined>;
  createFirmware(firmware: InsertFirmware & { uploaderId: string; storagePath: string; sha256: string; hmac: string }): Promise<Firmware>;
  getFirmwareByDeviceGroup(deviceGroup: string): Promise<Firmware[]>;
  
  // Update Jobs
  getUpdateJobs(): Promise<UpdateJob[]>;
  getUpdateJob(id: string): Promise<UpdateJob | undefined>;
  createUpdateJob(job: InsertUpdateJob & { initiatedBy: string }): Promise<UpdateJob>;
  updateUpdateJobProgress(id: string, progress: number, completedDevices: number, failedDevices: number): Promise<void>;
  updateUpdateJobStatus(id: string, status: string): Promise<void>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Stats
  getStats(): Promise<{
    totalDevices: number;
    activeUpdates: number;
    firmwareVersions: number;
    successRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        passwordHash: insertUser.password,
      })
      .returning();
    return user;
  }

  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices).orderBy(desc(devices.lastSeenAt));
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDeviceByIdentifier(identifier: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.deviceIdentifier, identifier));
    return device || undefined;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db
      .insert(devices)
      .values(device)
      .returning();
    return newDevice;
  }

  async updateDeviceLastSeen(id: string): Promise<void> {
    await db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, id));
  }

  async updateDeviceFirmware(id: string, firmwareId: string): Promise<void> {
    await db
      .update(devices)
      .set({ currentFirmwareId: firmwareId })
      .where(eq(devices.id, id));
  }

  async getFirmware(): Promise<Firmware[]> {
    return await db.select().from(firmware).orderBy(desc(firmware.createdAt));
  }

  async getFirmwareById(id: string): Promise<Firmware | undefined> {
    const [fw] = await db.select().from(firmware).where(eq(firmware.id, id));
    return fw || undefined;
  }

  async createFirmware(fw: InsertFirmware & { uploaderId: string; storagePath: string; sha256: string; hmac: string }): Promise<Firmware> {
    const [newFirmware] = await db
      .insert(firmware)
      .values(fw)
      .returning();
    return newFirmware;
  }

  async getFirmwareByDeviceGroup(deviceGroup: string): Promise<Firmware[]> {
    return await db
      .select()
      .from(firmware)
      .where(eq(firmware.targetDeviceGroup, deviceGroup))
      .orderBy(desc(firmware.createdAt));
  }

  async getUpdateJobs(): Promise<UpdateJob[]> {
    return await db.select().from(updateJobs).orderBy(desc(updateJobs.createdAt));
  }

  async getUpdateJob(id: string): Promise<UpdateJob | undefined> {
    const [job] = await db.select().from(updateJobs).where(eq(updateJobs.id, id));
    return job || undefined;
  }

  async createUpdateJob(job: InsertUpdateJob & { initiatedBy: string }): Promise<UpdateJob> {
    const [newJob] = await db
      .insert(updateJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async updateUpdateJobProgress(id: string, progress: number, completedDevices: number, failedDevices: number): Promise<void> {
    await db
      .update(updateJobs)
      .set({ 
        progress, 
        completedDevices, 
        failedDevices,
        updatedAt: new Date()
      })
      .where(eq(updateJobs.id, id));
  }

  async updateUpdateJobStatus(id: string, status: string): Promise<void> {
    await db
      .update(updateJobs)
      .set({ status, updatedAt: new Date() })
      .where(eq(updateJobs.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getStats(): Promise<{
    totalDevices: number;
    activeUpdates: number;
    firmwareVersions: number;
    successRate: number;
  }> {
    const [deviceCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(devices);

    const [activeUpdateCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(updateJobs)
      .where(and(
        eq(updateJobs.status, 'in_progress')
      ));

    const [firmwareCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(firmware)
      .where(eq(firmware.isActive, true));

    const [successStats] = await db
      .select({ 
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where status = 'completed')`
      })
      .from(updateJobs)
      .where(sql`status in ('completed', 'failed')`);

    const successRate = successStats.total > 0 ? (successStats.completed / successStats.total) * 100 : 0;

    return {
      totalDevices: deviceCount.count,
      activeUpdates: activeUpdateCount.count,
      firmwareVersions: firmwareCount.count,
      successRate: Math.round(successRate * 10) / 10,
    };
  }
}

export const storage = new DatabaseStorage();
