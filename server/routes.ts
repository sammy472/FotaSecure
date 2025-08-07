import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { authenticateToken, generateToken } from "./middleware/auth";
import { encryptFile, decryptFile } from "./services/crypto";
import { saveFile, getFile } from "./services/fileStorage";
import { insertUserSchema, insertDeviceSchema, insertFirmwareSchema, insertUpdateJobSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import multer from "multer";
import crypto from "crypto";
import {config} from 'dotenv';
config();

interface FileRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time updates (using a specific path to avoid Vite conflicts)
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/updates'
  });
  const clients = new Set();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
  
  // Broadcast function for update job progress
  function broadcastJobUpdate(jobId: string, data: any) {
    const message = JSON.stringify({ type: 'job_update', jobId, data });
    clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user);
      
      await storage.createAuditLog({
        userId: user.id,
        action: "login",
        targetType: "user",
        targetId: user.id,
        details: { username }
      });

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      console.log("Breakpoint",req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      await storage.createAuditLog({
        userId: user.id,
        action: "register",
        targetType: "user",
        targetId: user.id,
        details: { username: user.username, role: user.role }
      });

      res.status(201).json({ 
        message: "User created successfully",
        user: { id: user.id, username: user.username, role: user.role }
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Firmware routes
  app.post("/api/firmware/upload", authenticateToken, upload.single('firmware'), async (req: FileRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No firmware file provided" });
      }

      const firmwareData = insertFirmwareSchema.parse(req.body);
      const uploaderId = (req as any).user.id;

      // Generate SHA256 hash
      const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      
      // Generate HMAC (using master key from env)
      const masterKey = process.env.AES_MASTER_KEY || 'default-key-for-development';
      const hmac = crypto.createHmac('sha256', masterKey).update(req.file.buffer).digest('hex');

      // Save encrypted file
      const filename = `${Date.now()}-${req.file.originalname}`;
      const storagePath = await saveFile(filename, req.file.buffer);

      const firmware = await storage.createFirmware({
        ...firmwareData,
        uploaderId,
        storagePath,
        sha256,
        hmac,
      });

      await storage.createAuditLog({
        userId: uploaderId,
        action: "firmware_upload",
        targetType: "firmware",
        targetId: firmware.id,
        details: { name: firmware.name, version: firmware.version }
      });

      res.status(201).json(firmware);
    } catch (error: any) {
      console.error("Firmware upload error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/firmware", authenticateToken, async (req, res) => {
    try {
      const firmwareList = await storage.getFirmware();
      res.json(firmwareList);
    } catch (error) {
      console.error("Get firmware error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/firmware/:id", authenticateToken, async (req, res) => {
    try {
      const firmware = await storage.getFirmwareById(req.params.id);
      if (!firmware) {
        return res.status(404).json({ message: "Firmware not found" });
      }
      res.json(firmware);
    } catch (error) {
      console.error("Get firmware by ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/firmware/:id/download", authenticateToken, async (req, res) => {
    try {
      const firmware = await storage.getFirmwareById(req.params.id);
      if (!firmware) {
        return res.status(404).json({ message: "Firmware not found" });
      }

      const fileBuffer = await getFile(firmware.storagePath);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${firmware.name}-${firmware.version}.bin"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Firmware download error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Device routes
  app.get("/api/devices", authenticateToken, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      console.error("Get devices error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/devices/register", authenticateToken, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const userId = (req as any).user.id;

      const existingDevice = await storage.getDeviceByIdentifier(deviceData.deviceIdentifier);
      if (existingDevice) {
        return res.status(400).json({ message: "Device identifier already exists" });
      }

      const device = await storage.createDevice(deviceData);

      await storage.createAuditLog({
        userId,
        action: "device_register",
        targetType: "device",
        targetId: device.id,
        details: { identifier: device.deviceIdentifier, name: device.name }
      });

      res.status(201).json(device);
    } catch (error: any) {
      console.error("Device registration error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update job routes
  app.post("/api/update/trigger", authenticateToken, async (req, res) => {
    try {
      const jobData = insertUpdateJobSchema.parse(req.body);
      const initiatedBy = (req as any).user.id;

      // Count target devices
      const targetDevices = await storage.getDevices();
      const firmware = await storage.getFirmwareById(jobData.firmwareId);
      
      if (!firmware) {
        return res.status(404).json({ message: "Firmware not found" });
      }

      const deviceCount = targetDevices.filter(d => d.deviceGroup === firmware.targetDeviceGroup).length;
      console.log(deviceCount);

      const updateJob = await storage.createUpdateJob({
        ...jobData,
        initiatedBy,
        totalDevices: deviceCount,
      });

      await storage.createAuditLog({
        userId: initiatedBy,
        action: "update_job_create",
        targetType: "update_job",
        targetId: updateJob.id,
        details: { firmwareId: jobData.firmwareId, totalDevices: deviceCount }
      });

      // Start the update job (simulate progress)
      setTimeout(async () => {
        await storage.updateUpdateJobStatus(updateJob.id, 'in_progress');
        broadcastJobUpdate(updateJob.id, { status: 'in_progress' });
        
        // Simulate gradual progress
        for (let i = 1; i <= deviceCount; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per device
          const progress = Math.round((i / deviceCount) * 100);
          await storage.updateUpdateJobProgress(updateJob.id, 100, i, 0);
          broadcastJobUpdate(updateJob.id, { progress, completedDevices: i });
        }
        
        await storage.updateUpdateJobStatus(updateJob.id, 'completed');
        broadcastJobUpdate(updateJob.id, { status: 'completed' });
      }, 1000);

      res.status(201).json(updateJob);
    } catch (error: any) {
      console.error("Update job creation error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/update/:jobId/status", authenticateToken, async (req, res) => {
    try {
      const updateJob = await storage.getUpdateJob(req.params.jobId);
      if (!updateJob) {
        return res.status(404).json({ message: "Update job not found" });
      }
      res.json(updateJob);
    } catch (error) {
      console.error("Get update job status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/update", authenticateToken, async (req, res) => {
    try {
      const updateJobs = await storage.getUpdateJobs();
      res.json(updateJobs);
    } catch (error) {
      console.error("Get update jobs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/update/:jobId/rollback", authenticateToken, async (req, res) => {
    try {
      const originalJob = await storage.getUpdateJob(req.params.jobId);
      if (!originalJob) {
        return res.status(404).json({ message: "Original update job not found" });
      }

      const initiatedBy = (req as any).user.id;
      
      // Create rollback job (would need previous firmware version logic)
      const rollbackJob = await storage.createUpdateJob({
        firmwareId: originalJob.firmwareId, // In real app, this would be previous version
        transportType: originalJob.transportType,
        strategy: originalJob.strategy,
        totalDevices: originalJob.totalDevices,
        initiatedBy,
      });

      await storage.createAuditLog({
        userId: initiatedBy,
        action: "rollback_job_create",
        targetType: "update_job",
        targetId: rollbackJob.id,
        details: { originalJobId: originalJob.id }
      });

      res.status(201).json(rollbackJob);
    } catch (error) {
      console.error("Rollback creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Audit logs
  app.get("/api/audit", authenticateToken, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
