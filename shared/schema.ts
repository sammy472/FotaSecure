import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("operator"), // admin, operator
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceIdentifier: text("device_identifier").notNull().unique(),
  name: text("name").notNull(),
  deviceGroup: text("device_group").notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  currentFirmwareId: varchar("current_firmware_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const firmware = pgTable("firmware", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  releaseNotes: text("release_notes"),
  uploaderId: varchar("uploader_id").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256").notNull(),
  hmac: text("hmac").notNull(),
  targetDeviceGroup: text("target_device_group").notNull(),
  transportType: text("transport_type").notNull(), // mqtt, ble
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const updateJobs = pgTable("update_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firmwareId: varchar("firmware_id").notNull(),
  initiatedBy: varchar("initiated_by").notNull(),
  transportType: text("transport_type").notNull(),
  strategy: text("strategy").default("sequential").notNull(),
  status: text("status").default("pending").notNull(), // pending, in_progress, completed, failed, cancelled
  progress: integer("progress").default(0).notNull(),
  totalDevices: integer("total_devices").default(0).notNull(),
  completedDevices: integer("completed_devices").default(0).notNull(),
  failedDevices: integer("failed_devices").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  firmware: many(firmware),
  updateJobs: many(updateJobs),
  auditLogs: many(auditLogs),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  currentFirmware: one(firmware, {
    fields: [devices.currentFirmwareId],
    references: [firmware.id],
  }),
}));

export const firmwareRelations = relations(firmware, ({ one, many }) => ({
  uploader: one(users, {
    fields: [firmware.uploaderId],
    references: [users.id],
  }),
  updateJobs: many(updateJobs),
  devices: many(devices),
}));

export const updateJobsRelations = relations(updateJobs, ({ one }) => ({
  firmware: one(firmware, {
    fields: [updateJobs.firmwareId],
    references: [firmware.id],
  }),
  initiator: one(users, {
    fields: [updateJobs.initiatedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(8),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  lastSeenAt: true,
});

export const insertFirmwareSchema = createInsertSchema(firmware).omit({
  id: true,
  createdAt: true,
  uploaderId: true,
  storagePath: true,
  sha256: true,
  hmac: true,
});

export const insertUpdateJobSchema = createInsertSchema(updateJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  initiatedBy: true,
  progress: true,
  completedDevices: true,
  failedDevices: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Firmware = typeof firmware.$inferSelect;
export type InsertFirmware = z.infer<typeof insertFirmwareSchema>;
export type UpdateJob = typeof updateJobs.$inferSelect;
export type InsertUpdateJob = z.infer<typeof insertUpdateJobSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
