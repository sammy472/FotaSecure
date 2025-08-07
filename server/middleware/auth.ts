import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import {config} from 'dotenv';
config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt";

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded as User;
    next();
  });
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
