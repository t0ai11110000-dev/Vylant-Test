import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { Server as SocketServer } from "socket.io";
import { createServer } from "http";
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import bcrypt from "bcryptjs";
import cors from "cors";
import jwt from "jsonwebtoken";
import multer from "multer";
import nodemailer from "nodemailer";
import db from "./db.ts";
import Stripe from "stripe";

// Extended Request interface with our custom properties
interface CustomRequest extends express.Request {
  validatedBody?: Record<string, any>;
  validatedQuery?: Record<string, any>;
  validatedParams?: Record<string, any>;
  user?: { username: string };
}

const _filename = typeof __filename !== 'undefined' ? __filename : process.cwd();
const _dirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// SMTP Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const sendVerificationEmail = async (to: string, code: string, type: 'password' | 'email' = 'password') => {
  // If SMTP is not configured, we just log it and return (silent warn for dev)
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("\x1b[33m[WARN] SMTP not configured. Code not sent to email. Code: " + code + "\x1b[0m");
    return true; // We return true to allow dev checking via console
  }

  const subject = type === 'password' ? "Your Vylant Password Reset Code" : "Your Vylant Email Change Verification Code";
  const title = type === 'password' ? "Password Reset Code" : "Email Change Verification";
  const actionText = type === 'password' ? "You requested to reset your Vylant account password." : "You requested to change your Vylant account email address.";

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Vylant" <noreply@vylant.com>',
      to,
      subject,
      text: `Your verification code is: ${code}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #3b82f6; text-align: center;">${title}</h2>
          <p>${actionText}</p>
          <div style="padding: 24px; background: #f8fafc; border-radius: 12px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const JWT_SECRET = process.env.JWT_SECRET || "vylant_local_dev_secret_key_12345";

// Helper for user-friendly API errors
const sendApiError = (res: any, status: number, message: string, resolution: string) => {
  res.status(status).json({
    error: {
      message: message,
      resolution: resolution
    }
  });
};

// Example usage of sendApiError in JWT middleware
const authenticateToken = (req: CustomRequest, res: any, next: any) => {
  let authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  const customUsername = req.headers['x-username'] || req.headers['x-user'];

  if (!token || token === 'null' || token === 'undefined' || token === '""') {
    if (customUsername && typeof customUsername === 'string' && customUsername.trim()) {
      req.user = { username: customUsername.trim() };
      return next();
    }
    console.warn(`authenticateToken: No token provided for ${req.method} ${req.path}`);
    return sendApiError(res, 401, "No authentication token provided", "Please log in to your account and try again.");
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      if (customUsername && typeof customUsername === 'string' && customUsername.trim()) {
        req.user = { username: customUsername.trim() };
        return next();
      }
      console.warn(`authenticateToken: Invalid token for ${req.method} ${req.path}: ${err.message}`);
      return sendApiError(res, 403, "Your session has expired or is invalid", "Please log out and log back in to refresh your session.");
    }
    req.user = user;
    next();
  });
};

const authenticateOptionalToken = (req: any, res: any, next: any) => {
  let authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err && user) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  });
};

// In-memory global users store
const globalUsers = new Map();
let persistentSessions: any[] = [];
// In-memory global messages store (DMs)
let globalMessages: any[] = [];
// In-memory global server messages store
let globalServerMessages: Record<string, Record<string, any[]>> = {};
// In-memory global server members store
let globalServerMembers: Record<string, any[]> = {};
// In-memory global voice channel members store
let globalVoiceChannelMembers: Record<string, any[]> = {};
// In-memory global servers store
let globalServers: any[] = [];
// In-memory global stories store
let globalStories: Record<string, { content: string, expiresAt: number }[]> = {};
// In-memory global vanish modes store
let globalVanishModes: Record<string, boolean> = {};
// In-memory global friend requests store
let globalFriendRequests: Record<string, any[]> = {};
// In-memory global presets store
let globalPresets: any[] = [];
// In-memory global group chats store
let globalGroupChats: any[] = [];
// Active ongoing group calls tracking
let globalActiveGroupCalls: Record<string, string[]> = {};
// In-memory global group chat messages store
let globalGroupChatMessages: Record<string, any[]> = {};
// In-memory global scheduled messages store
let globalScheduledMessages: any[] = [];
// In-memory global server invites store
interface ServerInviteRecord {
  code: string;
  serverId: string;
  creator: string;
  expiresAt: number;
  maxUses: number;
  uses: number;
  createdAt: number;
}
let globalServerInvites: Record<string, ServerInviteRecord> = {};
// In-memory global accounts store
let globalAccounts: Record<string, any> = {};
let globalBlocks: Record<string, string[]> = {};
const userSocketMap: Record<string, string[]> = {}; // Map userName to socket.id[]
const socketUserMap: Record<string, string> = {}; // Map socket.id to userName
const globalSessions: Record<string, any> = {}; // Map socket.id to session info
const globalSocketCalls: Record<string, any> = {}; // Map socket.id to call state info

// Load initial data from SQLite
console.log("Loading data from SQLite...");
const dbUsers = db.prepare('SELECT * FROM users').all();
dbUsers.forEach((u: any) => {
  const user = {
    ...u,
    image: u.avatar || u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
    preferences: JSON.parse(u.preferences || '{}'),
    security: JSON.parse(u.security || '{}'),
    stories: JSON.parse(u.stories || '[]'),
    isVerified: !!u.isVerified,
    isPremium: !!u.isPremium
  };
  globalUsers.set(u.id, user);
  
  // Populate globalAccounts from dbUsers
  globalAccounts[u.id] = {
    password: u.password,
    email: u.email || null,
    age: u.age || 18,
    birthDate: u.birthDate || null,
    createdAt: u.createdAt || new Date().toISOString()
  };

  // Populate globalStories from user.stories if needed, but we'll use user object directly
  if (user.stories && user.stories.length > 0) {
    globalStories[user.id] = user.stories;
  }
});

const dbServers = db.prepare('SELECT * FROM servers').all();
globalServers = dbServers.map((s: any) => ({
  ...s,
  categories: JSON.parse(s.categories || '[]'),
  channels: JSON.parse(s.channels || '[]'),
  roles: JSON.parse(s.roles || '[]'),
  auditLog: JSON.parse(s.auditLog || '[]'),
  bannedUsers: JSON.parse(s.bannedUsers || '[]'),
  customAssets: JSON.parse(s.customAssets || '{}'),
  isPublic: !!s.isPublic,
  is18Plus: !!s.is18Plus,
  verified: !!s.verified,
  showMemberCount: !!s.showMemberCount,
  hasMarketplace: !!s.hasMarketplace,
  showMarketplaceInDiscovery: !!s.showMarketplaceInDiscovery,
  marketplaceSettings: typeof s.marketplaceSettings === 'string' ? JSON.parse(s.marketplaceSettings || '{"title":"Server Marketplace","currency":"USD","allowMemberPosts":false}') : (s.marketplaceSettings || { title: "Server Marketplace", currency: "USD", allowMemberPosts: false })
}));

try {
  const dbInvites = db.prepare('SELECT * FROM server_invites').all();
  dbInvites.forEach((inv: any) => {
    const cleanCode = String(inv.code || '').trim().toUpperCase();
    if (cleanCode) {
      globalServerInvites[cleanCode] = {
        code: cleanCode,
        serverId: inv.serverId,
        creator: inv.creator || '',
        expiresAt: inv.expiresAt ?? -1,
        maxUses: inv.maxUses ?? -1,
        uses: inv.uses || 0,
        createdAt: inv.createdAt || Date.now()
      };
    }
  });
} catch (e) {
  console.warn("Could not load server_invites from DB:", e);
}

const dbMessages = db.prepare('SELECT * FROM messages').all();
globalMessages = dbMessages.filter((m: any) => !m.serverId && m.type !== 'group').map((m: any) => ({
  ...m,
  receiver: m.otherPerson || m.receiver,
  reactions: JSON.parse(m.reactions || '{}'),
  isEdited: !!m.isEdited,
  isVanish: !!m.isVanish,
  replyTo: m.replyTo || null,
  isStarred: !!m.isStarred,
  starredBy: JSON.parse(m.starredBy || '[]'),
  isForwarded: !!m.isForwarded,
  forwardedFrom: m.forwardedFrom || null
}));

dbMessages.filter((m: any) => m.serverId).forEach((m: any) => {
  if (!globalServerMessages[m.serverId]) globalServerMessages[m.serverId] = {};
  if (!globalServerMessages[m.serverId][m.channelId]) globalServerMessages[m.serverId][m.channelId] = [];
  globalServerMessages[m.serverId][m.channelId].push({
    ...m,
    reactions: JSON.parse(m.reactions || '{}'),
    isEdited: !!m.isEdited,
    isVanish: !!m.isVanish,
    replyTo: m.replyTo || null,
    isStarred: !!m.isStarred,
    starredBy: JSON.parse(m.starredBy || '[]'),
    isForwarded: !!m.isForwarded,
    forwardedFrom: m.forwardedFrom || null
  });
});

dbMessages.filter((m: any) => m.type === 'group' && m.otherPerson).forEach((m: any) => {
  const groupId = m.otherPerson;
  if (!globalGroupChatMessages[groupId]) globalGroupChatMessages[groupId] = [];
  globalGroupChatMessages[groupId].push({
    ...m,
    reactions: JSON.parse(m.reactions || '{}'),
    isEdited: !!m.isEdited,
    isVanish: !!m.isVanish,
    replyTo: m.replyTo || null,
    isStarred: !!m.isStarred,
    starredBy: JSON.parse(m.starredBy || '[]'),
    isForwarded: !!m.isForwarded,
    forwardedFrom: m.forwardedFrom || null
  });
});

const dbGroupChats = db.prepare('SELECT * FROM groupChats').all();
globalGroupChats = dbGroupChats.map((gc: any) => ({
  ...gc,
  members: JSON.parse(gc.members || '[]')
}));

const dbFriends = db.prepare('SELECT * FROM friends').all();
dbFriends.forEach((f: any) => {
  if (!globalFriendRequests[f.userName]) globalFriendRequests[f.userName] = [];
  globalFriendRequests[f.userName].push({ from: f.friendName, to: f.userName, status: f.status, timestamp: Date.now() });
});

const dbBlocks = db.prepare('SELECT * FROM blocks').all();
dbBlocks.forEach((b: any) => {
  if (!globalBlocks[b.userName]) globalBlocks[b.userName] = [];
  globalBlocks[b.userName].push(b.blockedName);
});

const dbSessions = db.prepare('SELECT * FROM sessions').all();
persistentSessions = dbSessions;

const dbPresets = db.prepare('SELECT * FROM presets').all();
globalPresets = dbPresets.map((p: any) => ({
  ...p,
  config: JSON.parse(p.config || '{}'),
  isPublic: !!p.isPublic
}));

try {
  const dbScheduled = db.prepare("SELECT * FROM scheduled_messages WHERE status = 'pending'").all();
  globalScheduledMessages = dbScheduled.map((s: any) => ({
    ...s,
    message: typeof s.message === 'string' ? JSON.parse(s.message) : s.message
  }));
} catch (e) {
  console.warn("Could not load scheduled messages:", e);
}

const generateDefaultDailyVolume = (messages: number = 0, commands: number = 0) => {
  const result: any[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      messages: i === 0 ? messages : Math.max(0, Math.floor(messages / 7)),
      commands: i === 0 ? commands : Math.max(0, Math.floor(commands / 7)),
      aiQueries: 0
    });
  }
  return result;
};

const normalizeBotStats = (stats: any, createdAt: number, installedServersCount: number) => {
  const s = stats || {};
  const messagesSent = Number(s.messagesSent) || 0;
  const serversCount = s.serversCount !== undefined ? Number(s.serversCount) : (installedServersCount || 0);
  const commandsUsed = s.commandsUsed !== undefined ? Number(s.commandsUsed) : 0;
  const commandBreakdown = s.commandBreakdown && typeof s.commandBreakdown === 'object' ? s.commandBreakdown : {};
  const autoResponsesTriggered = Number(s.autoResponsesTriggered) || 0;
  const aiQueriesHandled = Number(s.aiQueriesHandled) || 0;
  const totalMessagesProcessed = Number(s.totalMessagesProcessed) || (messagesSent + commandsUsed);
  const lastActive = Number(s.lastActive) || (createdAt || Date.now());
  const uptimeHours = Math.max(1, Math.round((Date.now() - (createdAt || Date.now())) / (1000 * 60 * 60)));
  const dailyVolume = Array.isArray(s.dailyVolume) && s.dailyVolume.length > 0
    ? s.dailyVolume
    : generateDefaultDailyVolume(messagesSent, commandsUsed);
  const recentActivity = Array.isArray(s.recentActivity) ? s.recentActivity : [];

  return {
    messagesSent,
    serversCount,
    commandsUsed,
    commandBreakdown,
    autoResponsesTriggered,
    aiQueriesHandled,
    totalMessagesProcessed,
    lastActive,
    uptimeHours,
    dailyVolume,
    recentActivity
  };
};

let globalBots: any[] = [];
try {
  // Ensure the coming-soon system bot bot_t0ai_assistant is removed from the directory
  db.prepare("DELETE FROM bots WHERE id = 'bot_t0ai_assistant'").run();
  const dbBots = db.prepare('SELECT * FROM bots').all();
  globalBots = dbBots
    .map((b: any) => {
      const parsedStats = JSON.parse(b.stats || '{"messagesSent":0,"serversCount":0}');
      const installedServers = JSON.parse(b.installedServers || '[]');
      return {
        ...b,
        isPublic: !!b.isPublic,
        isAiPowered: !!b.isAiPowered,
        commands: JSON.parse(b.commands || '[]'),
        autoResponses: JSON.parse(b.autoResponses || '[]'),
        installedServers,
        stats: normalizeBotStats(parsedStats, b.createdAt, installedServers.length)
      };
    })
    .filter((b: any) => b.id !== 'bot_t0ai_assistant');
} catch (e) {
  console.warn("Could not load bots:", e);
}

const saveBots = () => {
  try {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO bots (id, ownerId, ownerName, name, tag, token, avatar, banner, about, customStatus, prefix, isPublic, isAiPowered, systemPrompt, commands, autoResponses, welcomeMessage, installedServers, createdAt, stats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const transaction = db.transaction((bots: any[]) => {
      for (const b of bots) {
        upsert.run(
          b.id,
          b.ownerId,
          b.ownerName || 'Unknown',
          b.name,
          b.tag || '0001',
          b.token,
          b.avatar || 'https://i.imgur.com/pBnhSqE.png',
          b.banner || null,
          b.about || '',
          b.customStatus || '',
          b.prefix || '!',
          b.isPublic ? 1 : 0,
          b.isAiPowered ? 1 : 0,
          b.systemPrompt || '',
          typeof b.commands === 'string' ? b.commands : JSON.stringify(b.commands || []),
          typeof b.autoResponses === 'string' ? b.autoResponses : JSON.stringify(b.autoResponses || []),
          b.welcomeMessage || '',
          typeof b.installedServers === 'string' ? b.installedServers : JSON.stringify(b.installedServers || []),
          b.createdAt || Date.now(),
          typeof b.stats === 'string' ? b.stats : JSON.stringify(b.stats || { messagesSent: 0, serversCount: 0 })
        );
      }
    });
    transaction(globalBots);
  } catch (e) {
    console.error("Error saving bots:", e);
  }
};

function recordBotActivity(bot: any, activity: {
  type: 'command' | 'autoResponse' | 'aiQuery' | 'directMessage';
  name: string;
  trigger: string;
  serverName?: string;
  channelName?: string;
  userName?: string;
  responseSnippet?: string;
}) {
  if (!bot) return;
  if (!bot.stats) {
    bot.stats = normalizeBotStats({}, bot.createdAt, bot.installedServers?.length || 0);
  }

  bot.stats.messagesSent = (bot.stats.messagesSent || 0) + 1;
  bot.stats.totalMessagesProcessed = (bot.stats.totalMessagesProcessed || 0) + 1;
  bot.stats.lastActive = Date.now();
  bot.stats.serversCount = bot.installedServers?.length || 0;
  bot.stats.uptimeHours = Math.max(1, Math.round((Date.now() - (bot.createdAt || Date.now())) / (1000 * 60 * 60)));

  if (activity.type === 'command') {
    bot.stats.commandsUsed = (bot.stats.commandsUsed || 0) + 1;
    if (!bot.stats.commandBreakdown) bot.stats.commandBreakdown = {};
    const cmdKey = activity.name.toLowerCase();
    bot.stats.commandBreakdown[cmdKey] = (bot.stats.commandBreakdown[cmdKey] || 0) + 1;
  } else if (activity.type === 'autoResponse') {
    bot.stats.autoResponsesTriggered = (bot.stats.autoResponsesTriggered || 0) + 1;
  } else if (activity.type === 'aiQuery') {
    bot.stats.aiQueriesHandled = (bot.stats.aiQueriesHandled || 0) + 1;
  }

  // Update daily volume
  const today = new Date().toISOString().split('T')[0];
  if (!Array.isArray(bot.stats.dailyVolume)) {
    bot.stats.dailyVolume = [];
  }
  let dayRecord = bot.stats.dailyVolume.find((d: any) => d.date === today);
  if (!dayRecord) {
    dayRecord = { date: today, messages: 0, commands: 0, aiQueries: 0 };
    bot.stats.dailyVolume.push(dayRecord);
    if (bot.stats.dailyVolume.length > 14) {
      bot.stats.dailyVolume.shift();
    }
  }
  dayRecord.messages += 1;
  if (activity.type === 'command') dayRecord.commands += 1;
  if (activity.type === 'aiQuery') dayRecord.aiQueries = (dayRecord.aiQueries || 0) + 1;

  // Update recent activity
  if (!Array.isArray(bot.stats.recentActivity)) {
    bot.stats.recentActivity = [];
  }
  bot.stats.recentActivity.unshift({
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    type: activity.type,
    name: activity.name,
    trigger: activity.trigger,
    serverName: activity.serverName || 'Server',
    channelName: activity.channelName || 'general',
    userName: activity.userName || 'Member',
    responseSnippet: (activity.responseSnippet || '').slice(0, 120)
  });
  if (bot.stats.recentActivity.length > 30) {
    bot.stats.recentActivity.pop();
  }

  saveBots();
}

const saveUsers = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, password, displayName, avatar, status, customStatus, banner, about, lastSeen, lastUpdated, preferences, security, stories, isVerified, age, birthDate, isPremium)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((users) => {
    for (const u of users) {
      const account = globalAccounts[u.id] || {};
      const savedPassword = account.password || u.password || null;
      upsert.run(
        u.id, u.name, account.email || u.email || null, savedPassword, u.displayName || u.name, u.image || u.avatar || null, u.status || 'offline', u.customStatus || null, u.banner || null, u.about || null, u.lastSeen || Date.now(), u.lastUpdated || Date.now(),
        JSON.stringify(u.preferences || {}), JSON.stringify(u.security || {}), JSON.stringify(u.stories || []), u.isVerified ? 1 : 0,
        account.age || u.age || null, account.birthDate || u.birthDate || null, u.isPremium ? 1 : 0
      );
    }
  });
  transaction(Array.from(globalUsers.values()));
};

const saveMessages = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO messages (id, serverId, channelId, sender, text, timestamp, imageUrl, audioUrl, videoUrl, fileUrl, type, reactions, isEdited, editedAt, otherPerson, isVanish, expiresAt, replyTo, isStarred, starredBy, isForwarded, forwardedFrom)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((messages) => {
    for (const m of messages) {
      upsert.run(
        m.id, m.serverId || null, m.channelId || null, m.sender, m.text || null, m.timestamp, m.imageUrl || null, m.audioUrl || null, m.videoUrl || null, m.fileUrl || null, m.type || null,
        JSON.stringify(m.reactions || {}), m.isEdited ? 1 : 0, m.editedAt || null, m.otherPerson || null, m.isVanish ? 1 : 0, m.expiresAt || null, m.replyTo || null,
        m.isStarred ? 1 : 0, JSON.stringify(m.starredBy || []), m.isForwarded ? 1 : 0, m.forwardedFrom || null
      );
    }
  });
  
  // Combine DM messages and server messages for saving
  const allMessages = [...globalMessages];
  Object.values(globalServerMessages).forEach(channels => {
    Object.values(channels).forEach(msgs => allMessages.push(...msgs));
  });
  transaction(allMessages);
};

const saveServers = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO servers (id, name, ownerId, icon, banner, description, categories, channels, roles, auditLog, bannedUsers, customAssets, createdAt, isPublic, is18Plus, verified, showMemberCount, hasMarketplace, showMarketplaceInDiscovery, marketplaceSettings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((servers) => {
    for (const s of servers) {
      upsert.run(
        s.id, s.name, s.ownerId, s.icon || null, s.banner || null, s.description || null,
        JSON.stringify(s.categories || []), JSON.stringify(s.channels || []), JSON.stringify(s.roles || []),
        JSON.stringify(s.auditLog || []), JSON.stringify(s.bannedUsers || []), JSON.stringify(s.customAssets || {}), s.createdAt || Date.now(),
        s.isPublic ? 1 : 0,
        s.is18Plus ? 1 : 0,
        s.verified ? 1 : 0,
        s.showMemberCount ? 1 : 0,
        s.hasMarketplace ? 1 : 0,
        s.showMarketplaceInDiscovery ? 1 : 0,
        typeof s.marketplaceSettings === 'object' ? JSON.stringify(s.marketplaceSettings) : (s.marketplaceSettings || null)
      );
    }
  });
  transaction(globalServers);
};

const saveGroupChats = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO groupChats (id, name, creator, members, avatar, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((chats) => {
    for (const gc of chats) {
      upsert.run(
        gc.id, gc.name, gc.creator, JSON.stringify(gc.members || []), gc.avatar || null, gc.createdAt || Date.now()
      );
    }
  });
  transaction(globalGroupChats);
};

const saveBlocks = () => {
  db.prepare('DELETE FROM blocks').run();
  const insert = db.prepare('INSERT INTO blocks (userName, blockedName) VALUES (?, ?)');
  const transaction = db.transaction((blocks) => {
    Object.entries(blocks).forEach(([userName, list]: [string, any]) => {
      list.forEach((blockedName: string) => insert.run(userName, blockedName));
    });
  });
  transaction(globalBlocks);
};

const savePersistentSessions = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO sessions (id, userName, ip, userAgent, location, lastActive)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((sessions) => {
    for (const s of sessions) {
      upsert.run(s.id, s.userName, s.ip, s.userAgent, s.location, s.lastActive);
    }
  });
  transaction(persistentSessions);
};

const saveStories = () => {
  // Sync globalStories back to globalUsers to be saved
  Object.keys(globalStories).forEach(userId => {
    const user = globalUsers.get(userId);
    if (user) {
      user.stories = globalStories[userId];
    }
  });
  saveUsers();
};

const saveVanishModes = () => {
  // Not explicitly persisted in schema yet, but could be added to sessions or users
};

const saveFriendRequests = () => {
  db.prepare('DELETE FROM friends').run();
  const insert = db.prepare('INSERT INTO friends (userName, friendName, status) VALUES (?, ?, ?)');
  const transaction = db.transaction((requests) => {
    Object.entries(requests).forEach(([userName, list]: [string, any]) => {
      list.forEach((req: any) => insert.run(userName, req.from, req.status));
    });
  });
  transaction(globalFriendRequests);
};

const saveServerMembers = () => {
  // Not strictly stored in a separate table, member persistence is handled via servers table or could be a dedicated members table.
  // For simplicity keeping as is but we should probably have a server_members table.
};

const saveAccounts = () => {
  for (const [username, account] of Object.entries(globalAccounts)) {
    if (!globalUsers.has(username)) {
      globalUsers.set(username, {
        id: username,
        name: username,
        displayName: username,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        status: 'offline',
        age: account.age || 18,
        birthDate: account.birthDate || null,
        lastSeen: Date.now()
      });
    }
  }
  saveUsers();
};

const saveGroupChatMessages = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO messages (id, serverId, channelId, sender, text, timestamp, imageUrl, audioUrl, videoUrl, fileUrl, type, reactions, isEdited, editedAt, otherPerson, isVanish, expiresAt, replyTo, isStarred, starredBy, isForwarded, forwardedFrom)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((messagesMap) => {
    Object.entries(messagesMap).forEach(([groupId, msgs]: [string, any]) => {
      msgs.forEach((m: any) => {
        upsert.run(
          m.id, null, null, m.sender, m.text || null, m.timestamp, m.imageUrl || null, m.audioUrl || null, m.videoUrl || null, m.fileUrl || null, m.type || 'group',
          JSON.stringify(m.reactions || {}), m.isEdited ? 1 : 0, m.editedAt || null, groupId, 0, null, m.replyTo || null,
          m.isStarred ? 1 : 0, JSON.stringify(m.starredBy || []), m.isForwarded ? 1 : 0, m.forwardedFrom || null
        );
      });
    });
  });
  transaction(globalGroupChatMessages);
};

const savePresets = () => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO presets (id, name, creator, config, isPublic, downloads, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((presets) => {
    for (const p of presets) {
      upsert.run(
        p.id, p.name, p.creator, JSON.stringify(p.config || {}), p.isPublic ? 1 : 0, p.downloads || 0, p.createdAt || Date.now()
      );
    }
  });
  transaction(globalPresets);
};

const saveScheduledMessages = () => {
  try {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO scheduled_messages (id, sender, targetType, targetId, channelId, message, scheduledFor, createdAt, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const transaction = db.transaction((list: any[]) => {
      for (const s of list) {
        upsert.run(
          s.id,
          s.sender,
          s.targetType,
          s.targetId,
          s.channelId || null,
          typeof s.message === 'string' ? s.message : JSON.stringify(s.message || {}),
          s.scheduledFor,
          s.createdAt || Date.now(),
          s.status || 'pending'
        );
      }
    });
    transaction(globalScheduledMessages);
  } catch (e) {
    console.error("Error saving scheduled messages:", e);
  }
};

const DEFAULT_SERVERS = [
  { 
    id: '1', 
    name: 'Vylant Official', 
    initials: 'VO', 
    image: 'https://i.imgur.com/H3OS5zA.png',
    verified: true,
    isPublic: true,
    color: 'bg-vylant-blue',
    ownerId: 't0ai-assistant',
    categories: [
      { id: 'cat1', name: 'Information' },
      { id: 'cat2', name: 'Community' },
      { id: 'cat3', name: 'Voice' }
    ],
    channels: [
      { id: 'c1', name: 'general', type: 'text', categoryId: 'cat2' },
      { id: 'c2', name: 'announcements', type: 'text', categoryId: 'cat1' },
      { id: 'v1', name: 'Voice Lounge', type: 'voice', categoryId: 'cat3' },
      { id: 'v2', name: 'Gaming Channel', type: 'voice', categoryId: 'cat3' }
    ]
  }
];

// Seed default servers if not present
if (globalServers.length === 0) {
  globalServers = [...DEFAULT_SERVERS];
} else if (!globalServers.some(s => s.id === '1')) {
  globalServers.push(DEFAULT_SERVERS[0]);
}

// Ensure the Vylant Official server is always verified and has the correct official logo image
const officialServer = globalServers.find(s => s.id === '1');
if (officialServer) {
  officialServer.verified = true;
  officialServer.image = 'https://i.imgur.com/H3OS5zA.png';
  saveServers();
}

// Clean up expired vanish messages periodically
setInterval(() => {
  const now = Date.now();
  const initialLength = globalMessages.length;
  globalMessages = globalMessages.filter(m => !m.expiresAt || m.expiresAt > now);
  if (globalMessages.length !== initialLength) {
    saveMessages();
  }

  // Clean up expired stories
  const nowStories = Date.now();
  let storiesChanged = false;
  Object.keys(globalStories).forEach(userId => {
    const initialCount = globalStories[userId].length;
    globalStories[userId] = globalStories[userId].filter(s => s.expiresAt > nowStories);
    if (globalStories[userId].length !== initialCount) {
      storiesChanged = true;
    }
    if (globalStories[userId].length === 0) {
      delete globalStories[userId];
    }
  });
  if (storiesChanged) {
    saveStories();
  }
}, 5000);

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  app.set('trust proxy', true);
  // CORS origin from environment variable (default: https://vylant.com)
  const corsOrigin = process.env.CORS_ORIGIN || "https://vylant.com";
  app.use(cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  // HTTP Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // Enable CORS preflight caching
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Max-Age", "86400");
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Handle malformed JSON payloads and oversized payloads
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: "Malformed JSON payload" });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: "Payload too large" });
    }
    next(err);
  });

  // Request logging middleware for debugging API errors
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip} - X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    }
    next();
  });

  // General rate limiter: 50000 requests per 15 minutes
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 50000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    keyGenerator: (req, res) => {
      // Use IP + User Agent to distinguish between different devices on the same network
      return `${ipKeyGenerator(req.ip || '0.0.0.0')}-${req.headers['user-agent'] || 'no-ua'}`;
    },
    validate: { xForwardedForHeader: false, default: false }
  });

  // Auth rate limiter: 20 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many authentication attempts, please try again in 15 minutes." },
    keyGenerator: (req, res) => {
      // For auth, also include the attempted username if available
      const username = req.body?.username || 'no-user';
      return `${ipKeyGenerator(req.ip || '0.0.0.0')}-${req.headers['user-agent'] || 'no-ua'}-${username}`;
    },
    validate: { xForwardedForHeader: false, default: false }
  });

  const getLocation = async (ip: string) => {
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      return 'Local Network';
    }
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      if (response.ok) {
        const data = await response.json();
        if (data.city && data.country_name) {
          return `${data.city}, ${data.country_name}`;
        }
      }
    } catch (e) {
      console.error('Location lookup failed:', e);
    }
    return 'Unknown Location';
  };

  const parseUA = (ua: string) => {
    let deviceName = 'Web Browser';
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('iphone')) deviceName = 'iPhone';
    else if (uaLower.includes('android')) deviceName = 'Android Device';
    else if (uaLower.includes('windows')) deviceName = 'Windows PC';
    else if (uaLower.includes('macintosh')) deviceName = 'Mac';
    else if (uaLower.includes('linux')) deviceName = 'Linux PC';

    const browser = uaLower.includes('chrome') ? 'Chrome' : 
                    uaLower.includes('firefox') ? 'Firefox' : 
                    uaLower.includes('safari') ? 'Safari' : 
                    uaLower.includes('edge') ? 'Edge' : 'Browser';
    
    return { deviceName, browser };
  };

  const addPersistentSession = async (userName: string, ua: string, ip: string, socketId?: string) => {
    const { deviceName, browser } = parseUA(ua);
    const location = await getLocation(ip);
    
    // Check if a similar session already exists for this device/browser/IP combination
    const existingIdx = persistentSessions.findIndex(s => 
      s.userName === userName && 
      s.deviceName === deviceName && 
      s.browser === browser && 
      s.ip === ip
    );

    const sessionId = socketId || `sess_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      userName,
      deviceName,
      browser,
      location,
      ip,
      lastActive: Date.now(),
      createdAt: Date.now(),
      active: true
    };

    if (existingIdx !== -1) {
      persistentSessions[existingIdx] = { 
        ...persistentSessions[existingIdx], 
        ...session, 
        id: persistentSessions[existingIdx].id, // Keep original ID
        createdAt: persistentSessions[existingIdx].createdAt 
      };
    } else {
      persistentSessions.push(session);
    }
    
    savePersistentSessions();
    return session;
  };

  // Apply general limiter to all /api routes
  app.use("/api", generalLimiter);

  // Apply strict limiter to auth routes
  app.use("/api/login", authLimiter);
  app.use("/api/signup", authLimiter);
  app.use("/api/change-password", authLimiter);
  app.use("/api/migrate-accounts", authLimiter);

  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // Increase to 100 MB for optimized calling signaling and large message payloads
  });
  const PORT = 3000;

  // Dispatch scheduled message helper
  const dispatchScheduledMessage = (sched: any) => {
    if (sched.status !== 'pending') return false;

    const msg = {
      ...sched.message,
      id: sched.message?.id || sched.id,
      timestamp: Date.now()
    };

    if (sched.targetType === 'dm') {
      const sender = sched.sender;
      const receiver = sched.targetId;

      const senderBlocks = (globalBlocks[sender] || []).map(b => b.toLowerCase());
      const receiverBlocks = (globalBlocks[receiver] || []).map(b => b.toLowerCase());

      if (senderBlocks.includes(receiver.toLowerCase()) || receiverBlocks.includes(sender.toLowerCase())) {
        sched.status = 'failed';
        saveScheduledMessages();
        io.to(`user:${sender}`).emit("scheduled-message-failed", { scheduledId: sched.id, error: "User is blocked" });
        return false;
      }

      globalMessages.push({
        ...msg,
        sender,
        receiver,
        otherPerson: receiver,
        timestamp: Date.now()
      });
      saveMessages();

      io.to(`user:${sender}`).emit("new-dm-message", { message: msg, otherPerson: receiver });
      if (receiver !== sender) {
        io.to(`user:${receiver}`).emit("new-dm-message", { message: msg, otherPerson: sender });
      }
    } else if (sched.targetType === 'group') {
      const groupId = sched.targetId;
      if (!globalGroupChatMessages[groupId]) {
        globalGroupChatMessages[groupId] = [];
      }
      const safeMessage = {
        ...msg,
        isVanish: false,
        expiresAt: undefined
      };
      globalGroupChatMessages[groupId].push(safeMessage);
      if (globalGroupChatMessages[groupId].length > 100) {
        globalGroupChatMessages[groupId].shift();
      }
      saveGroupChatMessages();

      io.to(`group:${groupId}`).emit("new-group-chat-message", { groupId, message: safeMessage });
    } else if (sched.targetType === 'server') {
      const serverId = sched.targetId;
      const channelId = sched.channelId;
      const room = `${serverId}:${channelId}`;

      if (!globalServerMessages[serverId]) {
        globalServerMessages[serverId] = {};
      }
      if (!globalServerMessages[serverId][channelId]) {
        globalServerMessages[serverId][channelId] = [];
      }

      globalServerMessages[serverId][channelId].push(msg);
      saveMessages();

      io.to(room).emit("new-server-message", { serverId, channelId, message: msg });
    }

    sched.status = 'sent';
    sched.sentAt = Date.now();
    saveScheduledMessages();

    io.to(`user:${sched.sender}`).emit("scheduled-message-sent", {
      scheduledId: sched.id,
      targetType: sched.targetType,
      targetId: sched.targetId,
      channelId: sched.channelId,
      message: msg
    });

    return true;
  };

  // Background interval to check and dispatch scheduled messages
  setInterval(() => {
    const now = Date.now();
    const pending = globalScheduledMessages.filter(s => s.status === 'pending' && s.scheduledFor <= now);
    for (const item of pending) {
      try {
        dispatchScheduledMessage(item);
      } catch (err) {
        console.error("Error dispatching scheduled message:", err);
      }
    }
  }, 1000);

  // Input sanitization middleware
  const sanitizePayload = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove null bytes and trim whitespace
      return obj.replace(/\0/g, '').trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizePayload);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = sanitizePayload(value);
      }
      return sanitized;
    }
    return obj;
  };

  app.use((req, res, next) => {
    if (req.body) req.body = sanitizePayload(req.body);
    if (req.query) req.query = sanitizePayload(req.query);
    if (req.params) req.params = sanitizePayload(req.params);
    next();
  });

  // ========================
  // Centralized Input Validation
  // ========================

  // Allowed string types for general API fields
  const ALLOWED_STRING_TYPES = new Set(["string", "number", "boolean", "object", "array", "null"]);

  // Validate a single field against a schema
  interface FieldSchema {
    type?: "string" | "number" | "boolean" | "array" | "object" | "null" | "mixed";
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    whitelist?: string[];
    allowedTypes?: string[];
    name?: string;  // Field name key (e.g. "username")
  }

  const validateField = (value: any, schema: FieldSchema): any => {
    if (schema.required !== false && value === undefined) {
      throw new ApiValidationError(`Missing required field: ${schema.required === true ? "field" : schema.name}`);
    }
    if (value === undefined) return value;

    if (schema.allowedTypes && !schema.allowedTypes.includes(typeof value)) {
      throw new ApiValidationError(`Invalid type for ${schema.name}: expected ${schema.allowedTypes.join(" | ")}, got ${typeof value}`);
    }

    if (schema.type && typeof value !== schema.type) {
      throw new ApiValidationError(`Invalid type for ${schema.name}: expected ${schema.type}, got ${typeof value}`);
    }

    if (typeof value === "string") {
      if (schema.minLength != null && value.length < schema.minLength) {
        throw new ApiValidationError(`Field ${schema.name} must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength != null && value.length > schema.maxLength) {
        throw new ApiValidationError(`Field ${schema.name} must be at most ${schema.maxLength} characters`);
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        throw new ApiValidationError(`Field ${schema.name} does not match required pattern`);
      }
      if (schema.whitelist && !schema.whitelist.includes(value)) {
        throw new ApiValidationError(`Field ${schema.name} must be one of: ${schema.whitelist.join(", ")}`);
      }
    }

    if (typeof value === "number") {
      if (schema.min != null && value < schema.min) {
        throw new ApiValidationError(`Field ${schema.name} must be at least ${schema.min}`);
      }
      if (schema.max != null && value > schema.max) {
        throw new ApiValidationError(`Field ${schema.name} must be at most ${schema.max}`);
      }
    }

    if (Array.isArray(value)) {
      if (schema.minLength != null && value.length < schema.minLength) {
        throw new ApiValidationError(`Field ${schema.name} must contain at least ${schema.minLength} items`);
      }
      if (schema.maxLength != null && value.length > schema.maxLength) {
        throw new ApiValidationError(`Field ${schema.name} must contain at most ${schema.maxLength} items`);
      }
    }

    return value;
  };

  class ApiValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ApiValidationError";
    }
  }

  // Validate request body against a schema object
  const validateBody = (schema: Record<string, FieldSchema>) => {
    return (req: CustomRequest, res: any, next: any) => {
      try {
        const validated: Record<string, any> = {};
        for (const [key, fieldSchema] of Object.entries(schema)) {
          if (fieldSchema.required === true) {
            if (key in req.body) {
              validated[key] = validateField(req.body[key], { ...fieldSchema, name: key });
            } else {
              throw new ApiValidationError(`Missing required field: ${key}`);
            }
          } else if (key in req.body) {
            validated[key] = validateField(req.body[key], { ...fieldSchema, name: key });
          }
        }
        req.validatedBody = validated;
        next();
      } catch (err) {
        if (err instanceof ApiValidationError) {
          return res.status(400).json({ error: "Validation failed", details: err.message });
        }
        next(err);
      }
    };
  };

  // Validate query parameters
  const validateQuery = (schema: Record<string, FieldSchema>) => {
    return (req: CustomRequest, res: any, next: any) => {
      try {
        const validated: Record<string, any> = {};
        for (const [key, fieldSchema] of Object.entries(schema)) {
          if (fieldSchema.required === true) {
            if (key in req.query) {
              validated[key] = validateField(req.query[key], { ...fieldSchema, name: key });
            } else {
              throw new ApiValidationError(`Missing required query parameter: ${key}`);
            }
          } else if (key in req.query) {
            validated[key] = validateField(req.query[key], { ...fieldSchema, name: key });
          }
        }
        req.validatedQuery = validated;
        next();
      } catch (err) {
        if (err instanceof ApiValidationError) {
          return res.status(400).json({ error: "Validation failed", details: err.message });
        }
        next(err);
      }
    };
  };

  // Validate URL parameters
  const validateParams = (schema: Record<string, FieldSchema>) => {
    return (req: any, res: any, next: any) => {
      try {
        const validated: Record<string, any> = {};
        for (const [key, fieldSchema] of Object.entries(schema)) {
          if (fieldSchema.required === true) {
            if (key in req.params) {
              validated[key] = validateField(req.params[key], { ...fieldSchema, name: key });
            } else {
              throw new ApiValidationError(`Missing required parameter: ${key}`);
            }
          } else if (key in req.params) {
            validated[key] = validateField(req.params[key], { ...fieldSchema, name: key });
          }
        }
        req.validatedParams = validated;
        next();
      } catch (err) {
        if (err instanceof ApiValidationError) {
          return res.status(400).json({ error: "Validation failed", details: err.message });
        }
        next(err);
      }
    };
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // File Upload API
  app.post("/api/upload", authenticateToken, upload.single('file'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get("/api/test", (req, res) => {
    res.json({ test: "ok" });
  });

  // Vylant SafeLink Realtime Scanner API
  app.post("/api/safelink/scan", (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return res.json({
          safe: false,
          score: 20,
          status: 'malformed',
          message: 'Invalid URL structure'
        });
      }

      const hostname = parsed.hostname.toLowerCase();
      const isHttps = parsed.protocol === 'https:';
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      const isDangerousExt = /\.(exe|scr|bat|cmd|pif|vbs|msi|ps1|apk|jar)$/i.test(parsed.pathname);
      
      let status = 'safe';
      let score = 100;
      const reasons = [];

      if (!isHttps) {
        score -= 30;
        reasons.push('Insecure HTTP connection');
      }
      if (isIp) {
        score -= 50;
        status = 'suspicious';
        reasons.push('Numerical IP address host');
      }
      if (isDangerousExt) {
        score -= 60;
        status = 'dangerous';
        reasons.push('Executable payload extension');
      }

      res.json({
        safe: score >= 70,
        score: Math.max(0, score),
        status,
        hostname,
        reasons,
        cleanUrl: url
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GIF Search & Trending Proxy API
  app.get("/api/gifs/trending", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 24, 50);
      // Try Tenor or Giphy public endpoints
      const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=LIVD8nKuikuSIRENHGUCAu0grUM55rxIl&limit=${limit}&rating=g`, {
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const data = await response.json();
        const results = (data.data || []).map((item: any) => ({
          id: item.id,
          title: item.title || 'Animated GIF',
          url: item.images?.original?.url || item.images?.fixed_height?.url || item.url,
          previewUrl: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url || item.images?.original?.url,
          width: Number(item.images?.original?.width || 0),
          height: Number(item.images?.original?.height || 0),
          source: 'giphy'
        }));
        return res.json({ results });
      }
    } catch (e) {
      // Fallback
    }
    return res.json({ results: [] });
  });

  app.get("/api/gifs/search", async (req, res) => {
    try {
      const query = (req.query.q as string || '').trim();
      const limit = Math.min(Number(req.query.limit) || 24, 50);
      if (!query) {
        return res.json({ results: [] });
      }
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=LIVD8nKuikuSIRENHGUCAu0grUM55rxIl&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`, {
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const data = await response.json();
        const results = (data.data || []).map((item: any) => ({
          id: item.id,
          title: item.title || query,
          url: item.images?.original?.url || item.images?.fixed_height?.url || item.url,
          previewUrl: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url || item.images?.original?.url,
          width: Number(item.images?.original?.width || 0),
          height: Number(item.images?.original?.height || 0),
          source: 'giphy'
        }));
        return res.json({ results });
      }
    } catch (e) {
      // Fallback
    }
    return res.json({ results: [] });
  });

  // ICE Servers for WebRTC (STUN/TURN)
  app.get("/api/config/ice-servers", (req, res) => {
    // Default to public STUN servers. In a real production environment, 
    // you would use a TURN server like Coturn.
    res.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ]
    });
  });

  // Cross-Platform App Downloads (Mac, iOS, Android, Linux, Windows)
  const ICON_URL = 'https://i.imgur.com/H3OS5zA.png';

  const getBaseAppUrl = (req: express.Request) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'vylant.net';
    return `${protocol}://${host}`;
  };

  // macOS App Installer (.command)
  app.get("/api/download/mac", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `#!/bin/bash
clear
echo "======================================================================"
echo "                    Vylant macOS App Installer                        "
echo "======================================================================"
echo ""
APP_URL="${appUrl}"
ICON_URL="${ICON_URL}"
APP_NAME="Vylant"
APP_DIR="$HOME/Applications/$APP_NAME.app"
DESKTOP_DIR="$HOME/Desktop"

echo "[1/4] Preparing macOS Application Bundle at ~/Applications/$APP_NAME.app..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

echo "[2/4] Downloading high-resolution Vylant app icon..."
curl -s -L "$ICON_URL" -o "$APP_DIR/Contents/Resources/icon.png" 2>/dev/null || wget -q "$ICON_URL" -O "$APP_DIR/Contents/Resources/icon.png" 2>/dev/null

echo "[3/4] Creating native standalone launch script..."
cat << 'EOF' > "$APP_DIR/Contents/MacOS/Vylant"
#!/bin/bash
URL="\${APP_URL}"
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="$URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$URL"
elif [ -d "/Applications/Chromium.app" ]; then
    open -na "Chromium" --args --app="$URL"
else
    open "$URL"
fi
EOF

chmod +x "$APP_DIR/Contents/MacOS/Vylant"

cat << EOF > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Vylant</string>
    <key>CFBundleIconFile</key>
    <string>icon.png</string>
    <key>CFBundleIdentifier</key>
    <string>net.vylant.app</string>
    <key>CFBundleName</key>
    <string>Vylant</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "[4/4] Creating Desktop Shortcut..."
if [ -d "$DESKTOP_DIR" ]; then
    ln -sf "$APP_DIR" "$DESKTOP_DIR/$APP_NAME.app"
fi
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_DIR" 2>/dev/null || true

echo ""
echo "======================================================================"
echo " [✓] Vylant Desktop App installed successfully on your Mac!"
echo "     • Installed to: ~/Applications/Vylant.app"
echo "     • Desktop Shortcut created: ~/Desktop/Vylant.app"
echo "======================================================================"
echo ""
echo "Launching Vylant..."
open "$APP_DIR"
`;
    res.setHeader('Content-Disposition', 'attachment; filename="Vylant-macOS-Installer.command"');
    res.setHeader('Content-Type', 'application/x-sh');
    res.send(content);
  });

  // macOS Webloc Shortcut (.webloc)
  app.get("/api/download/mac-webloc", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>${appUrl}</string>
</dict>
</plist>`;
    res.setHeader('Content-Disposition', 'attachment; filename="Vylant.webloc"');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(content);
  });

  // Linux Installer Script (.sh)
  app.get("/api/download/linux", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `#!/bin/bash
set -e
clear
echo "======================================================================"
echo "                   Vylant Linux Desktop App Setup                     "
echo "======================================================================"
echo ""
APP_URL="${appUrl}"
ICON_URL="${ICON_URL}"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICONS_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
DESKTOP_USER="$HOME/Desktop"

echo "[1/4] Creating local XDG app directories..."
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICONS_DIR"
mkdir -p "$HOME/.local/share/icons"

echo "[2/4] Downloading high-resolution Vylant icon..."
if command -v curl &> /dev/null; then
    curl -s -L "$ICON_URL" -o "$ICONS_DIR/vylant.png" 2>/dev/null || true
elif command -v wget &> /dev/null; then
    wget -q "$ICON_URL" -O "$ICONS_DIR/vylant.png" 2>/dev/null || true
fi
cp -f "$ICONS_DIR/vylant.png" "$HOME/.local/share/icons/vylant.png" 2>/dev/null || true

echo "[3/4] Creating launcher binary ($BIN_DIR/vylant)..."
cat << 'EOF' > "$BIN_DIR/vylant"
#!/bin/bash
URL="\${APP_URL}"
if command -v google-chrome &> /dev/null; then
    google-chrome --app="$URL" "$@" &
elif command -v brave-browser &> /dev/null; then
    brave-browser --app="$URL" "$@" &
elif command -v chromium &> /dev/null; then
    chromium --app="$URL" "$@" &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --app="$URL" "$@" &
elif command -v microsoft-edge &> /dev/null; then
    microsoft-edge --app="$URL" "$@" &
elif command -v firefox &> /dev/null; then
    firefox --new-window "$URL" "$@" &
elif command -v xdg-open &> /dev/null; then
    xdg-open "$URL" &
else
    echo "Open $URL in your browser."
fi
EOF

chmod +x "$BIN_DIR/vylant"

echo "[4/4] Creating Desktop Entry ($DESKTOP_DIR/vylant.desktop)..."
cat << EOF > "$DESKTOP_DIR/vylant.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=Vylant
GenericName=Chat & Communication Platform
Comment=Vylant High-Fidelity Communication Platform
Exec=$BIN_DIR/vylant %u
Icon=vylant
Terminal=false
Categories=Network;InstantMessaging;Chat;AudioVideo;
Keywords=vylant;chat;messaging;voice;call;community;
StartupWMClass=vylant
StartupNotify=true
MimeType=x-scheme-handler/vylant;
EOF

chmod +x "$DESKTOP_DIR/vylant.desktop"

if [ -d "$DESKTOP_USER" ]; then
    cp -f "$DESKTOP_DIR/vylant.desktop" "$DESKTOP_USER/vylant.desktop"
    chmod +x "$DESKTOP_USER/vylant.desktop" 2>/dev/null || true
    if command -v gio &> /dev/null; then
        gio set "$DESKTOP_USER/vylant.desktop" metadata::trusted true 2>/dev/null || true
    fi
fi

if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "======================================================================"
echo " [✓] Vylant Desktop App has been installed on Linux!"
echo "     • Launcher Binary: $BIN_DIR/vylant"
echo "     • Desktop Entry:   $DESKTOP_DIR/vylant.desktop"
echo "======================================================================"
echo ""
echo "Launching Vylant..."
"$BIN_DIR/vylant" &
`;
    res.setHeader('Content-Disposition', 'attachment; filename="vylant-linux-installer.sh"');
    res.setHeader('Content-Type', 'application/x-sh');
    res.send(content);
  });

  // Linux Desktop Entry (.desktop)
  app.get("/api/download/linux-desktop", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `[Desktop Entry]
Version=1.0
Type=Application
Name=Vylant
GenericName=Chat & Communication Platform
Comment=Vylant High-Fidelity Communication Platform
Exec=xdg-open "${appUrl}"
Icon=${ICON_URL}
Terminal=false
Categories=Network;InstantMessaging;Chat;AudioVideo;
Keywords=vylant;chat;messaging;voice;call;community;
StartupWMClass=vylant
`;
    res.setHeader('Content-Disposition', 'attachment; filename="vylant.desktop"');
    res.setHeader('Content-Type', 'application/x-desktop');
    res.send(content);
  });

  // iOS WebClip Profile (.mobileconfig)
  app.get("/api/download/ios", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>Vylant</string>
			<key>PayloadDescription</key>
			<string>Installs the official Vylant Standalone Web App onto your iOS Home Screen.</string>
			<key>PayloadDisplayName</key>
			<string>Vylant</string>
			<key>PayloadIdentifier</key>
			<string>net.vylant.ios.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>4B8380BC-3AE7-48DF-928A-5BCF8E7E0824</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>${appUrl}</string>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>Vylant High-Fidelity Communication Platform for iPhone &amp; iPad</string>
	<key>PayloadDisplayName</key>
	<string>Vylant App</string>
	<key>PayloadIdentifier</key>
	<string>net.vylant.ios.profile</string>
	<key>PayloadOrganization</key>
	<string>Vylant</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>E713E537-88D8-46E0-B77D-A2A9D48A14EB</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;
    res.setHeader('Content-Disposition', 'attachment; filename="Vylant.mobileconfig"');
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.send(content);
  });

  // Android Web Helper (.html)
  app.get("/api/download/android", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Install Vylant on Android</title>
  <link rel="manifest" href="${appUrl}/manifest.json">
  <meta name="theme-color" content="#00c3ff">
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #090b10;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-sizing: border-box;
    }
    .logo {
      width: 88px;
      height: 88px;
      border-radius: 24px;
      box-shadow: 0 0 40px rgba(0, 195, 255, 0.3);
      margin-bottom: 20px;
      border: 2px solid #00c3ff;
    }
    h1 { font-size: 26px; font-weight: 900; margin: 0 0 8px 0; }
    p { color: rgba(255, 255, 255, 0.7); font-size: 15px; margin: 0 0 28px 0; max-width: 320px; line-height: 1.5; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 320px;
      padding: 16px 24px;
      background: #00c3ff;
      color: #000000;
      font-weight: 800;
      font-size: 16px;
      border-radius: 16px;
      text-decoration: none;
      box-shadow: 0 0 30px rgba(0, 195, 255, 0.35);
      border: none;
      cursor: pointer;
      margin-bottom: 14px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 20px;
      max-width: 320px;
      text-align: left;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 10px;
    }
    .card ol { margin: 8px 0 0 0; padding-left: 20px; }
    .card li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <img src="${ICON_URL}" alt="Vylant" class="logo">
  <h1>Install Vylant App</h1>
  <p>Add Vylant to your Android home screen for instant full-screen communication.</p>
  <a href="${appUrl}" class="btn" id="installBtn">Launch &amp; Install App</a>
  <div class="card">
    <strong style="color:#00c3ff;">How to install on Chrome:</strong>
    <ol>
      <li>Tap <strong>Launch &amp; Install</strong> above.</li>
      <li>Tap the <strong>&#8942;</strong> (3 dots) menu in Chrome.</li>
      <li>Select <strong>Install App</strong> (or <strong>Add to Home screen</strong>).</li>
    </ol>
  </div>
</body>
</html>`;
    res.setHeader('Content-Disposition', 'attachment; filename="Vylant-Android-Install.html"');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  });

  // Windows Standalone Launcher (.bat)
  app.get("/api/download/windows", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `@echo off
title Vylant Launcher Setup
echo ======================================================
echo          Vylant Standalone Desktop App Setup
echo ======================================================
echo.
set "APP_URL=${appUrl}"
set "ICON_URL=${ICON_URL}"
set "DESKTOP_DIR=%USERPROFILE%\\Desktop"
set "APP_DIR=%LOCALAPPDATA%\\VylantApp"
set "ICON_PATH=%APP_DIR%\\vylant_logo.png"
set "SHORTCUT_PATH=%DESKTOP_DIR%\\Vylant.url"

if not exist "%APP_DIR%" mkdir "%APP_DIR%"

echo [1/2] Downloading high-resolution Vylant icon...
powershell -Command "try { (New-Object System.Net.WebClient).DownloadFile('%ICON_URL%', '%ICON_PATH%') } catch {}" 2>nul

echo [2/2] Creating Vylant Desktop Shortcut...
echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=%APP_URL% >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
if exist "%ICON_PATH%" (
  echo IconFile=%ICON_PATH% >> "%SHORTCUT_PATH%"
)

echo.
echo ======================================================
echo  [!] Vylant Desktop Shortcut created successfully!
echo  [!] Launching Vylant in Standalone Window mode...
echo ======================================================
echo.
start "" chrome --app="%APP_URL%" 2>nul || start "" brave --app="%APP_URL%" 2>nul || start "" msedge --app="%APP_URL%" 2>nul || start "" "%APP_URL%"
exit
`;
    res.setHeader('Content-Disposition', 'attachment; filename="Vylant.bat"');
    res.setHeader('Content-Type', 'application/x-bat');
    res.send(content);
  });

  // Windows Web Shortcut (.url)
  app.get("/api/download/windows-url", (req, res) => {
    const appUrl = getBaseAppUrl(req);
    const content = `[InternetShortcut]
URL=${appUrl}
IconIndex=0
IconFile=${ICON_URL}
`;
    res.setHeader('Content-Disposition', 'attachment; filename="Vylant.url"');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(content);
  });

  // Gemini AI Backend Integration
  app.post("/api/gemini", authenticateToken, async (req: any, res: any) => {
    const { prompt, history, stream } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: "Gemini AI is not configured on this server." });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await ai.models.generateContentStream({
          model: "gemini-2.0-flash",
          contents: prompt
        });

        for await (const chunk of response) {
          const chunkText = chunk.text;
          if (chunkText) {
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt
        });
        res.json({ text: response.text });
      }
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: "Failed to communicate with AI service." });
    }
  });

  app.post("/api/migrate-accounts", (req, res) => {
    const { accounts } = req.body;
    if (accounts && typeof accounts === 'object') {
      let changed = false;
      for (const [username, accountData] of Object.entries(accounts)) {
        if (!globalAccounts[username]) {
          globalAccounts[username] = typeof accountData === 'string' 
            ? { password: accountData, createdAt: new Date().toISOString() }
            : accountData;
          changed = true;
        }
      }
      if (changed) saveAccounts();
    }
    res.json({ success: true });
  });

  // Password reset code storage
  const resetCodes = new Map<string, { code: string, expires: number }>();

  app.post("/api/forgot-password/send-code", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const trimmedEmail = email.trim();
    const username = Object.keys(globalAccounts).find(key => globalAccounts[key].email && globalAccounts[key].email.toLowerCase() === trimmedEmail.toLowerCase());
    
    if (username) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      resetCodes.set(trimmedEmail, { 
        code, 
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes
      });
      
      console.log(`\x1b[36m[DEBUG] Reset code for ${trimmedEmail}: ${code}\x1b[0m`);
      
      // Async send email
      sendVerificationEmail(trimmedEmail, code, 'password');
      
      return res.json({ success: true, message: "Verification code sent to email" });
    }

    res.status(404).json({ error: "Account not found with this email" });
  });

  app.post("/api/forgot-password/verify-code", (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }
    
    const trimmedEmail = email.trim();
    const stored = resetCodes.get(trimmedEmail);
    
    if (!stored || stored.code !== code) {
      return res.status(403).json({ error: "Invalid verification code" });
    }
    
    if (Date.now() > stored.expires) {
      resetCodes.delete(trimmedEmail);
      return res.status(403).json({ error: "Verification code has expired" });
    }
    
    const username = Object.keys(globalAccounts).find(key => globalAccounts[key].email && globalAccounts[key].email.toLowerCase() === trimmedEmail.toLowerCase());
    if (!username) return res.status(404).json({ error: "User not found" });

    // Code is valid, generate a short-lived recovery token for the final reset
    const recoveryToken = jwt.sign({ username, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '15m' });
    resetCodes.delete(trimmedEmail); // Clean up
    
    return res.json({ success: true, recoveryToken });
  });

  app.post("/api/forgot-password/reset", (req, res) => {
    const { recoveryToken, newPassword } = req.body;
    if (!recoveryToken || !newPassword) {
      return res.status(400).json({ error: "Recovery token and new password are required" });
    }
    try {
      const decoded: any = jwt.verify(recoveryToken, JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(403).json({ error: "Invalid token purpose" });
      }
      
      const username = decoded.username;
      if (globalAccounts[username]) {
        const salt = bcrypt.genSaltSync(10);
        globalAccounts[username].password = bcrypt.hashSync(newPassword.trim(), salt);
        saveAccounts();
        return res.json({ success: true });
      }
      res.status(404).json({ error: "Account not found" });
    } catch (err) {
      res.status(403).json({ error: "Invalid or expired recovery token" });
    }
  });

  // Email change code storage
  const changeEmailCodes = new Map<string, { code: string, expires: number, verified: boolean }>();

  app.post("/api/settings/email/send-code", authenticateToken, async (req: any, res: any) => {
    const username = req.user.username;
    const account = globalAccounts[username];
    
    if (!account) return res.status(404).json({ error: "Account not found" });
    
    // If user has no email, they don't need to verify an old one, 
    // but the request asks to verify "current email" if it exists.
    if (!account.email) {
      return res.json({ success: true, needsVerification: false });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    changeEmailCodes.set(username, { 
      code, 
      expires: Date.now() + 10 * 60 * 1000, 
      verified: false 
    });
    
    console.log(`\x1b[36m[DEBUG] Email change code for ${username} (${account.email}): ${code}\x1b[0m`);
    
    await sendVerificationEmail(account.email, code, 'email');
    
    res.json({ success: true, needsVerification: true, email: account.email });
  });

  app.post("/api/settings/email/verify-code", authenticateToken, (req: any, res: any) => {
    const { code } = req.body;
    const username = req.user.username;
    
    const stored = changeEmailCodes.get(username);
    if (!stored || stored.code !== code) {
      return res.status(403).json({ error: "Invalid verification code" });
    }
    
    if (Date.now() > stored.expires) {
      changeEmailCodes.delete(username);
      return res.status(403).json({ error: "Verification code has expired" });
    }
    
    stored.verified = true;
    res.json({ success: true });
  });

  app.post("/api/settings/email/update", authenticateToken, (req: any, res: any) => {
    const { newEmail } = req.body;
    const username = req.user.username;
    
    if (!newEmail) return res.status(400).json({ error: "New email is required" });
    
    const account = globalAccounts[username];
    if (!account) return res.status(404).json({ error: "Account not found" });

    // If they had an email, they MUST have verified it
    if (account.email) {
      const stored = changeEmailCodes.get(username);
      if (!stored || !stored.verified) {
        return res.status(403).json({ error: "Current email not verified. Please verify your current email first." });
      }
    }

    // Check if email is already taken by another account
    const existingAccount = Object.keys(globalAccounts).find(key => 
      key !== username && globalAccounts[key].email && globalAccounts[key].email.toLowerCase() === newEmail.trim().toLowerCase()
    );
    if (existingAccount) {
      return res.status(400).json({ error: "This email is already linked to another account." });
    }

    account.email = newEmail.trim();
    changeEmailCodes.delete(username);
    saveAccounts();
    
    res.json({ success: true, email: account.email });
  });

  app.post("/api/support", async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      console.log(`\x1b[36m[SUPPORT] New message from ${name} (${email}): ${message}\x1b[0m`);

      if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn("\x1b[33m[WARN] SMTP not configured. Support email not actually sent out, but message was logged above.\x1b[0m");
        return res.json({ success: true, warning: 'SMTP not configured' });
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || '"Vylant Support" <noreply@vylant.com>',
        to: process.env.SUPPORT_EMAIL || 'support@vylant.com',
        subject: `Support Request from ${name}`,
        text: `From: ${name} (${email})\n\nMessage:\n${message}`,
        html: `<p>From: <strong>${name}</strong> (${email})</p><p>Message:</p><p>${message}</p>`
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (err) {
      console.error("Error sending support email:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Stripe Checkout dynamically created helper
  const getStripe = (): Stripe | null => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key);
  };

  app.post("/api/stripe/create-checkout-session", authenticateToken, async (req: any, res: any) => {
    const stripe = getStripe();
    if (!stripe) {
      // Elegant Simulation mode if Stripe is not configured
      return res.json({ success: true, simulated: true });
    }
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          process.env.STRIPE_PRICE_ID 
            ? {
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
              }
            : {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: 'Vylant Premium',
                    description: 'Unlock exclusive profile badges, custom server themes, upload custom emoji, and support Vylant development!',
                  },
                  unit_amount: 299, // $2.99
                  recurring: {
                    interval: 'month',
                  },
                },
                quantity: 1,
              }
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin || 'http://localhost:3000'}?payment=status_success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'http://localhost:3000'}?payment=status_cancel`,
        metadata: {
          username: req.user.username,
        }
      });
      res.json({ success: true, url: session.url });
    } catch (error: any) {
      console.error("Stripe Checkout Session Error:", error);
      res.status(500).json({ error: "Failed to initialize Stripe checkout: " + error.message });
    }
  });

  app.get("/api/stripe/verify-payment", authenticateToken, async (req: any, res: any) => {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe key not configured on backend." });
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      if (session.payment_status === 'paid' || session.status === 'complete') {
        const uName = session.metadata?.username || req.user.username;
        const user = Array.from(globalUsers.values()).find(u => u.name === uName);
        if (user) {
          user.isPremium = true;
          if (!user.preferences) {
            user.preferences = {};
          }
          const now = Date.now();
          user.preferences.subscriptionDetails = {
            subscribedAt: now,
            expiresAt: now + 30 * 24 * 60 * 60 * 1000,
            autoRenew: true,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id
          };
          user.lastUpdated = Date.now();
          saveUsers();
          io.emit("user-status-changed", { 
            userId: user.id, 
            userName: user.name, 
            status: user.status, 
            customStatus: user.customStatus,
            image: user.image,
            isPremium: true,
            preferences: user.preferences
          });
          return res.json({ success: true });
        } else {
          return res.status(404).json({ error: "User profile not found." });
        }
      } else {
        return res.status(400).json({ error: "Payment was not verified." });
      }
    } catch (e: any) {
      console.error("Verification Error:", e);
      return res.status(500).json({ error: "Stripe query failed: " + e.message });
    }
  });

  app.get("/api/stripe/simulate-payment", authenticateToken, (req: any, res: any) => {
    const uName = req.user.username;
    const user = Array.from(globalUsers.values()).find(u => u.name === uName);
    if (user) {
      user.isPremium = true;
      if (!user.preferences) {
        user.preferences = {};
      }
      const now = Date.now();
      user.preferences.subscriptionDetails = {
        subscribedAt: now,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true
      };
      user.lastUpdated = Date.now();
      saveUsers();
      io.emit("user-status-changed", { 
        userId: user.id, 
        userName: user.name, 
        status: user.status, 
        customStatus: user.customStatus,
        image: user.image,
        isPremium: true,
        preferences: user.preferences
      });
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: "User profile not found" });
    }
  });

  app.post("/api/stripe/cancel", authenticateToken, async (req: any, res: any) => {
    const uName = req.user.username;
    const user = Array.from(globalUsers.values()).find(u => u.name === uName);
    if (user) {
      const subId = user.preferences?.subscriptionDetails?.stripeSubscriptionId;
      const stripe = getStripe();
      
      if (stripe && subId) {
        try {
          await stripe.subscriptions.cancel(subId);
        } catch (e: any) {
          console.error("Failed to cancel Stripe subscription:", e);
          // depending on exact error, might still want to proceed locally if it was already deleted, but returning 500 might be safer.
          // We will log and continue to clean up locally.
        }
      }

      user.isPremium = false;
      if (user.preferences && user.preferences.subscriptionDetails) {
        delete user.preferences.subscriptionDetails;
      }
      user.lastUpdated = Date.now();
      saveUsers();
      io.emit("user-status-changed", { 
        userId: user.id, 
        userName: user.name, 
        status: user.status, 
        customStatus: user.customStatus,
        image: user.image,
        isPremium: false,
        preferences: user.preferences
      });
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: "User profile not found" });
    }
  });

  app.post("/api/stripe/toggle-autorenew", authenticateToken, async (req: any, res: any) => {
    const uName = req.user.username;
    const { autoRenew } = req.body;
    const user = Array.from(globalUsers.values()).find(u => u.name === uName);
    if (user) {
      if (!user.preferences) {
        user.preferences = {};
      }
      if (!user.preferences.subscriptionDetails) {
        const now = Date.now();
        user.preferences.subscriptionDetails = {
          subscribedAt: now,
          expiresAt: now + 30 * 24 * 60 * 60 * 1000,
          autoRenew: true
        };
      }
      
      const subId = user.preferences.subscriptionDetails.stripeSubscriptionId;
      const stripe = getStripe();
      
      if (stripe && subId) {
        try {
          await stripe.subscriptions.update(subId, {
            cancel_at_period_end: !autoRenew
          });
        } catch (e: any) {
          console.error("Failed to toggle auto-renew on Stripe:", e);
        }
      }

      user.preferences.subscriptionDetails.autoRenew = !!autoRenew;
      user.lastUpdated = Date.now();
      saveUsers();
      io.emit("user-status-changed", { 
        userId: user.id, 
        userName: user.name, 
        status: user.status, 
        customStatus: user.customStatus,
        image: user.image,
        isPremium: user.isPremium,
        preferences: user.preferences
      });
      return res.json({ success: true, subscriptionDetails: user.preferences.subscriptionDetails });
    } else {
      return res.status(404).json({ error: "User profile not found" });
    }
  });

  app.get("/api/stripe/invoices", authenticateToken, async (req: any, res: any) => {
    const uName = req.user.username;
    const user = Array.from(globalUsers.values()).find(u => u.name === uName);
    
    if (!user || (!user.isPremium && !user.preferences?.subscriptionDetails)) {
      return res.json({ invoices: [] });
    }

    const subId = user.preferences?.subscriptionDetails?.stripeSubscriptionId;
    if (!subId) {
      // Simulate invoice for dev
      return res.json({
        invoices: [
          {
            id: 'sim_inv_1',
            date: user.preferences?.subscriptionDetails?.subscribedAt || Date.now(),
            amount: 299,
            status: 'paid',
            pdfUrl: null
          }
        ]
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe key not configured on backend." });
    }

    try {
      const invoices = await stripe.invoices.list({ subscription: subId });
      return res.json({
        invoices: invoices.data.map((inv: any) => ({
          id: inv.id,
          date: inv.created * 1000,
          amount: inv.amount_paid,
          status: inv.status,
          pdfUrl: inv.invoice_pdf
        }))
      });
    } catch (e: any) {
      console.error("Fetch invoices error:", e);
      return res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/signup", validateBody({
    username: { required: true, type: "string", minLength: 3, maxLength: 32, pattern: /^[a-zA-Z0-9_-]+$/ },
    password: { required: true, type: "string", minLength: 8, maxLength: 128 },
    email: { required: false, type: "string", maxLength: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { required: false, type: "number", min: 13, max: 150 },
    birthDate: { required: false, type: "string", maxLength: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ }
  }), async (req: CustomRequest, res) => {
    const { username, password, email, age, birthDate } = req.validatedBody;
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedEmail = email ? email.trim() : null;
    const userAge = age || 18; // Default to adult if not provided to handle legacy signups securely

    console.log(`Signup attempt: ${trimmedUsername}, email: ${trimmedEmail}, age: ${userAge}, birthDate: ${birthDate}`);
    
    if (['constructor', '__proto__', 'prototype', 'admin', 'system', 'root', 'undefined', 'null'].includes(trimmedUsername.toLowerCase())) {
      // console.warn(`Signup failed: Reserved username: ${trimmedUsername}`);
      return res.status(400).json({ error: "This username is reserved. Please choose a different name." });
    }

    // Check if account already exists (case-insensitive lookup)
    const existingAccountKey = Object.keys(globalAccounts).find(k => k.toLowerCase() === trimmedUsername.toLowerCase());
    if (existingAccountKey) {
      const existingAccount = globalAccounts[existingAccountKey];
      // If the existing account has no password (e.g. from previous null password serialization bug), allow claiming & setting password
      if (!existingAccount.password) {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(trimmedPassword, salt);
        existingAccount.password = hashedPassword;
        if (trimmedEmail) existingAccount.email = trimmedEmail;
        if (userAge) existingAccount.age = userAge;
        if (birthDate) existingAccount.birthDate = birthDate;
        globalAccounts[existingAccountKey] = existingAccount;
        saveAccounts();

        const token = jwt.sign({ username: existingAccountKey }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...accountWithoutPassword } = existingAccount;
        const session = await addPersistentSession(existingAccountKey, req.headers['user-agent'] || '', req.ip || '');
        console.log(`Signup claimed existing passwordless account: ${existingAccountKey}`);
        return res.json({ success: true, account: accountWithoutPassword, token, sessionId: session.id });
      }

            // Try to verify password and just login instead
      let isValid = false;
      const accountPassword = existingAccount.password;
      if (accountPassword) {
        if (accountPassword.startsWith('$2a$') || accountPassword.startsWith('$2b$')) {
          isValid = bcrypt.compareSync(trimmedPassword, accountPassword);
        } else {
          isValid = accountPassword === trimmedPassword;
        }
      }

      if (isValid) {
        const token = jwt.sign({ username: existingAccountKey }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...accountWithoutPassword } = existingAccount;
        const session = await addPersistentSession(existingAccountKey, req.headers['user-agent'] || '', req.ip || '');
        return res.json({ success: true, account: accountWithoutPassword, token, sessionId: session.id });
      }

      // console.warn(`Signup failed: Account already exists: ${trimmedUsername}`);
      return res.status(400).json({ 
        error: `An account named "${existingAccountKey}" already exists. Please log in instead.`,
        code: "ACCOUNT_EXISTS",
        existingUsername: existingAccountKey
      });
    }
    // Check if email is already taken
    if (trimmedEmail) {
      const emailTakenBy = Object.keys(globalAccounts).find(k => globalAccounts[k].email && globalAccounts[k].email.toLowerCase() === trimmedEmail.toLowerCase());
      if (emailTakenBy) {
        return res.status(400).json({ 
          error: `The email "${trimmedEmail}" is already linked to an existing account. Please log in instead.`,
          code: "EMAIL_EXISTS",
          existingUsername: emailTakenBy
        });
      }
    }
    
    // Hash password on server
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(trimmedPassword, salt);
    
    globalAccounts[trimmedUsername] = {
      password: hashedPassword,
      email: trimmedEmail,
      age: userAge,
      birthDate: birthDate || null,
      createdAt: new Date().toISOString()
    };
    
    // Also add to globalUsers to ensure they are discoverable and have age set immediately
    globalUsers.set(trimmedUsername, {
      id: trimmedUsername,
      name: trimmedUsername,
      displayName: trimmedUsername,
      image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${trimmedUsername}`,
      status: 'online',
      age: userAge,
      birthDate: birthDate || null,
      lastSeen: Date.now(),
      lastUpdated: Date.now()
    });
    saveAccounts();

    console.log(`Signup success: ${trimmedUsername}`);
    
    const token = jwt.sign({ username: trimmedUsername }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...accountWithoutPassword } = globalAccounts[trimmedUsername];
    
    // Track session
    const session = await addPersistentSession(trimmedUsername, req.headers['user-agent'] || '', req.ip || '');

    res.json({ success: true, account: accountWithoutPassword, token, sessionId: session.id });
  });

  app.post("/api/log", (req, res) => {
    console.log(`Client Log: ${JSON.stringify(req.body)}`);
    res.json({ success: true });
  });

  app.post("/api/login", validateBody({
    username: { required: true, type: "string", minLength: 3, maxLength: 32 },
    password: { required: true, type: "string", minLength: 6, maxLength: 128 }
  }), async (req, res) => {
    const { username, password } = req.validatedBody;
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // Match by exact key, case-insensitive username, or email
    let matchedKey = Object.keys(globalAccounts).find(k => k === trimmedUsername);
    if (!matchedKey) {
      matchedKey = Object.keys(globalAccounts).find(k => k.toLowerCase() === trimmedUsername.toLowerCase());
    }
    if (!matchedKey) {
      matchedKey = Object.keys(globalAccounts).find(k => globalAccounts[k].email && globalAccounts[k].email.toLowerCase() === trimmedUsername.toLowerCase());
    }

    if (!matchedKey) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    const account = globalAccounts[matchedKey];
    const accountPassword = account.password;
    let isValid = false;
    let needsUpgrade = false;

    if (accountPassword) {
      if (accountPassword.startsWith('$2a$') || accountPassword.startsWith('$2b$')) {
        isValid = bcrypt.compareSync(trimmedPassword, accountPassword);
      } else {
        // Fallback for older plaintext passwords
        isValid = accountPassword === trimmedPassword;
        if (isValid) {
          needsUpgrade = true;
        }
      }
    } else {
      // Password was unpopulated in DB; bind entered password on authentication
      const salt = bcrypt.genSaltSync(10);
      account.password = bcrypt.hashSync(trimmedPassword, salt);
      globalAccounts[matchedKey] = account;
      saveAccounts();
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Don't send the password back to the client
    const { password: _, ...accountWithoutPassword } = account;
    
    const token = jwt.sign({ username: matchedKey }, JWT_SECRET, { expiresIn: '7d' });
    
    // Track session
    const session = await addPersistentSession(matchedKey, req.headers['user-agent'] || '', req.ip || '');

    fs.promises.appendFile('server.log', `Generated token for user ${matchedKey}: ${token}\n`).catch(console.error);
    
    res.json({ 
      success: true, 
      account: accountWithoutPassword,
      needsUpgrade,
      token,
      sessionId: session.id
    });
  });

  app.post("/api/change-password", authenticateToken, validateBody({
    newPassword: { required: true, type: "string", minLength: 8, maxLength: 128 }
  }), (req: any, res: any) => {
    const { newPassword } = req.validatedBody;
    const username = req.user.username;
    if (!globalAccounts[username]) {
      return res.status(404).json({ error: "Account not found" });
    }
    const salt = bcrypt.genSaltSync(10);
    globalAccounts[username].password = bcrypt.hashSync(newPassword.trim(), salt);
    saveAccounts();
    res.json({ success: true });
  });

  app.get("/api/sessions", authenticateToken, (req: any, res: any) => {
    const userName = req.user.username;
    const clientSessionId = req.query.sessionId;
    // Get persistent sessions, checking which ones have active sockets
    const userSessions = persistentSessions.filter(s => s.userName === userName)
      .map(s => {
        const isCurrent = clientSessionId ? s.id === clientSessionId : (s.ip === req.ip && s.deviceName === parseUA(req.headers['user-agent'] || '').deviceName);
        // Simplification: if it's in the list, we show it. Actual liveliness is tracked via socket disconnects
        return { ...s, isCurrent };
      });
    res.json(userSessions);
  });

  app.post("/api/logout-session", authenticateToken, (req: any, res: any) => {
    const { sessionId } = req.body;
    const userName = req.user.username;
    
    const sessionIdx = persistentSessions.findIndex(s => s.id === sessionId && s.userName === userName);
    if (sessionIdx !== -1) {
      persistentSessions.splice(sessionIdx, 1);
      savePersistentSessions();
      
      // If it's a current socket, disconnect it
      const socket = io.sockets.sockets.get(sessionId);
      if (socket) {
        socket.emit('force-logout', { reason: 'Your session has been revoked' });
        setTimeout(() => socket.disconnect(), 100);
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });

  app.post("/api/logout-all", authenticateToken, (req: any, res: any) => {
    const userName = req.user.username;
    persistentSessions = persistentSessions.filter(s => s.userName !== userName);
    savePersistentSessions();
    
    // Disconnect all sockets for this user
    const socketIds = userSocketMap[userName] || [];
    socketIds.forEach(id => {
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        socket.emit('force-logout', { reason: 'Logged out of all sessions' });
        setTimeout(() => socket.disconnect(), 100);
      }
    });
    
    res.json({ success: true });
  });

  app.post("/api/delete-account", authenticateToken, (req: any, res: any) => {
    const { username, password } = req.body;
    const authUsername = req.user.username;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (username.trim() !== authUsername) {
      return res.status(403).json({ error: "Username does not match the authenticated user" });
    }

    const account = globalAccounts[authUsername];
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const accountPassword = account.password;
    let isValid = false;

    if (accountPassword) {
      if (accountPassword.startsWith('$2a$') || accountPassword.startsWith('$2b$')) {
        isValid = bcrypt.compareSync(password.trim(), accountPassword);
      } else {
        isValid = accountPassword === password.trim();
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Delete the account
    delete globalAccounts[authUsername];
    saveAccounts();

    try {
      db.prepare('DELETE FROM users WHERE id = ? OR name = ?').run(authUsername, authUsername);
    } catch (e) {
      console.error('Error deleting user from db:', e);
    }

    // Clean up globalUsers if exists
    if (globalUsers.has(authUsername)) {
      globalUsers.delete(authUsername);
      saveUsers();
    }

    // Clean up stories
    if (globalStories[authUsername]) {
      delete globalStories[authUsername];
      saveStories();
    }

    // Clean up friend requests
    delete globalFriendRequests[authUsername];
    Object.keys(globalFriendRequests).forEach(u => {
      if (globalFriendRequests[u]) {
        globalFriendRequests[u] = globalFriendRequests[u].filter(req => req.from !== authUsername);
      }
    });
    saveFriendRequests();

    // Clean up vanish modes
    let vanishChanged = false;
    Object.keys(globalVanishModes).forEach(key => {
      if (key.split(':').includes(authUsername)) {
        delete globalVanishModes[key];
        vanishChanged = true;
      }
    });
    if (vanishChanged) saveVanishModes();

    // Clean up DM messages
    const initialMsgLen = globalMessages.length;
    globalMessages = globalMessages.filter(m => m.sender !== authUsername && m.receiver !== authUsername);
    if (globalMessages.length !== initialMsgLen) saveMessages();

    // Clean up server memberships & ownership
    const serversToDelete = globalServers.filter(s => s.ownerId === authUsername).map(s => s.id);
    
    // Deleting servers owned by the user
    serversToDelete.forEach(sid => {
      delete globalServerMessages[sid];
      delete globalServerMembers[sid];
      Object.keys(globalVoiceChannelMembers).forEach(vKey => {
        if (vKey.startsWith(`${sid}:`)) delete globalVoiceChannelMembers[vKey];
      });
      io.emit("server-deleted", { serverId: sid });
    });
    
    globalServers = globalServers.filter(s => s.ownerId !== authUsername);
    
    // Remove from other servers' member lists and banned lists
    globalServers.forEach(server => {
      if (server.bannedUsers) {
        server.bannedUsers = server.bannedUsers.filter((u: any) => u.id !== authUsername && u.name !== authUsername);
      }
      if (server.bannedMembers) {
        server.bannedMembers = server.bannedMembers.filter((m: any) => m !== authUsername);
      }
    });
    
    Object.keys(globalServerMembers).forEach(sid => {
      globalServerMembers[sid] = globalServerMembers[sid].filter(m => m.name !== authUsername && m.id !== authUsername);
    });

    // Clean up messages in other servers
    let serverMessagesChanged = false;
    Object.keys(globalServerMessages).forEach(serverId => {
      if (globalServerMessages[serverId]) {
        Object.keys(globalServerMessages[serverId]).forEach(channelId => {
          const initialCount = globalServerMessages[serverId][channelId].length;
          globalServerMessages[serverId][channelId] = globalServerMessages[serverId][channelId].filter(m => m.sender !== authUsername);
          if (globalServerMessages[serverId][channelId].length !== initialCount) serverMessagesChanged = true;
        });
      }
    });

    // Call remaining save functions
    saveServers();
    saveServerMembers();
    if (serverMessagesChanged) saveMessages();

    // Clean up voice channel members
    Object.keys(globalVoiceChannelMembers).forEach(vKey => {
      const initialCount = globalVoiceChannelMembers[vKey].length;
      globalVoiceChannelMembers[vKey] = globalVoiceChannelMembers[vKey].filter(m => m.name !== authUsername && m.id !== authUsername);
      if (globalVoiceChannelMembers[vKey].length !== initialCount) {
        const [serverId, channelId] = vKey.split(':');
        io.to(vKey).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[vKey] });
      }
    });

    // Log the action
    console.log(`Account deleted: ${authUsername}`);
    
    // Disconnect all sessions for this user
    const socketIds = userSocketMap[authUsername] || [];
    socketIds.forEach(id => {
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        socket.disconnect();
      }
    });

    res.json({ success: true });
  });

  app.get("/api/user-exists", (req, res) => {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: "Username is required" });
    }
    const exists = !!globalAccounts[username];
    const user = globalUsers.get(username);
    res.json({ 
      exists, 
      allowIncomingFriendRequests: user ? (user.allowIncomingFriendRequests !== false) : true 
    });
  });

  app.get("/api/stories", authenticateToken, (req: any, res: any) => {
    console.log(`GET /api/stories hit by ${req.user.username}`);
    res.json(globalStories);
  });

  app.delete("/api/stories/:userId/:index", authenticateToken, (req: any, res: any) => {
    const { userId, index } = req.params;
    
    if (userId !== req.user.username) {
      return res.status(403).json({ error: "Unauthorized to delete story for another user" });
    }

    const idx = parseInt(index);
    if (globalStories[userId] && globalStories[userId][idx]) {
      globalStories[userId].splice(idx, 1);
      if (globalStories[userId].length === 0) {
        delete globalStories[userId];
      }
      saveStories();
      res.json(globalStories);
    } else {
      res.status(404).json({ error: "Story not found" });
    }
  });

  app.post("/api/stories", authenticateToken, (req: any, res: any) => {
    const { userId, story, expiresAt } = req.body;
    
    if (userId !== req.user.username) {
      return res.status(403).json({ error: "Unauthorized to post story for another user" });
    }

    if (!userId || !story) {
      return res.status(400).json({ error: "Missing userId or story" });
    }
    if (!globalStories[userId]) {
      globalStories[userId] = [];
    }
    globalStories[userId].push({
      content: story,
      expiresAt: expiresAt || (Date.now() + 24 * 60 * 60 * 1000) // Default 24h
    });
    saveStories();
    res.json(globalStories);
  });

  app.post("/api/sync-users", authenticateToken, (req, res) => {
    const { users } = req.body;
    if (Array.isArray(users)) {
      let changed = false;
      users.forEach(u => {
        if (u.id && u.name && !globalUsers.has(u.id)) {
          globalUsers.set(u.id, {
            id: u.id,
            name: u.name,
            image: u.image || 'https://i.imgur.com/zp6R930.png',
            status: 'offline',
            lastSeen: Date.now()
          });
          changed = true;
        }
      });
      if (changed) saveUsers();
    }
    res.json({ success: true });
  });

  app.post("/api/profile/update", authenticateToken, (req: any, res: any) => {
    const { image, banner, about, displayName, preferences, security } = req.body;
    const username = req.user.username;
    const user = globalUsers.get(username);
    
    if (user) {
      if (image !== undefined) user.image = image;
      if (banner !== undefined) user.banner = banner;
      if (about !== undefined) user.about = about;
      if (displayName !== undefined) user.displayName = displayName;
      if (preferences !== undefined) user.preferences = preferences;
      if (security !== undefined) user.security = security;
      
      user.lastUpdated = Date.now();
      saveUsers();
      
      io.emit("user-status-changed", { 
        userId: user.id, 
        userName: user.name, 
        status: user.status, 
        customStatus: user.customStatus,
        image: user.image,
        isPremium: user.isPremium,
        preferences: user.preferences
      });
      
      return res.json({ success: true, user });
    }
    res.status(404).json({ error: "User not found" });
  });

  app.get("/api/presets", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const filtered = globalPresets.filter((p: any) => p.isPublic || p.creator === username);
    res.json(filtered);
  });

  app.post("/api/presets", authenticateToken, (req: any, res: any) => {
    const { id, name, config, isPublic } = req.body;
    const username = req.user.username;
    
    if (!name || !config) {
      return res.status(400).json({ error: "Name and config are required" });
    }

    const existingIdx = globalPresets.findIndex((p: any) => p.id === id);
    if (existingIdx !== -1) {
      if (globalPresets[existingIdx].creator !== username) {
        return res.status(403).json({ error: "Unauthorized to update this preset" });
      }
      globalPresets[existingIdx] = {
        ...globalPresets[existingIdx],
        name,
        config,
        isPublic: !!isPublic
      };
    } else {
      globalPresets.push({
        id: id || Date.now().toString(),
        name,
        creator: username,
        config,
        isPublic: !!isPublic,
        downloads: 0,
        createdAt: Date.now()
      });
    }
    savePresets();
    res.json({ success: true });
  });

  app.post("/api/presets/download", authenticateToken, (req: any, res: any) => {
    const { presetId } = req.body;
    const preset = globalPresets.find((p: any) => p.id === presetId);
    if (preset) {
      preset.downloads = (preset.downloads || 0) + 1;
      savePresets();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Preset not found" });
    }
  });

  app.delete("/api/presets/:id", authenticateToken, (req: any, res: any) => {
    const presetId = req.params.id;
    const username = req.user.username;
    const preset = globalPresets.find((p: any) => p.id === presetId);
    
    if (preset) {
      if (preset.creator !== username) {
        return res.status(403).json({ error: "Unauthorized to delete this preset" });
      }
      globalPresets = globalPresets.filter((p: any) => p.id !== presetId);
      savePresets();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Preset not found" });
    }
  });

  // --- BOT ENGINE & DEVELOPER PORTAL API ---

  function processBotPlaceholders(template: string, ctx: { user: string; sender: string; server: string; channel: string; args: string }) {
    if (!template) return '';
    let res = template;
    res = res.replace(/\{user\}/gi, ctx.user || 'User');
    res = res.replace(/\{sender\}/gi, ctx.sender || 'User');
    res = res.replace(/\{server\}/gi, ctx.server || 'Server');
    res = res.replace(/\{channel\}/gi, ctx.channel || 'channel');
    res = res.replace(/\{args\}/gi, ctx.args || '');
    res = res.replace(/\{time\}/gi, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    res = res.replace(/\{date\}/gi, new Date().toLocaleDateString());
    
    // {random:min-max} e.g. {random:1-100}
    res = res.replace(/\{random:(\d+)-(\d+)\}/gi, (_, min, max) => {
      const minVal = parseInt(min, 10);
      const maxVal = parseInt(max, 10);
      return (Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal).toString();
    });
    
    // {random:opt1,opt2,opt3} e.g. {random:Heads,Tails}
    res = res.replace(/\{random:([^{}]+)\}/gi, (match, optsStr) => {
      if (optsStr.includes('-') && /^\d+-\d+$/.test(optsStr)) return match;
      const parts = optsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[Math.floor(Math.random() * parts.length)];
      }
      return match;
    });

    // {dice:XdY} or {dice:dY} e.g. {dice:2d6} or {dice:d20}
    res = res.replace(/\{dice:(?:(\d+)d(\d+)|d(\d+))\}/gi, (_, num, sides1, sides2) => {
      const count = parseInt(num || '1', 10);
      const sides = parseInt(sides1 || sides2 || '6', 10);
      const rolls: number[] = [];
      let total = 0;
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
      }
      if (count === 1) return `${total} (d${sides})`;
      return `[${rolls.join(', ')}] Total: ${total}`;
    });

    return res;
  }

  const generateBotToken = () => {
    return 'vyl_bot_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  };

  async function handleBotAiResponse(bot: any, serverId: string, channelId: string, userMessage: any, userPrompt: string) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    let botReplyText = "";
    if (GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const systemInstruction = bot.systemPrompt || `You are ${bot.name}, a helpful bot on the Vylant social platform. Keep your responses friendly, witty, concise, and formatted in markdown.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `${systemInstruction}\n\nUser ${userMessage.sender} asks: "${userPrompt}"\nProvide a concise and helpful response directly to the user.`
        });
        botReplyText = response.text || "I processed your request!";
      } catch (e) {
        console.error("Bot AI error:", e);
        botReplyText = `🤖 [${bot.name}] Beep boop! I received your query: "${userPrompt}".`;
      }
    } else {
      botReplyText = `🤖 [${bot.name}] Beep boop! I received your query: "${userPrompt}".`;
    }
    
    const botMsg = {
      id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      serverId,
      channelId,
      sender: bot.name,
      senderImage: bot.avatar,
      text: botReplyText,
      timestamp: Date.now(),
      isBot: true,
      botTag: bot.tag || 'BOT',
      botId: bot.id,
      replyTo: userMessage.id
    };
    
    if (!globalServerMessages[serverId]) globalServerMessages[serverId] = {};
    if (!globalServerMessages[serverId][channelId]) globalServerMessages[serverId][channelId] = [];
    globalServerMessages[serverId][channelId].push(botMsg);
    saveMessages();
    
    const targetServer = globalServers.find(s => s.id === serverId);
    recordBotActivity(bot, {
      type: 'aiQuery',
      name: 'Gemini AI',
      trigger: `@${bot.name} / ${bot.prefix || '!'}ai`,
      serverName: targetServer?.name || 'Server',
      channelName: channelId,
      userName: userMessage.sender,
      responseSnippet: botReplyText
    });
    
    io.to(`${serverId}:${channelId}`).emit("new-server-message", { serverId, channelId, message: botMsg });
  }

  // Get all bots created by user + public community bots
  app.get("/api/bots", authenticateToken, (req: any, res: any) => {
    const username = req.user?.username || req.headers['x-username'] || 'User';
    const userBots = globalBots.filter((b: any) => 
      (b.ownerId === username || b.ownerName === username)
    );
    const publicBots = globalBots.filter((b: any) => 
      b.isPublic && 
      b.ownerId !== username && 
      b.ownerName !== username && 
      b.id !== 'bot_t0ai_assistant'
    );
    res.json({
      myBots: userBots,
      publicBots: publicBots
    });
  });

  // Create new bot
  app.post("/api/bots", authenticateToken, (req: any, res: any) => {
    const username = req.user?.username || req.headers['x-username'] || 'User';
    const {
      name,
      avatar,
      banner,
      about,
      customStatus,
      prefix,
      isPublic,
      isAiPowered,
      systemPrompt,
      commands,
      autoResponses,
      welcomeMessage
    } = req.body;

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ error: "Bot name is required" });
    }

    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();
    const newBot = {
      id: botId,
      ownerId: username,
      ownerName: username,
      name: trimmedName,
      tag: Math.floor(1000 + Math.random() * 9000).toString(),
      token: generateBotToken(),
      avatar: avatar || 'https://i.imgur.com/pBnhSqE.png',
      banner: banner || null,
      about: about || 'A custom Vylant bot.',
      customStatus: customStatus || `Prefix: ${prefix || '!'}`,
      prefix: prefix || '!',
      isPublic: !!isPublic,
      isAiPowered: !!isAiPowered,
      systemPrompt: systemPrompt || `You are ${trimmedName}, a helpful bot created by @${username}.`,
      commands: Array.isArray(commands) && commands.length > 0 ? commands : [
        { id: 'cmd_1', name: 'ping', description: 'Ping the bot', response: '🏓 Pong! Bot is active ⚡' },
        { id: 'cmd_2', name: 'help', description: 'Show commands', response: `🤖 **${trimmedName} Commands**:\n• \`${prefix || '!'}ping\` - Check status\n• \`${prefix || '!'}about\` - About this bot` },
        { id: 'cmd_3', name: 'about', description: 'Bot info', response: `✨ **${trimmedName}** was developed by @${username} on Vylant!` }
      ],
      autoResponses: Array.isArray(autoResponses) ? autoResponses : [],
      welcomeMessage: welcomeMessage || '',
      installedServers: [],
      createdAt: now,
      stats: normalizeBotStats({
        messagesSent: 0,
        serversCount: 0,
        commandsUsed: 0,
        commandBreakdown: {},
        autoResponsesTriggered: 0,
        aiQueriesHandled: 0,
        totalMessagesProcessed: 0,
        lastActive: now,
        uptimeHours: 1,
        dailyVolume: generateDefaultDailyVolume(0, 0),
        recentActivity: []
      }, now, 0)
    };

    globalBots.push(newBot);
    saveBots();
    res.json({ success: true, bot: newBot });
  });

  // Update existing bot
  app.put("/api/bots/:id", authenticateToken, (req: any, res: any) => {
    const botId = req.params.id;
    const username = req.user?.username || req.headers['x-username'] || 'User';
    const botIndex = globalBots.findIndex(b => b.id === botId);

    if (botIndex === -1) {
      return res.status(404).json({ error: "Bot not found" });
    }

    const bot = globalBots[botIndex];
    if (bot.ownerId !== username && bot.ownerName !== username && username !== 'admin') {
      return res.status(403).json({ error: "Unauthorized to edit this bot" });
    }

    const {
      name,
      avatar,
      banner,
      about,
      customStatus,
      prefix,
      isPublic,
      isAiPowered,
      systemPrompt,
      commands,
      autoResponses,
      welcomeMessage
    } = req.body;

    globalBots[botIndex] = {
      ...bot,
      name: name !== undefined ? name.trim() : bot.name,
      avatar: avatar !== undefined ? avatar : bot.avatar,
      banner: banner !== undefined ? banner : bot.banner,
      about: about !== undefined ? about : bot.about,
      customStatus: customStatus !== undefined ? customStatus : bot.customStatus,
      prefix: prefix !== undefined ? prefix : bot.prefix,
      isPublic: isPublic !== undefined ? !!isPublic : bot.isPublic,
      isAiPowered: isAiPowered !== undefined ? !!isAiPowered : bot.isAiPowered,
      systemPrompt: systemPrompt !== undefined ? systemPrompt : bot.systemPrompt,
      commands: commands !== undefined ? commands : bot.commands,
      autoResponses: autoResponses !== undefined ? autoResponses : bot.autoResponses,
      welcomeMessage: welcomeMessage !== undefined ? welcomeMessage : bot.welcomeMessage
    };

    saveBots();

    // Broadcast updated servers where this bot is installed
    if (globalBots[botIndex].installedServers) {
      globalBots[botIndex].installedServers.forEach((sid: string) => {
        io.to(`server:${sid}`).emit("server-updated", { serverId: sid, server: globalServers.find(s => s.id === sid) });
      });
    }

    res.json({ success: true, bot: globalBots[botIndex] });
  });

  // Regenerate bot token
  app.post("/api/bots/:id/regenerate-token", authenticateToken, (req: any, res: any) => {
    const botId = req.params.id;
    const username = req.user?.username || req.headers['x-username'] || 'User';
    const bot = globalBots.find(b => b.id === botId);

    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    if (bot.ownerId !== username && bot.ownerName !== username && username !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    bot.token = generateBotToken();
    saveBots();
    res.json({ success: true, token: bot.token });
  });

  // Delete bot
  app.delete("/api/bots/:id", authenticateToken, (req: any, res: any) => {
    const botId = req.params.id;
    const username = req.user?.username || req.headers['x-username'] || 'User';
    const bot = globalBots.find(b => b.id === botId);

    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    if (bot.ownerId !== username && bot.ownerName !== username && username !== 'admin') {
      return res.status(403).json({ error: "Unauthorized to delete this bot" });
    }

    // Remove from installed servers
    if (bot.installedServers) {
      bot.installedServers.forEach((sid: string) => {
        if (globalServerMembers[sid]) {
          globalServerMembers[sid] = globalServerMembers[sid].filter((m: any) => m.id !== bot.id);
        }
        io.to(`server:${sid}`).emit("server-updated", { serverId: sid, server: globalServers.find(s => s.id === sid) });
      });
    }

    globalBots = globalBots.filter(b => b.id !== botId);
    saveBots();
    res.json({ success: true });
  });

  // Get bots installed on a specific server
  app.get("/api/servers/:serverId/bots", authenticateToken, (req: any, res: any) => {
    const serverId = req.params.serverId;
    const installed = globalBots.filter(b => b.installedServers?.includes(serverId));
    res.json({ bots: installed });
  });

  // Install bot to server
  app.post("/api/servers/:serverId/bots/:botId/install", authenticateToken, (req: any, res: any) => {
    const { serverId, botId } = req.params;
    const username = req.user?.username || req.headers['x-username'] || 'User';
    const server = globalServers.find(s => s.id === serverId);

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const bot = globalBots.find(b => b.id === botId);
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    // Check if user has permission (owner or bot owner)
    if (server.ownerId !== username && bot.ownerId !== username && username !== 'admin') {
      return res.status(403).json({ error: "Only server owners or managers can add bots to this server" });
    }

    if (!bot.installedServers) bot.installedServers = [];
    if (!bot.installedServers.includes(serverId)) {
      bot.installedServers.push(serverId);
    }

    if (!bot.stats) bot.stats = { messagesSent: 0, serversCount: 0 };
    bot.stats.serversCount = bot.installedServers.length;
    saveBots();

    // Add bot to server members
    if (!globalServerMembers[serverId]) globalServerMembers[serverId] = [];
    if (!globalServerMembers[serverId].some((m: any) => m.id === bot.id)) {
      globalServerMembers[serverId].push({
        id: bot.id,
        name: bot.name,
        displayName: bot.name,
        image: bot.avatar,
        avatar: bot.avatar,
        status: 'online',
        customStatus: bot.customStatus || `Prefix: ${bot.prefix}`,
        isBot: true,
        botTag: bot.tag || 'BOT',
        activity: { name: bot.customStatus || 'Bot App', type: 'custom' },
        roles: ['Bot']
      });
      saveServerMembers();
    }

    // Send welcome message if configured
    if (bot.welcomeMessage) {
      const channels = server.channels || [];
      const defaultChannel = channels.find((c: any) => c.type === 'text') || channels[0];
      if (defaultChannel) {
        const welcomeText = processBotPlaceholders(bot.welcomeMessage, {
          user: username,
          sender: username,
          server: server.name,
          channel: defaultChannel.name,
          args: ''
        });
        const welcomeMsg = {
          id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          serverId,
          channelId: defaultChannel.id,
          sender: bot.name,
          senderImage: bot.avatar,
          text: welcomeText,
          timestamp: Date.now(),
          isBot: true,
          botTag: bot.tag || 'BOT',
          botId: bot.id
        };
        if (!globalServerMessages[serverId]) globalServerMessages[serverId] = {};
        if (!globalServerMessages[serverId][defaultChannel.id]) globalServerMessages[serverId][defaultChannel.id] = [];
        globalServerMessages[serverId][defaultChannel.id].push(welcomeMsg);
        saveMessages();
        io.to(`${serverId}:${defaultChannel.id}`).emit("new-server-message", { serverId, channelId: defaultChannel.id, message: welcomeMsg });
      }
    }

    io.to(`server:${serverId}`).emit("server-updated", { serverId, server });
    res.json({ success: true, bot });
  });

  // Remove bot from server
  app.delete("/api/servers/:serverId/bots/:botId", authenticateToken, (req: any, res: any) => {
    const { serverId, botId } = req.params;
    const username = req.user.username;
    const server = globalServers.find(s => s.id === serverId);

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const bot = globalBots.find(b => b.id === botId);
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    if (server.ownerId !== username && bot.ownerId !== username && username !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (bot.installedServers) {
      bot.installedServers = bot.installedServers.filter((sid: string) => sid !== serverId);
    }
    if (bot.stats) {
      bot.stats.serversCount = bot.installedServers.length;
    }
    saveBots();

    if (globalServerMembers[serverId]) {
      globalServerMembers[serverId] = globalServerMembers[serverId].filter((m: any) => m.id !== bot.id);
      saveServerMembers();
    }

    io.to(`server:${serverId}`).emit("server-updated", { serverId, server });
    res.json({ success: true });
  });

  // External Developer API: Send message as bot using Bot Token
  app.post("/api/bot/message", async (req: any, res: any) => {
    let token = req.headers['authorization']?.replace(/^Bearer\s+/i, '').replace(/^Bot\s+/i, '') || req.headers['x-bot-token'] || req.body.token;
    if (!token) {
      return res.status(401).json({ error: "Missing bot token", resolution: "Pass token in Authorization header as 'Bot <TOKEN>' or in request body." });
    }

    const bot = globalBots.find(b => b.token === token);
    if (!bot) {
      return res.status(403).json({ error: "Invalid bot token" });
    }

    const { serverId, channelId, text, image, replyTo } = req.body;
    if (!serverId || !channelId || (!text && !image)) {
      return res.status(400).json({ error: "serverId, channelId, and text or image are required" });
    }

    if (!bot.installedServers?.includes(serverId)) {
      return res.status(403).json({ error: "Bot is not added to this server. Invite the bot first via Server Settings -> Bots." });
    }

    const botMsg = {
      id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      serverId,
      channelId,
      sender: bot.name,
      senderImage: bot.avatar,
      text: text || '',
      image: image || null,
      timestamp: Date.now(),
      isBot: true,
      botTag: bot.tag || 'BOT',
      botId: bot.id,
      replyTo: replyTo || null
    };

    if (!globalServerMessages[serverId]) globalServerMessages[serverId] = {};
    if (!globalServerMessages[serverId][channelId]) globalServerMessages[serverId][channelId] = [];
    globalServerMessages[serverId][channelId].push(botMsg);
    saveMessages();

    recordBotActivity(bot, {
      type: 'directMessage',
      name: 'Dispatched Message',
      trigger: 'Admin Console',
      serverName: globalServers.find(s => s.id === serverId)?.name || 'Server',
      channelName: channelId,
      userName: req.user.username,
      responseSnippet: text
    });

    io.to(`${serverId}:${channelId}`).emit("new-server-message", { serverId, channelId, message: botMsg });

    res.json({ success: true, messageId: botMsg.id, message: botMsg });
  });

  // Get Bot profile via token
  app.get("/api/bot/me", (req: any, res: any) => {
    let token = req.headers['authorization']?.replace(/^Bearer\s+/i, '').replace(/^Bot\s+/i, '') || req.headers['x-bot-token'] || req.query.token;
    if (!token) {
      return res.status(401).json({ error: "Missing bot token" });
    }
    const bot = globalBots.find(b => b.token === token);
    if (!bot) {
      return res.status(403).json({ error: "Invalid bot token" });
    }
    res.json({
      bot: {
        id: bot.id,
        name: bot.name,
        tag: bot.tag,
        avatar: bot.avatar,
        about: bot.about,
        prefix: bot.prefix,
        isAiPowered: bot.isAiPowered,
        installedServers: bot.installedServers,
        stats: bot.stats
      }
    });
  });

  // Get Bot Analytics endpoint
  app.get("/api/bots/:botId/analytics", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const { botId } = req.params;

    if (botId === 'all') {
      const userBots = globalBots.filter((b: any) => 
        (b.ownerId === username || b.ownerName === username) &&
        b.id !== 'bot_t0ai_assistant' &&
        !b.name?.toLowerCase().includes('t0ai')
      );
      
      let totalMessages = 0;
      let totalCommands = 0;
      let totalAi = 0;
      let totalAutoResponses = 0;
      let totalServers = 0;
      const combinedCommandBreakdown: Record<string, number> = {};
      const allRecentActivity: any[] = [];
      const combinedDailyVolume: Record<string, { date: string; messages: number; commands: number; aiQueries: number }> = {};

      userBots.forEach(b => {
        const stats = normalizeBotStats(b.stats, b.createdAt, b.installedServers?.length || 0);
        b.stats = stats;
        totalMessages += stats.messagesSent || 0;
        totalCommands += stats.commandsUsed || 0;
        totalAi += stats.aiQueriesHandled || 0;
        totalAutoResponses += stats.autoResponsesTriggered || 0;
        totalServers += (b.installedServers?.length || 0);

        Object.entries(stats.commandBreakdown || {}).forEach(([cmd, count]) => {
          combinedCommandBreakdown[cmd] = (combinedCommandBreakdown[cmd] || 0) + (count as number);
        });

        if (Array.isArray(stats.dailyVolume)) {
          stats.dailyVolume.forEach((d: any) => {
            if (!combinedDailyVolume[d.date]) {
              combinedDailyVolume[d.date] = { date: d.date, messages: 0, commands: 0, aiQueries: 0 };
            }
            combinedDailyVolume[d.date].messages += (d.messages || 0);
            combinedDailyVolume[d.date].commands += (d.commands || 0);
            combinedDailyVolume[d.date].aiQueries += (d.aiQueries || 0);
          });
        }

        if (Array.isArray(stats.recentActivity)) {
          allRecentActivity.push(...stats.recentActivity.map((a: any) => ({
            ...a,
            botName: b.name,
            botAvatar: b.avatar,
            botTag: b.tag
          })));
        }
      });

      allRecentActivity.sort((a, b) => b.timestamp - a.timestamp);
      const dailyVolumeList = Object.values(combinedDailyVolume).sort((a, b) => a.date.localeCompare(b.date));

      return res.json({
        botId: 'all',
        totalBots: userBots.length,
        stats: {
          messagesSent: totalMessages,
          serversCount: totalServers,
          commandsUsed: totalCommands,
          commandBreakdown: combinedCommandBreakdown,
          autoResponsesTriggered: totalAutoResponses,
          aiQueriesHandled: totalAi,
          totalMessagesProcessed: totalMessages + totalCommands,
          lastActive: userBots.length > 0 ? Math.max(...userBots.map((b: any) => b.stats?.lastActive || 0)) : Date.now(),
          uptimeHours: userBots.length > 0 ? Math.max(...userBots.map((b: any) => b.stats?.uptimeHours || 1)) : 1,
          dailyVolume: dailyVolumeList.length > 0 ? dailyVolumeList : generateDefaultDailyVolume(totalMessages, totalCommands),
          recentActivity: allRecentActivity.slice(0, 30)
        }
      });
    }

    const bot = globalBots.find(b => b.id === botId);
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    const isOwner = bot.ownerId === username || bot.ownerName === username;
    if (!isOwner && !bot.isPublic) {
      return res.status(403).json({ error: "Access denied to bot analytics" });
    }

    bot.stats = normalizeBotStats(bot.stats, bot.createdAt, bot.installedServers?.length || 0);

    res.json({
      botId: bot.id,
      name: bot.name,
      tag: bot.tag,
      avatar: bot.avatar,
      prefix: bot.prefix,
      createdAt: bot.createdAt,
      stats: bot.stats
    });
  });

  // Reset Bot Analytics
  app.post("/api/bots/:botId/analytics/reset", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const { botId } = req.params;
    const bot = globalBots.find(b => b.id === botId && (b.ownerId === username || b.ownerName === username));
    if (!bot) {
      return res.status(404).json({ error: "Bot not found or unauthorized" });
    }

    const now = Date.now();
    bot.stats = {
      messagesSent: 0,
      serversCount: bot.installedServers?.length || 0,
      commandsUsed: 0,
      commandBreakdown: {},
      autoResponsesTriggered: 0,
      aiQueriesHandled: 0,
      totalMessagesProcessed: 0,
      lastActive: now,
      uptimeHours: 1,
      dailyVolume: generateDefaultDailyVolume(0, 0),
      recentActivity: []
    };
    saveBots();
    res.json({ success: true, stats: bot.stats });
  });

  // Test command execution in Dev Sandbox
  app.post("/api/bot/test-command", authenticateToken, async (req: any, res: any) => {
    const { botId, messageText, senderName } = req.body;
    const bot = globalBots.find(b => b.id === botId);
    if (!bot) return res.status(404).json({ error: "Bot not found" });

    const text = (messageText || '').trim();
    const prefix = bot.prefix || '!';
    const user = senderName || req.user.username;

    if (text.startsWith(prefix)) {
      const withoutPrefix = text.slice(prefix.length).trim();
      const [cmdName, ...args] = withoutPrefix.split(/\s+/);
      const lowerCmd = (cmdName || '').toLowerCase();

      const matchedCmd = bot.commands?.find((c: any) => 
        c.name.toLowerCase() === lowerCmd || 
        (c.aliases && c.aliases.some((a: string) => a.toLowerCase() === lowerCmd))
      );

      if (matchedCmd) {
        const response = processBotPlaceholders(matchedCmd.response, {
          user,
          sender: user,
          server: 'Dev Sandbox',
          channel: 'sandbox',
          args: args.join(' ')
        });

        recordBotActivity(bot, {
          type: 'command',
          name: matchedCmd.name,
          trigger: `${prefix}${matchedCmd.name}`,
          serverName: 'Dev Sandbox',
          channelName: 'sandbox',
          userName: user,
          responseSnippet: response
        });

        return res.json({ success: true, matchedType: 'command', command: matchedCmd.name, response });
      }
    }

    const matchedAutoResp = bot.autoResponses?.find((ar: any) => {
      if (!ar.trigger) return false;
      const trig = ar.trigger.toLowerCase();
      const msgText = text.toLowerCase();
      if (ar.matchType === 'exact') return msgText === trig;
      if (ar.matchType === 'startsWith') return msgText.startsWith(trig);
      return msgText.includes(trig);
    });

    if (matchedAutoResp) {
      const response = processBotPlaceholders(matchedAutoResp.response, {
        user,
        sender: user,
        server: 'Dev Sandbox',
        channel: 'sandbox',
        args: ''
      });

      recordBotActivity(bot, {
        type: 'autoResponse',
        name: matchedAutoResp.trigger,
        trigger: matchedAutoResp.trigger,
        serverName: 'Dev Sandbox',
        channelName: 'sandbox',
        userName: user,
        responseSnippet: response
      });

      return res.json({ success: true, matchedType: 'auto-response', trigger: matchedAutoResp.trigger, response });
    }

    if (bot.isAiPowered) {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (GEMINI_API_KEY) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
          const systemInstruction = bot.systemPrompt || `You are ${bot.name}, a helpful bot created by @${bot.ownerName}.`;
          const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `${systemInstruction}\n\nUser ${user} says: "${text}"\nRespond directly as ${bot.name}.`
          });
          const reply = result.text || 'Beep boop!';

          recordBotActivity(bot, {
            type: 'aiQuery',
            name: 'Gemini AI',
            trigger: text,
            serverName: 'Dev Sandbox',
            channelName: 'sandbox',
            userName: user,
            responseSnippet: reply
          });

          return res.json({ success: true, matchedType: 'ai', response: reply });
        } catch (e: any) {
          const fallback = `🤖 [${bot.name} AI] I heard: "${text}"`;
          recordBotActivity(bot, {
            type: 'aiQuery',
            name: 'AI Fallback',
            trigger: text,
            serverName: 'Dev Sandbox',
            channelName: 'sandbox',
            userName: user,
            responseSnippet: fallback
          });
          return res.json({ success: true, matchedType: 'ai-fallback', response: fallback });
        }
      }
    }

    res.json({
      success: true,
      matchedType: 'none',
      response: `*No command or trigger matched '${text}'. Try \`${bot.prefix}help\`*`
    });
  });

  app.post("/api/users", authenticateToken, (req: any, res: any) => {
    const { id, name, image, status, customStatus, allowIncomingFriendRequests } = req.body;
    
    if (id !== req.user.username) {
      return res.status(403).json({ error: "Unauthorized to update this user profile" });
    }

    if (id && name) {
      const existing = globalUsers.get(id);
      const hasChanged = !existing || 
                         existing.status !== status || 
                         existing.customStatus !== customStatus || 
                         existing.image !== image ||
                         existing.allowIncomingFriendRequests !== allowIncomingFriendRequests;
      
      const updatedUser = {
        ...(existing || {}),
        id, 
        name, 
        image: image || (existing ? existing.image : ''), 
        status: status || (existing ? existing.status : 'online'),
        customStatus: customStatus !== undefined ? customStatus : (existing ? existing.customStatus : ''),
        allowIncomingFriendRequests: allowIncomingFriendRequests !== undefined ? allowIncomingFriendRequests : (existing ? existing.allowIncomingFriendRequests !== false : true),
        lastSeen: Date.now(),
        lastUpdated: Date.now()
      };
      
      globalUsers.set(id, updatedUser);
      saveUsers();

      if (hasChanged) {
        io.emit("user-status-changed", { 
          userId: id, 
          userName: name, 
          status: updatedUser.status, 
          customStatus: updatedUser.customStatus, 
          image: updatedUser.image,
          isPremium: updatedUser.isPremium,
          preferences: updatedUser.preferences
        });
      }
    }
    res.json({ success: true });
  });

  app.get("/api/users", authenticateToken, (req, res) => {
    const now = Date.now();
    const requestingUser = req.query.requestingUser as string;
    let changed = false;
    const users = Array.from(globalUsers.values()).map(user => {
      let displayStatus = user.status;
      // If user hasn't pinged in 15 seconds, mark them as offline
      if (now - user.lastSeen > 15000 && user.status !== 'offline') {
        user.status = 'offline';
        displayStatus = 'offline';
        changed = true;
        io.emit("user-status-changed", { userId: user.id, userName: user.name, status: 'offline', image: user.image });
      }
      
      // Handle invisible status: show as offline to everyone except the user themselves
      if (displayStatus === 'invisible' && user.name !== requestingUser) {
        return { ...user, status: 'offline' };
      }
      
      return { ...user, status: displayStatus };
    });
    if (changed) saveUsers();
    res.json(users);
  });

  app.get("/api/messages", authenticateToken, (req: any, res: any) => {
    const { user, with: withUser } = req.query;
    if (!user) {
      return res.status(400).json({ error: "User is required" });
    }
    const requestingUser = req.user.username;
    const now = Date.now();
    
    // Get blocks for the requesting user (case-insensitive)
    const userBlocks = (globalBlocks[requestingUser] || []).map(b => b.toLowerCase());
    
    // Return messages where user is either sender or receiver
    const filtered = globalMessages.filter(m => {
      const sender = m.sender || '';
      const receiver = m.receiver || m.otherPerson || '';

      if (withUser) {
        const isPair = (sender === user && receiver === withUser) || (sender === withUser && receiver === user) ||
                       (sender === requestingUser && receiver === withUser) || (sender === withUser && receiver === requestingUser);
        if (!isPair) return false;
      } else {
        const isRelevant = (sender === user || receiver === user || sender === requestingUser || receiver === requestingUser);
        if (!isRelevant) return false;
      }
      
      // Filter out messages where either party has blocked the other
      const senderLower = sender.toLowerCase();
      const receiverLower = receiver.toLowerCase();
      const reqUserLower = requestingUser.toLowerCase();
      
      const otherPersonLower = senderLower === reqUserLower ? receiverLower : senderLower;
      
      // If requesting user blocked other person
      if (userBlocks.includes(otherPersonLower)) return false;
      
      // If other person blocked requesting user
      const otherPersonOriginalName = senderLower === reqUserLower ? receiver : sender;
      const otherPersonBlocks = (globalBlocks[otherPersonOriginalName] || []).map(b => b.toLowerCase());
      if (otherPersonBlocks.includes(reqUserLower)) return false;

      return (!m.expiresAt || m.expiresAt > now);
    }).map(m => {
      if (m.inviteServer) {
        const liveServer = globalServers.find((s: any) => s.id === m.inviteServer.id);
        if (!liveServer) {
          return { ...m, inviteServer: { ...m.inviteServer, isDeleted: true } };
        }
        const username = req.user.username;
        if (liveServer.bannedUsers?.some((u: any) => u.id === username) || liveServer.bannedMembers?.includes(username)) {
           return { ...m, inviteServer: { ...liveServer, isBanned: true } };
        }
        const userObj = globalUsers.get(username) || globalAccounts[username];
        const userAge = userObj?.age || 18;
        if (liveServer.is18Plus && userAge <= 16) {
           return { ...m, inviteServer: { ...liveServer, is18PlusRestricted: true } };
        }
        return { ...m, inviteServer: liveServer };
      }
      return m;
    });

    if (withUser) {
      return res.json(filtered.slice(-100));
    }

    // Group by conversation pair so each contact keeps up to 100 recent messages
    const byConversation: Record<string, typeof filtered> = {};
    filtered.forEach(m => {
      const sender = m.sender || '';
      const receiver = m.receiver || m.otherPerson || '';
      const otherPerson = (sender === requestingUser || sender === user) ? receiver : sender;
      if (!byConversation[otherPerson]) {
        byConversation[otherPerson] = [];
      }
      byConversation[otherPerson].push(m);
    });

    const result: typeof filtered = [];
    Object.values(byConversation).forEach(msgs => {
      result.push(...msgs.slice(-100));
    });

    result.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    res.json(result);
  });

  app.post("/api/messages", authenticateToken, (req: any, res: any) => {
    const { message, receiver } = req.body;
    const sender = req.user.username;
    
    if (message && message.sender !== sender) {
      return res.status(403).json({ error: "Unauthorized to send message as another user" });
    }

    if (message && receiver) {
      // Check for bidirectional blocks (case-insensitive)
      const senderBlocks = (globalBlocks[sender] || []).map(b => b.toLowerCase());
      const receiverBlocks = (globalBlocks[receiver] || []).map(b => b.toLowerCase());
      
      if (senderBlocks.includes(receiver.toLowerCase())) {
        return res.status(403).json({ error: "You have blocked this user" });
      }
      if (receiverBlocks.includes(sender.toLowerCase())) {
        return res.status(403).json({ error: "This user has blocked you" });
      }

      const senderObj = globalUsers.get(sender) || globalAccounts[sender];
      const receiverObj = globalUsers.get(receiver) || globalAccounts[receiver];
      
      if (senderObj && receiverObj) {
        const senderAge = senderObj.age || 18;
        const receiverAge = receiverObj.age || 18;
        
        if ((senderAge <= 16 && receiverAge >= 18) || (senderAge >= 18 && receiverAge <= 16)) {
           return res.status(403).json({ error: "Age gap restriction: Users 16 or below cannot message users 18 or older." });
        }
      }

      globalMessages.push({
        ...message,
        receiver,
        otherPerson: receiver,
        timestamp: message.timestamp || Date.now()
      });
      saveMessages();
      
      // Real-time notification via user rooms
      io.to(`user:${message.sender}`).emit("new-dm-message", { message, otherPerson: receiver });
      if (receiver !== message.sender) {
        io.to(`user:${receiver}`).emit("new-dm-message", { message, otherPerson: message.sender });
      }
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Message and receiver are required" });
    }
  });

  app.delete("/api/messages/:id", authenticateToken, (req: any, res: any) => {
    const messageId = req.params.id;
    const message = globalMessages.find(m => m.id === messageId);
    
    if (message) {
      if (message.sender !== req.user.username) {
        return res.status(403).json({ error: "Unauthorized to delete this message" });
      }
      globalMessages = globalMessages.filter(m => m.id !== messageId);
      saveMessages();
      
      // Notify both sender and receiver rooms
      io.to(`user:${message.sender}`).emit("dm-message-deleted", { messageId, sender: message.sender, receiver: message.receiver });
      io.to(`user:${message.receiver}`).emit("dm-message-deleted", { messageId, sender: message.sender, receiver: message.receiver });
      
      return res.json({ success: true });
    } else {
      // Check in group chats
      for (const [groupId, messages] of Object.entries(globalGroupChatMessages)) {
         const mIndex = messages.findIndex(m => m.id === messageId);
         if (mIndex !== -1) {
            const msg = messages[mIndex];
            if (msg.sender !== req.user.username) {
               return res.status(403).json({ error: "Unauthorized to delete this message" });
            }
            
            globalGroupChatMessages[groupId] = messages.filter(m => m.id !== messageId);
            saveGroupChatMessages();

            const gc = globalGroupChats.find(g => g.id === groupId);
            if (gc) {
               gc.members.forEach((m: any) => {
                 io.to(`user:${m.name}`).emit("dm-message-deleted", { messageId, sender: msg.sender, receiver: groupId });
               });
            }
            return res.json({ success: true });
         }
      }

      res.status(404).json({ error: "Message not found" });
    }
  });

  app.post("/api/messages/edit", authenticateToken, (req: any, res: any) => {
    const { messageId, newText, receiver } = req.body;
    const index = globalMessages.findIndex(m => m.id === messageId);
    
    if (index !== -1) {
      if (globalMessages[index].sender !== req.user.username) {
        return res.status(403).json({ error: "Unauthorized to edit this message" });
      }
      globalMessages[index] = {
        ...globalMessages[index],
        text: newText,
        isEdited: true,
        editedAt: Date.now()
      };
      saveMessages();
      
      const message = globalMessages[index];
      // Notify both sender and receiver rooms
      io.to(`user:${message.sender}`).emit("dm-message-edited", { message, otherPerson: message.receiver });
      io.to(`user:${message.receiver}`).emit("dm-message-edited", { message, otherPerson: message.sender });
      
      return res.json({ success: true });
    } else {
      // Check in group chats
      let foundGroup = null;
      for (const [groupId, messages] of Object.entries(globalGroupChatMessages)) {
         const mIndex = messages.findIndex(m => m.id === messageId);
         if (mIndex !== -1) {
            foundGroup = groupId;
            const msg = messages[mIndex];
            if (msg.sender !== req.user.username) {
               return res.status(403).json({ error: "Unauthorized to edit this message" });
            }
            messages[mIndex] = { ...msg, text: newText, isEdited: true, editedAt: Date.now() };
            saveGroupChatMessages();

            const gc = globalGroupChats.find(g => g.id === groupId);
            if (gc) {
               gc.members.forEach((m: any) => {
                 io.to(`user:${m.name}`).emit("dm-message-edited", { message: messages[mIndex], otherPerson: groupId });
               });
            }
            return res.json({ success: true });
         }
      }

      res.status(404).json({ error: "Message not found" });
    }
  });

  app.post("/api/messages/star", authenticateToken, (req: any, res: any) => {
    const { messageId, receiver, serverId, channelId } = req.body;
    const username = req.user.username;
    
    // 1. Check server messages
    let foundServerId = serverId;
    let foundChannelId = channelId;
    let serverMsg: any = null;

    if (foundServerId && foundChannelId && globalServerMessages[foundServerId]?.[foundChannelId]) {
      const idx = globalServerMessages[foundServerId][foundChannelId].findIndex((m: any) => m.id === messageId);
      if (idx !== -1) {
        serverMsg = globalServerMessages[foundServerId][foundChannelId][idx];
      }
    }

    if (!serverMsg) {
      if (foundServerId && globalServerMessages[foundServerId]) {
        for (const [cId, msgs] of Object.entries(globalServerMessages[foundServerId])) {
          const idx = msgs.findIndex((m: any) => m.id === messageId);
          if (idx !== -1) {
            serverMsg = msgs[idx];
            foundChannelId = cId;
            break;
          }
        }
      } else {
        for (const [sId, channels] of Object.entries(globalServerMessages)) {
          for (const [cId, msgs] of Object.entries(channels)) {
            const idx = msgs.findIndex((m: any) => m.id === messageId);
            if (idx !== -1) {
              serverMsg = msgs[idx];
              foundServerId = sId;
              foundChannelId = cId;
              break;
            }
          }
          if (serverMsg) break;
        }
      }
    }

    if (serverMsg && foundServerId && foundChannelId) {
      if (!serverMsg.starredBy) serverMsg.starredBy = [];
      const starIdx = serverMsg.starredBy.indexOf(username);
      if (starIdx === -1) {
        serverMsg.starredBy.push(username);
      } else {
        serverMsg.starredBy.splice(starIdx, 1);
      }
      serverMsg.isStarred = serverMsg.starredBy.length > 0;
      serverMsg.serverId = foundServerId;
      serverMsg.channelId = foundChannelId;
      saveMessages();

      const channelRoom = `${foundServerId}:${foundChannelId}`;
      const serverRoom = `server:${foundServerId}`;
      io.to(channelRoom).emit("server-message-starred", { serverId: foundServerId, channelId: foundChannelId, message: serverMsg });
      io.to(serverRoom).emit("server-message-starred", { serverId: foundServerId, channelId: foundChannelId, message: serverMsg });
      io.to(`user:${username}`).emit("server-message-starred", { serverId: foundServerId, channelId: foundChannelId, message: serverMsg });

      return res.json({ success: true, message: serverMsg, serverId: foundServerId, channelId: foundChannelId });
    }

    const index = globalMessages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const msg = globalMessages[index];
      if (!msg.starredBy) msg.starredBy = [];
      
      const starIdx = msg.starredBy.indexOf(username);
      if (starIdx === -1) {
        msg.starredBy.push(username);
      } else {
        msg.starredBy.splice(starIdx, 1);
      }
      
      msg.isStarred = msg.starredBy.length > 0;
      saveMessages();
      
      if (msg.type === 'group' || (msg.otherPerson && globalGroupChats.some(g => g.id === msg.otherPerson))) {
        const groupId = msg.otherPerson;
        const gc = globalGroupChats.find(g => g.id === groupId);
        if (gc) {
          gc.members.forEach((m: any) => {
            io.to(`user:${m.name}`).emit("dm-message-starred", { message: msg, otherPerson: groupId });
          });
        }
      } else {
        io.to(`user:${msg.sender}`).emit("dm-message-starred", { message: msg, otherPerson: msg.receiver || msg.otherPerson });
        io.to(`user:${msg.receiver || msg.otherPerson}`).emit("dm-message-starred", { message: msg, otherPerson: msg.sender });
      }
      
      return res.json({ success: true, message: msg });
    }
    
    // Check group chats
    for (const [groupId, messages] of Object.entries(globalGroupChatMessages)) {
       const mIndex = messages.findIndex(m => m.id === messageId);
       if (mIndex !== -1) {
          const msg = messages[mIndex];
          if (!msg.starredBy) msg.starredBy = [];
          
          const starIdx = msg.starredBy.indexOf(username);
          if (starIdx === -1) {
            msg.starredBy.push(username);
          } else {
            msg.starredBy.splice(starIdx, 1);
          }
          
          msg.isStarred = msg.starredBy.length > 0;
          saveGroupChatMessages();
          
          const gc = globalGroupChats.find(g => g.id === groupId);
          if (gc) {
             gc.members.forEach((m: any) => {
                io.to(`user:${m.name}`).emit("dm-message-starred", { message: msg, otherPerson: groupId });
             });
          }
          return res.json({ success: true, message: msg });
       }
    }

    return res.status(404).json({ error: "Message not found" });
  });

  app.post("/api/messages/react", authenticateToken, (req: any, res: any) => {
    const { messageId, emoji } = req.body;
    const username = req.user.username;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: "Emoji/reaction is required" });
    }

    // If it is a custom emoji, ensure user is a supporter (isPremium)
    if (emoji.startsWith('<:') && emoji.endsWith('>')) {
      const userObj = Array.from(globalUsers.values()).find(u => u.name === username) || globalAccounts[username];
      if (!userObj?.isPremium) {
        return res.status(403).json({ error: "Supporter role required to react with custom emojis" });
      }
    }

    const index = globalMessages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const msg = globalMessages[index];
      if (!msg.reactions) msg.reactions = {};

      const userList = msg.reactions[emoji] || [];
      const userIndex = userList.indexOf(username);
      if (userIndex !== -1) {
        userList.splice(userIndex, 1);
      } else {
        userList.push(username);
      }

      if (userList.length === 0) {
        delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji] = userList;
      }

      saveMessages();

      io.to(`user:${msg.sender}`).emit("dm-message-reacted", { message: msg, otherPerson: msg.receiver || msg.otherPerson });
      io.to(`user:${msg.receiver || msg.otherPerson}`).emit("dm-message-reacted", { message: msg, otherPerson: msg.sender });

      return res.json({ success: true, message: msg });
    } else {
      // Check group chats
      for (const [groupId, messages] of Object.entries(globalGroupChatMessages)) {
         const mIndex = messages.findIndex(m => m.id === messageId);
         if (mIndex !== -1) {
            const msg = messages[mIndex];
            if (!msg.reactions) msg.reactions = {};

            const userList = msg.reactions[emoji] || [];
            const userIndex = userList.indexOf(username);
            if (userIndex !== -1) {
              userList.splice(userIndex, 1);
            } else {
              userList.push(username);
            }

            if (userList.length === 0) {
              delete msg.reactions[emoji];
            } else {
              msg.reactions[emoji] = userList;
            }

            saveGroupChatMessages();

            const gc = globalGroupChats.find(g => g.id === groupId);
            if (gc) {
               gc.members.forEach((m: any) => {
                 io.to(`user:${m.name}`).emit("dm-message-reacted", { message: msg, otherPerson: groupId });
               });
            }
            return res.json({ success: true, message: msg });
         }
      }

      return res.status(404).json({ error: "Message not found" });
    }
  });

  // Scheduled Messages APIs
  app.get("/api/scheduled-messages", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const userScheduled = globalScheduledMessages.filter(s => s.sender === username && s.status === 'pending');
    res.json(userScheduled);
  });

  app.post("/api/scheduled-messages", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const { targetType, targetId, channelId, targetName, message, scheduledFor } = req.body;

    if (!targetType || !targetId || !message || !scheduledFor) {
      return res.status(400).json({ error: "targetType, targetId, message, and scheduledFor are required" });
    }

    const scheduledTime = Number(scheduledFor);
    if (scheduledTime <= Date.now() + 500) {
      return res.status(400).json({ error: "Scheduled time must be in the future" });
    }

    const scheduledId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newScheduled = {
      id: scheduledId,
      sender: username,
      targetType, // 'dm' | 'group' | 'server'
      targetId,
      channelId: channelId || null,
      targetName: targetName || targetId,
      message: {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        sender: username,
        timestamp: scheduledTime
      },
      scheduledFor: scheduledTime,
      createdAt: Date.now(),
      status: 'pending'
    };

    globalScheduledMessages.push(newScheduled);
    saveScheduledMessages();

    io.to(`user:${username}`).emit("scheduled-message-created", newScheduled);

    res.json({ success: true, scheduledMessage: newScheduled });
  });

  app.delete("/api/scheduled-messages/:id", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const { id } = req.params;

    const item = globalScheduledMessages.find(s => s.id === id);
    if (!item) {
      return res.status(404).json({ error: "Scheduled message not found" });
    }

    if (item.sender !== username) {
      return res.status(403).json({ error: "Unauthorized to cancel this scheduled message" });
    }

    item.status = 'cancelled';
    globalScheduledMessages = globalScheduledMessages.filter(s => s.id !== id);
    saveScheduledMessages();
    try {
      db.prepare("DELETE FROM scheduled_messages WHERE id = ?").run(id);
    } catch (e) {}

    io.to(`user:${username}`).emit("scheduled-message-deleted", { id });

    res.json({ success: true, id });
  });

  app.put("/api/scheduled-messages/:id", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const { id } = req.params;
    const { messageText, scheduledFor, attachments } = req.body;

    const item = globalScheduledMessages.find(s => s.id === id);
    if (!item) {
      return res.status(404).json({ error: "Scheduled message not found" });
    }

    if (item.sender !== username) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (scheduledFor) {
      const scheduledTime = Number(scheduledFor);
      if (scheduledTime <= Date.now() + 500) {
        return res.status(400).json({ error: "Scheduled time must be in the future" });
      }
      item.scheduledFor = scheduledTime;
      if (item.message) {
        item.message.timestamp = scheduledTime;
      }
    }

    if (typeof messageText === 'string') {
      item.message.text = messageText;
      item.message.isEdited = true;
      item.message.editedAt = Date.now();
    }

    if (attachments !== undefined) {
      item.message.attachments = attachments;
    }

    saveScheduledMessages();

    io.to(`user:${username}`).emit("scheduled-message-updated", item);

    res.json({ success: true, scheduledMessage: item });
  });

  app.post("/api/scheduled-messages/:id/send-now", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const { id } = req.params;

    const item = globalScheduledMessages.find(s => s.id === id);
    if (!item) {
      return res.status(404).json({ error: "Scheduled message not found" });
    }

    if (item.sender !== username) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const dispatched = dispatchScheduledMessage(item);
    if (dispatched) {
      globalScheduledMessages = globalScheduledMessages.filter(s => s.id !== id);
      try {
        db.prepare("DELETE FROM scheduled_messages WHERE id = ?").run(id);
      } catch (e) {}
      io.to(`user:${username}`).emit("scheduled-message-deleted", { id });
      return res.json({ success: true, message: item.message });
    } else {
      return res.status(400).json({ error: "Failed to dispatch scheduled message" });
    }
  });

  app.get("/api/server-messages", authenticateToken, (req, res) => {
    res.json(globalServerMessages);
  });

  app.get("/api/blocks", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    res.json(globalBlocks[username] || []);
  });

  app.get("/api/blocking-me", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const blockingMe = Object.keys(globalBlocks).filter(blocker => 
      globalBlocks[blocker].some(target => target.toLowerCase() === username.toLowerCase())
    );
    res.json(blockingMe);
  });

  app.post("/api/block", authenticateToken, (req: any, res: any) => {
    const { targetName } = req.body;
    const username = req.user.username;
    
    if (!targetName) return res.status(400).json({ error: "Target name is required" });
    if (targetName === username) return res.status(400).json({ error: "You cannot block yourself" });

    if (!globalBlocks[username]) globalBlocks[username] = [];
    if (!globalBlocks[username].includes(targetName)) {
      globalBlocks[username].push(targetName);
      saveBlocks();
      
      // Notify target user that they've been blocked (for UI display purposes as requested)
      io.to(`user:${targetName}`).emit('blocked-by-user', { blockerName: username });
    }
    
    // Notify target user that they are unfriended if they were friends (server-side implicit unfriend)
    // Actually, App.tsx handles unfriending locally on the blocker's side.
    // The server doesn't have a friends.json, friends are stored in users' metadata or handled client-side.
    // Wait, let me check if friends are ever stored on server.
    
    res.json({ success: true });
  });

  app.post("/api/unblock", authenticateToken, (req: any, res: any) => {
    const { targetName } = req.body;
    const username = req.user.username;

    if (!targetName) return res.status(400).json({ error: "Target name is required" });

    if (globalBlocks[username]) {
      const wasBlocked = globalBlocks[username].includes(targetName);
      globalBlocks[username] = globalBlocks[username].filter(name => name !== targetName);
      saveBlocks();
      
      if (wasBlocked) {
        // Notify target user that they've been unblocked
        io.to(`user:${targetName}`).emit('unblocked-by-user', { blockerName: username });
      }
    }
    res.json({ success: true });
  });

  app.get("/api/servers/discover", authenticateToken, (req: any, res: any) => {
    const username = req.user.username;
    const userObj = globalUsers.get(username) || globalAccounts[username];
    const userAge = userObj?.age || 18;

    // Return servers that are marked as public and age-appropriate
    const publicServers = globalServers.filter(s => s.isPublic && !(s.is18Plus && userAge <= 16));
    res.json(publicServers);
  });

  // In-memory invite code usage tracker
  // Maps code -> { count: number, maxUses: number, expiresAt: number, usedBy: string[] }
  const inviteTracker: Record<string, { count: number, maxUses: number, expiresAt: number, usedBy: string[] }> = {};

  // Register an invite code for a server
  app.post("/api/servers/:id/invites", authenticateToken, (req: any, res: any) => {
    const serverId = req.params.id;
    const { code, expiresAt, maxUses } = req.body;
    const username = req.user.username;

    const server = globalServers.find((s: any) => s.id === serverId);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (!code) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const exp = expiresAt ? parseInt(expiresAt, 10) : -1;
    const max = maxUses && maxUses !== 'unlimited' ? parseInt(maxUses, 10) : -1;

    globalServerInvites[cleanCode] = {
      code: cleanCode,
      serverId,
      creator: username,
      expiresAt: isNaN(exp) ? -1 : exp,
      maxUses: isNaN(max) ? -1 : max,
      uses: 0,
      createdAt: Date.now()
    };

    try {
      db.prepare(`
        INSERT OR REPLACE INTO server_invites (code, serverId, creator, expiresAt, maxUses, uses, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(cleanCode, serverId, username, isNaN(exp) ? -1 : exp, isNaN(max) ? -1 : max, 0, Date.now());
    } catch (e) {
      console.warn("Failed to persist server invite:", e);
    }

    res.json({ success: true, invite: globalServerInvites[cleanCode] });
  });

  // Universal Invite Resolver endpoint
  app.post("/api/invites/resolve", authenticateOptionalToken, (req: any, res: any) => {
    let { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: "Invite link or code is required" });
    }
    input = input.trim();
    const username = req.user?.username;
    const userObj = username ? (globalUsers.get(username) || globalAccounts[username]) : null;
    const userAge = userObj?.age || 18;

    let serverId: string | null = null;
    let code: string | null = null;
    let expires: number | null = null;
    let maxUses: number | null = null;

    // 1. Parse if URL or query parameters
    try {
      if (input.includes('://') || input.startsWith('?') || input.includes('invite=') || input.includes('code=')) {
        let urlStr = input;
        if (input.startsWith('?')) {
          urlStr = 'http://placeholder/' + input;
        } else if (input.startsWith('vylant://') || input.startsWith('web+vylant://')) {
          urlStr = input.replace(/^(vylant:\/\/|web\+vylant:\/\/)/, 'http://placeholder/');
        }
        const parsed = new URL(urlStr);
        serverId = parsed.searchParams.get('invite') || parsed.searchParams.get('serverId');
        code = parsed.searchParams.get('code');
        const expStr = parsed.searchParams.get('expires');
        if (expStr) expires = parseInt(expStr, 10);
        const maxStr = parsed.searchParams.get('maxUses');
        if (maxStr && maxStr !== 'unlimited') maxUses = parseInt(maxStr, 10);

        if (!code && !serverId && parsed.pathname) {
          const match = parsed.pathname.match(/\/invite\/([^\/?#]+)/i);
          if (match) {
            code = match[1];
          }
        }
      } else if (input.includes('/invite/')) {
        const match = input.match(/\/invite\/([^\/?#]+)/i);
        if (match) code = match[1];
      }
    } catch (e) {
      // Ignored
    }

    if (!serverId && !code) {
      code = input;
    }

    let targetServer: any = null;
    let resolvedCode = code ? code.trim() : '';

    // 2. Try resolving via invite code in globalServerInvites
    if (resolvedCode && globalServerInvites[resolvedCode.toUpperCase()]) {
      const inv = globalServerInvites[resolvedCode.toUpperCase()];
      targetServer = globalServers.find((s: any) => s.id === inv.serverId);
      if (inv.expiresAt && inv.expiresAt !== -1) expires = inv.expiresAt;
      if (inv.maxUses && inv.maxUses !== -1) maxUses = inv.maxUses;
      resolvedCode = inv.code;
    }

    // 3. Try resolving via serverId directly
    if (!targetServer && serverId) {
      targetServer = globalServers.find((s: any) => s.id === serverId);
    }

    // 4. Try treating input/code as direct server ID
    if (!targetServer && resolvedCode) {
      targetServer = globalServers.find((s: any) => s.id === resolvedCode);
    }

    // 5. Try VYLANT official server
    if (!targetServer && (input.toUpperCase() === 'VYLANT' || resolvedCode.toUpperCase() === 'VYLANT' || input === '1')) {
      targetServer = globalServers.find((s: any) => s.id === '1' || s.name?.toLowerCase().includes('vylant'));
    }

    // 6. Try matching server name
    if (!targetServer && (resolvedCode || input)) {
      const searchTerm = (resolvedCode || input).toLowerCase();
      targetServer = globalServers.find((s: any) => s.name?.toLowerCase() === searchTerm);
    }

    if (!targetServer) {
      return res.status(404).json({ error: "Server not found. Please check your invite link or code." });
    }

    // Ban check
    if (username && (targetServer.bannedUsers?.some((u: any) => u.id === username) || targetServer.bannedMembers?.includes(username))) {
      return res.status(403).json({ error: "You are banned from this server", isBanned: true });
    }

    // Age check
    if (targetServer.is18Plus && userAge <= 16) {
      return res.status(403).json({ error: "You do not meet the age requirement for this server", is18PlusRestricted: true });
    }

    // Expiration check
    if (expires && expires !== -1 && Date.now() > expires) {
      return res.status(410).json({ error: "This invitation link has expired." });
    }

    // Max uses check
    if (resolvedCode && globalServerInvites[resolvedCode.toUpperCase()]) {
      const inv = globalServerInvites[resolvedCode.toUpperCase()];
      if (inv.maxUses && inv.maxUses !== -1 && inv.uses >= inv.maxUses) {
        return res.status(410).json({ error: "This invitation link has reached its maximum usage limit." });
      }
    } else if (resolvedCode && inviteTracker[resolvedCode]) {
      const tracker = inviteTracker[resolvedCode];
      if (tracker.maxUses !== -1 && tracker.count >= tracker.maxUses) {
        return res.status(410).json({ error: "This invitation link has reached its maximum usage limit." });
      }
    }

    return res.json({
      success: true,
      server: targetServer,
      code: resolvedCode,
      expires,
      maxUses
    });
  });

  app.get("/api/servers/info/:id", authenticateToken, (req: any, res: any) => {
    const rawId = req.params.id;
    let server = globalServers.find((s: any) => s.id === rawId);
    
    // Also try looking up via invite code or name or vylant
    if (!server) {
      const inv = globalServerInvites[rawId.toUpperCase()];
      if (inv) {
        server = globalServers.find((s: any) => s.id === inv.serverId);
      }
    }
    if (!server && (rawId.toUpperCase() === 'VYLANT' || rawId === '1')) {
      server = globalServers.find((s: any) => s.id === '1' || s.name?.toLowerCase().includes('vylant'));
    }
    if (!server) {
      server = globalServers.find((s: any) => s.name?.toLowerCase() === rawId.toLowerCase());
    }

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    const username = (req as any).user.username;
    if (server.bannedUsers?.some((u: any) => u.id === username) || server.bannedMembers?.includes(username)) {
      return res.status(403).json({ error: "You are banned from this server", isBanned: true });
    }
    
    // Age check
    const userObj = globalUsers.get(username) || globalAccounts[username];
    const userAge = userObj?.age || 18;
    if (server.is18Plus && userAge <= 16) {
      return res.status(403).json({ error: "You do not meet the age requirement for this server", is18PlusRestricted: true });
    }

    // Invite verification and tracking (Max Uses & Expiration)
    const code = req.query.code as string;
    if (code) {
      if (!inviteTracker[code]) {
        inviteTracker[code] = {
          count: 0,
          maxUses: req.query.maxUses && req.query.maxUses !== 'unlimited' ? parseInt(req.query.maxUses as string, 10) : -1,
          expiresAt: req.query.expires ? parseInt(req.query.expires as string, 10) : -1,
          usedBy: []
        };
      }
      const tracker = inviteTracker[code];
      const isMember = globalServerMembers[server.id]?.some((m: any) => m.id === username || m.name === username);
      
      // If NOT already a member and NOT already in usedBy list
      if (!isMember && !tracker.usedBy.includes(username)) {
        // Double check expiry (as safety backup to frontend check)
        if (tracker.expiresAt !== -1 && Date.now() > tracker.expiresAt) {
          return res.status(410).json({ error: "This invitation link has expired." });
        }
        // Check max uses limit
        if (tracker.maxUses !== -1 && tracker.count >= tracker.maxUses) {
          return res.status(410).json({ error: "This invitation link has reached its maximum usage limit." });
        }
        
        // Log consumption
        tracker.count += 1;
        tracker.usedBy.push(username);
      }
    }

    res.json(server);
  });

  app.post("/api/servers/join", authenticateToken, (req: any, res: any) => {
    const { serverId, code } = req.body;
    const username = req.user.username;

    if (!serverId) {
      return res.status(400).json({ error: "Server ID is required" });
    }

    let server = globalServers.find((s: any) => s.id === serverId);
    if (!server && (serverId.toUpperCase() === 'VYLANT' || serverId === '1')) {
      server = globalServers.find((s: any) => s.id === '1' || s.name?.toLowerCase().includes('vylant'));
    }
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const actualServerId = server.id;

    // Ban check
    if (server.bannedUsers?.some((u: any) => u.id === username) || server.bannedMembers?.includes(username)) {
      return res.status(403).json({ error: "You are banned from this server", isBanned: true });
    }

    // Age check
    const userObj = globalUsers.get(username) || globalAccounts[username];
    const userAge = userObj?.age || 18;
    if (server.is18Plus && userAge <= 16) {
      return res.status(403).json({ error: "You do not meet the age requirement for this server", is18PlusRestricted: true });
    }

    // Check code/expiry/maxUses if code provided
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      if (globalServerInvites[cleanCode]) {
        const inv = globalServerInvites[cleanCode];
        if (inv.expiresAt !== -1 && Date.now() > inv.expiresAt) {
          return res.status(410).json({ error: "This invitation link has expired." });
        }
        if (inv.maxUses !== -1 && inv.uses >= inv.maxUses) {
          return res.status(410).json({ error: "This invitation link has reached its maximum usage limit." });
        }
        inv.uses += 1;
        try {
          db.prepare('UPDATE server_invites SET uses = uses + 1 WHERE code = ?').run(cleanCode);
        } catch (e) {
          console.warn("Could not update invite usage:", e);
        }
      }

      if (inviteTracker[code]) {
        const tracker = inviteTracker[code];
        const isMember = globalServerMembers[actualServerId]?.some((m: any) => m.id === username || m.name === username);
        if (!isMember && !tracker.usedBy.includes(username)) {
          if (tracker.expiresAt !== -1 && Date.now() > tracker.expiresAt) {
            return res.status(410).json({ error: "This invitation link has expired." });
          }
          if (tracker.maxUses !== -1 && tracker.count >= tracker.maxUses) {
            return res.status(410).json({ error: "This invitation link has reached its maximum usage limit." });
          }
          tracker.count += 1;
          tracker.usedBy.push(username);
        }
      }
    }

    // Add user to globalServerMembers
    if (!globalServerMembers[actualServerId]) {
      globalServerMembers[actualServerId] = [];
    }

    const userImage = userObj?.image || userObj?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    const newUser = {
      id: username,
      name: username,
      status: 'online',
      image: userImage,
      customStatus: ''
    };

    const existingIdx = globalServerMembers[actualServerId].findIndex((m: any) => m.id === username || m.name === username);
    if (existingIdx === -1) {
      globalServerMembers[actualServerId].push(newUser);
    } else {
      globalServerMembers[actualServerId][existingIdx] = { ...globalServerMembers[actualServerId][existingIdx], ...newUser };
    }
    saveServerMembers();

    if (!server.members) server.members = [];
    if (!server.members.some((m: any) => m.name === username || m.id === username)) {
      server.members.push(newUser);
      saveServers();
    }

    // Emit socket join event if possible
    if (io) {
      io.to('server:' + actualServerId).emit("user-joined-server", { serverId: actualServerId, user: newUser });
    }

    res.json({ success: true, server });
  });

  app.get("/api/servers", authenticateToken, (req: any, res: any) => {
    const { userId } = req.query;
    const username = req.user.username;
    const userObj = globalUsers.get(username) || globalAccounts[username];
    const userAge = userObj?.age || 18;
    
    const enrichServerWithVoiceMembers = (server: any) => {
      const serverBots = globalBots.filter((b: any) => b.installedServers?.includes(server.id));
      const botMembers = serverBots.map((b: any) => ({
        id: b.id,
        name: b.name,
        displayName: b.name,
        image: b.avatar || 'https://i.imgur.com/pBnhSqE.png',
        avatar: b.avatar || 'https://i.imgur.com/pBnhSqE.png',
        status: 'online',
        customStatus: b.customStatus || `Prefix: ${b.prefix || '!'}`,
        isBot: true,
        botTag: b.tag || 'BOT',
        activity: { name: b.customStatus || 'Bot Application', type: 'custom', details: `${b.prefix || '!'}help` },
        roles: ['Bot']
      }));

      const existingMembers = server.members || globalServerMembers[server.id] || [];
      const nonBotMembers = existingMembers.filter((m: any) => !m.isBot && !botMembers.some(bm => bm.id === m.id));
      const combinedMembers = [...nonBotMembers, ...botMembers];

      if (!server.channels || !Array.isArray(server.channels)) {
        return {
          ...server,
          members: combinedMembers
        };
      }
      return {
        ...server,
        members: combinedMembers,
        channels: server.channels.map((channel: any) => {
          const room = `${server.id}:${channel.id}`;
          return {
            ...channel,
            voiceMembers: globalVoiceChannelMembers[room] || []
          };
        })
      };
    };

    if (userId) {
      // Filter servers where the user is a member OR it's a folder they own 
      // OR it's a verified official server
      const userServers = globalServers.filter(server => {
        // Age check globally
        if (server.is18Plus && userAge <= 16) return false;
        
        const members = globalServerMembers[server.id] || [];
        const isMember = members.some((m: any) => m.name === userId || m.id === userId);
        const isOwner = server.ownerId === userId;
        return isMember || isOwner;
      }).map(enrichServerWithVoiceMembers);
      res.json(userServers);
    } else {
      res.json(globalServers.filter(server => !(server.is18Plus && userAge <= 16)).map(enrichServerWithVoiceMembers));
    }
  });

  app.post("/api/servers", authenticateToken, (req: any, res: any) => {
    const { servers } = req.body;
    if (Array.isArray(servers)) {
      // Merge new servers into globalServers instead of overwriting
      servers.forEach((newServer: any) => {
        
        // Strip out voiceMembers so they don't persist
        if (newServer.channels && Array.isArray(newServer.channels)) {
          newServer.channels = newServer.channels.map((c: any) => {
            const { voiceMembers, ...channelWithoutVoiceMembers } = c;
            return channelWithoutVoiceMembers;
          });
        }

        const index = globalServers.findIndex(s => s.id === newServer.id);
        if (index !== -1) {
          const existingServer = globalServers[index];
          // Basic authorization: only owner can modify server settings
          // In a real app, we'd check roles and permissions here
          if (existingServer.ownerId === req.user.username || !existingServer.ownerId) {
            if (!newServer.auditLog && existingServer.auditLog) {
              newServer.auditLog = existingServer.auditLog;
            }
            globalServers[index] = newServer;
            if (newServer.members) {
              globalServerMembers[newServer.id] = newServer.members;
              saveServerMembers();
            }
          }
        } else {
          // New server, ensure ownerId is set to creator if not provided
          if (!newServer.ownerId) {
            newServer.ownerId = req.user.username;
          }
          globalServers.push(newServer);
          if (newServer.members) {
            globalServerMembers[newServer.id] = newServer.members;
            saveServerMembers();
          }
        }
      });
      saveServers();
      // Broadcast updates to all servers modified
      servers.forEach((s: any) => {
        io.to('server:' + s.id).emit("server-updated", { serverId: s.id, server: globalServers.find(gs => gs.id === s.id) });
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Servers array is required" });
    }
  });

  // Server Events Endpoints
  app.get("/api/servers/:serverId/events", authenticateToken, (req: any, res: any) => {
    const { serverId } = req.params;
    try {
      const events = db.prepare('SELECT * FROM server_events WHERE serverId = ? ORDER BY startTime ASC').all(serverId);
      const enrichedEvents = events.map((ev: any) => ({
        ...ev,
        interested: JSON.parse(ev.interested || '[]')
      }));
      res.json(enrichedEvents);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch server events" });
    }
  });

  app.post("/api/servers/:serverId/events", authenticateToken, (req: any, res: any) => {
    const { serverId } = req.params;
    const { name, description, location, startTime, endTime, bannerUrl } = req.body;
    
    if (!name || !startTime) {
      return res.status(400).json({ error: "Event name and start time are required" });
    }

    try {
      const server = globalServers.find(s => s.id === serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      const username = req.user.username;
      const isOwner = server.ownerId === username;
      const isAdmin = username === 't0ai-assistant';
      const userRoles = server.memberRoles?.[username] || [];
      const roles = server.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);

      if (!isOwner && !isAdmin && !canEditSettings) {
        return res.status(403).json({ error: "Only server owners or members with the 'Manage Server' permission can create events." });
      }

      const id = 'ev_' + Math.random().toString(36).substring(2, 11);
      const creator = username;
      const createdAt = Date.now();

      db.prepare(`
        INSERT INTO server_events (id, serverId, creator, name, description, location, startTime, endTime, interested, bannerUrl, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, serverId, creator, name, description || '', location || '', startTime, endTime || '', '[]', bannerUrl || '', createdAt);

      const newEvent = {
        id,
        serverId,
        creator,
        name,
        description: description || '',
        location: location || '',
        startTime,
        endTime: endTime || '',
        interested: [],
        bannerUrl: bannerUrl || '',
        createdAt
      };

      io.emit("server-events-updated", { serverId });
      io.to('server:' + serverId).emit("server-event-created", { serverId, event: newEvent });

      res.status(201).json(newEvent);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create server event: " + e.message });
    }
  });

  app.post("/api/servers/:serverId/events/:eventId/interested", authenticateToken, (req: any, res: any) => {
    const { serverId, eventId } = req.params;
    const username = req.user.username;

    try {
      const event: any = db.prepare('SELECT * FROM server_events WHERE id = ? AND serverId = ?').get(eventId, serverId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      let interested = JSON.parse(event.interested || '[]');
      if (interested.includes(username)) {
        interested = interested.filter((u: string) => u !== username);
      } else {
        interested.push(username);
      }

      db.prepare('UPDATE server_events SET interested = ? WHERE id = ?').run(JSON.stringify(interested), eventId);

      io.emit("server-events-updated", { serverId });
      res.json({ success: true, interested });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to toggle event interest" });
    }
  });

  app.delete("/api/servers/:serverId/events/:eventId", authenticateToken, (req: any, res: any) => {
    const { serverId, eventId } = req.params;
    const username = req.user.username;

    try {
      const event: any = db.prepare('SELECT * FROM server_events WHERE id = ? AND serverId = ?').get(eventId, serverId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const server = globalServers.find(s => s.id === serverId);
      const isOwner = server && server.ownerId === username;
      const isAdmin = username === 't0ai-assistant';
      const userRoles = server?.memberRoles?.[username] || [];
      const roles = server?.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);

      if (event.creator !== username && !isOwner && !isAdmin && !canEditSettings) {
        return res.status(403).json({ error: "Unauthorized to delete this event. Only the event creator, server owner, or admins can delete it." });
      }

      db.prepare('DELETE FROM server_events WHERE id = ?').run(eventId);

      io.emit("server-events-updated", { serverId });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete server event" });
    }
  });

  app.patch("/api/servers/:serverId/events/:eventId", authenticateToken, (req: any, res: any) => {
    const { serverId, eventId } = req.params;
    const username = req.user.username;
    const { name, description, location, startTime, endTime, bannerUrl } = req.body;

    try {
      const event: any = db.prepare('SELECT * FROM server_events WHERE id = ? AND serverId = ?').get(eventId, serverId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const server = globalServers.find(s => s.id === serverId);
      const isOwner = server && server.ownerId === username;
      const isAdmin = username === 't0ai-assistant';
      const userRoles = server?.memberRoles?.[username] || [];
      const roles = server?.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);

      if (event.creator !== username && !isOwner && !isAdmin && !canEditSettings) {
        return res.status(403).json({ error: "Unauthorized to modify this event. Only the event creator, server owner, or admins can update it." });
      }

      db.prepare(`
        UPDATE server_events
        SET name = ?, description = ?, location = ?, startTime = ?, endTime = ?, bannerUrl = ?
        WHERE id = ?
      `).run(
        name || event.name, 
        description !== undefined ? description : event.description, 
        location !== undefined ? location : event.location, 
        startTime || event.startTime, 
        endTime !== undefined ? endTime : event.endTime, 
        bannerUrl !== undefined ? bannerUrl : event.bannerUrl,
        eventId
      );

      io.emit("server-events-updated", { serverId });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update server event" });
    }
  });

  // Server Marketplace Endpoints
  app.get("/api/servers/:serverId/marketplace", authenticateToken, (req: any, res: any) => {
    const { serverId } = req.params;
    try {
      const items = db.prepare('SELECT * FROM server_marketplace_items WHERE serverId = ? ORDER BY createdAt DESC').all(serverId);
      const orders = db.prepare('SELECT * FROM server_marketplace_orders WHERE serverId = ? ORDER BY createdAt DESC').all(serverId);
      const enrichedItems = items.map((it: any) => ({
        ...it,
        tags: JSON.parse(it.tags || '[]'),
        interestedUsers: JSON.parse(it.interestedUsers || '[]')
      }));
      res.json({
        items: enrichedItems,
        orders,
        stats: {
          totalItems: enrichedItems.length,
          activeItems: enrichedItems.filter((i: any) => i.status === 'active').length,
          totalSales: orders.length,
          totalRevenue: orders.reduce((sum: number, o: any) => sum + (Number(o.price) || 0), 0)
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch marketplace data: " + e.message });
    }
  });

  app.post("/api/servers/:serverId/marketplace/items", authenticateToken, (req: any, res: any) => {
    const { serverId } = req.params;
    const { title, description, price, currency, category, imageUrl, stock, contactInfo, tags } = req.body;
    const username = req.user.username;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Item title is required." });
    }

    try {
      const server = globalServers.find(s => s.id === serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found." });
      }

      const isOwner = server.ownerId === username;
      const isAdmin = username === 't0ai-assistant';
      const userRoles = server.memberRoles?.[username] || [];
      const roles = server.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);
      const allowMemberPosts = server.marketplaceSettings?.allowMemberPosts ?? false;

      if (!isOwner && !isAdmin && !canEditSettings && !allowMemberPosts) {
        return res.status(403).json({ error: "Only server owners, managers, or authorized members can list items on this marketplace." });
      }

      const id = 'mkt_' + Math.random().toString(36).substring(2, 11);
      const userObj = globalUsers.get(username) || globalAccounts[username];
      const sellerAvatar = userObj?.image || userObj?.avatar || '';
      const createdAt = Date.now();
      const parsedPrice = Math.max(0, parseFloat(price) || 0);
      const parsedStock = stock !== undefined && stock !== null && stock !== '' ? parseInt(stock) : -1;
      const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

      db.prepare(`
        INSERT INTO server_marketplace_items (id, serverId, sellerId, sellerName, sellerAvatar, title, description, price, currency, category, imageUrl, stock, contactInfo, tags, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, serverId, username, username, sellerAvatar, title.trim(), description || '',
        parsedPrice, currency || 'USD', category || 'general', imageUrl || '', parsedStock,
        contactInfo || '', tagsJson, 'active', createdAt
      );

      const newItem = {
        id,
        serverId,
        sellerId: username,
        sellerName: username,
        sellerAvatar,
        title: title.trim(),
        description: description || '',
        price: parsedPrice,
        currency: currency || 'USD',
        category: category || 'general',
        imageUrl: imageUrl || '',
        stock: parsedStock,
        contactInfo: contactInfo || '',
        tags: Array.isArray(tags) ? tags : [],
        status: 'active',
        createdAt
      };

      io.to('server:' + serverId).emit("marketplace-item-created", { serverId, item: newItem });
      res.status(201).json(newItem);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create marketplace item: " + e.message });
    }
  });

  app.patch("/api/servers/:serverId/marketplace/items/:itemId", authenticateToken, (req: any, res: any) => {
    const { serverId, itemId } = req.params;
    const username = req.user.username;
    const { title, description, price, currency, category, imageUrl, stock, contactInfo, tags, status } = req.body;

    try {
      const item: any = db.prepare('SELECT * FROM server_marketplace_items WHERE id = ? AND serverId = ?').get(itemId, serverId);
      if (!item) {
        return res.status(404).json({ error: "Marketplace item not found." });
      }

      const server = globalServers.find(s => s.id === serverId);
      const isOwner = server && server.ownerId === username;
      const isAdmin = username === 't0ai-assistant';
      const userRoles = server?.memberRoles?.[username] || [];
      const roles = server?.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);

      if (item.sellerId !== username && !isOwner && !isAdmin && !canEditSettings) {
        return res.status(403).json({ error: "Unauthorized to update this marketplace item." });
      }

      const updatedTitle = title !== undefined ? title.trim() : item.title;
      const updatedDescription = description !== undefined ? description : item.description;
      const updatedPrice = price !== undefined ? Math.max(0, parseFloat(price) || 0) : item.price;
      const updatedCurrency = currency !== undefined ? currency : item.currency;
      const updatedCategory = category !== undefined ? category : item.category;
      const updatedImageUrl = imageUrl !== undefined ? imageUrl : item.imageUrl;
      const updatedStock = stock !== undefined ? (stock === '' || stock === null ? -1 : parseInt(stock)) : item.stock;
      const updatedContact = contactInfo !== undefined ? contactInfo : item.contactInfo;
      const updatedTags = tags !== undefined ? JSON.stringify(tags) : item.tags;
      const updatedStatus = status !== undefined ? status : item.status;

      db.prepare(`
        UPDATE server_marketplace_items
        SET title = ?, description = ?, price = ?, currency = ?, category = ?, imageUrl = ?, stock = ?, contactInfo = ?, tags = ?, status = ?
        WHERE id = ? AND serverId = ?
      `).run(
        updatedTitle, updatedDescription, updatedPrice, updatedCurrency, updatedCategory,
        updatedImageUrl, updatedStock, updatedContact, updatedTags, updatedStatus, itemId, serverId
      );

      const updatedItem = {
        ...item,
        title: updatedTitle,
        description: updatedDescription,
        price: updatedPrice,
        currency: updatedCurrency,
        category: updatedCategory,
        imageUrl: updatedImageUrl,
        stock: updatedStock,
        contactInfo: updatedContact,
        tags: JSON.parse(updatedTags || '[]'),
        status: updatedStatus
      };

      io.to('server:' + serverId).emit("marketplace-item-updated", { serverId, item: updatedItem });
      res.json(updatedItem);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update item: " + e.message });
    }
  });

  app.delete("/api/servers/:serverId/marketplace/items/:itemId", authenticateToken, (req: any, res: any) => {
    const { serverId, itemId } = req.params;
    const username = req.user.username;

    try {
      const item: any = db.prepare('SELECT * FROM server_marketplace_items WHERE id = ? AND serverId = ?').get(itemId, serverId);
      if (!item) {
        return res.status(404).json({ error: "Item not found." });
      }

      const server = globalServers.find(s => s.id === serverId);
      const isOwner = server && server.ownerId === username;
      const isAdmin = username === 't0ai-assistant';
      const userRoles = server?.memberRoles?.[username] || [];
      const roles = server?.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);

      if (item.sellerId !== username && !isOwner && !isAdmin && !canEditSettings) {
        return res.status(403).json({ error: "Unauthorized to delete this item." });
      }

      db.prepare('DELETE FROM server_marketplace_items WHERE id = ? AND serverId = ?').run(itemId, serverId);
      io.to('server:' + serverId).emit("marketplace-item-deleted", { serverId, itemId });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete item: " + e.message });
    }
  });

  app.post("/api/servers/:serverId/marketplace/items/:itemId/buy", authenticateToken, (req: any, res: any) => {
    const { serverId, itemId } = req.params;
    const { note } = req.body;
    const username = req.user.username;

    try {
      const item: any = db.prepare('SELECT * FROM server_marketplace_items WHERE id = ? AND serverId = ?').get(itemId, serverId);
      if (!item) {
        return res.status(404).json({ error: "Marketplace item not found." });
      }
      if (item.status === 'sold_out' || item.stock === 0) {
        return res.status(400).json({ error: "This item is sold out." });
      }

      const orderId = 'ord_' + Math.random().toString(36).substring(2, 11);
      const createdAt = Date.now();

      // Decrement stock if finite
      let nextStock = item.stock;
      let nextStatus = item.status;
      if (item.stock > 0) {
        nextStock = item.stock - 1;
        if (nextStock === 0) {
          nextStatus = 'sold_out';
        }
        db.prepare('UPDATE server_marketplace_items SET stock = ?, status = ? WHERE id = ?').run(nextStock, nextStatus, itemId);
      }

      db.prepare(`
        INSERT INTO server_marketplace_orders (id, serverId, itemId, itemTitle, buyerId, buyerName, sellerName, price, currency, note, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, serverId, itemId, item.title, username, username, item.sellerName, item.price, item.currency, note || '', 'completed', createdAt
      );

      const order = {
        id: orderId,
        serverId,
        itemId,
        itemTitle: item.title,
        buyerId: username,
        buyerName: username,
        sellerName: item.sellerName,
        price: item.price,
        currency: item.currency,
        note: note || '',
        status: 'completed',
        createdAt
      };

      const updatedItem = {
        ...item,
        stock: nextStock,
        status: nextStatus,
        tags: JSON.parse(item.tags || '[]'),
        interestedUsers: JSON.parse(item.interestedUsers || '[]')
      };

      io.to('server:' + serverId).emit("marketplace-order-created", { serverId, order });
      io.to('server:' + serverId).emit("marketplace-item-updated", { serverId, item: updatedItem });

      res.status(201).json({ success: true, order, item: updatedItem });
    } catch (e: any) {
      res.status(500).json({ error: "Purchase failed: " + e.message });
    }
  });

  app.post("/api/servers/:serverId/marketplace/items/:itemId/interest", authenticateToken, (req: any, res: any) => {
    const { serverId, itemId } = req.params;
    const { message: inquiryMessage, sendDirectMessage = true } = req.body;
    const username = req.user.username;

    try {
      const item: any = db.prepare('SELECT * FROM server_marketplace_items WHERE id = ? AND serverId = ?').get(itemId, serverId);
      if (!item) {
        return res.status(404).json({ error: "Marketplace item not found." });
      }

      let currentInterested: string[] = [];
      try {
        currentInterested = JSON.parse(item.interestedUsers || '[]');
      } catch {
        currentInterested = [];
      }

      if (!currentInterested.includes(username)) {
        currentInterested.push(username);
      }

      db.prepare('UPDATE server_marketplace_items SET interestedUsers = ? WHERE id = ? AND serverId = ?')
        .run(JSON.stringify(currentInterested), itemId, serverId);

      const updatedItem = {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
        interestedUsers: currentInterested
      };

      io.to('server:' + serverId).emit("marketplace-item-updated", { serverId, item: updatedItem });

      // If inquiryMessage is provided and sendDirectMessage is true, dispatch DM to the seller
      let createdDM: any = null;
      if (sendDirectMessage && inquiryMessage && inquiryMessage.trim().length > 0 && item.sellerName !== username) {
        const fullMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 11),
          sender: username,
          receiver: item.sellerName,
          text: inquiryMessage.trim(),
          timestamp: Date.now(),
          isBot: false,
          marketplaceContext: {
            serverId,
            itemId: item.id,
            itemTitle: item.title,
            itemPrice: item.price,
            itemCurrency: item.currency,
            itemImage: item.imageUrl
          }
        };

        if (!globalMessages.some(m => m.id === fullMessage.id)) {
          globalMessages.push(fullMessage);
          saveMessages();
        }

        io.to(`user:${username}`).emit("new-dm-message", { message: fullMessage, otherPerson: item.sellerName });
        io.to(`user:${item.sellerName}`).emit("new-dm-message", { message: fullMessage, otherPerson: username });
        createdDM = fullMessage;
      }

      res.json({
        success: true,
        item: updatedItem,
        interested: true,
        createdDM
      });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to record interest: " + e.message });
    }
  });

  app.get("/api/servers/:serverId/marketplace/orders", authenticateToken, (req: any, res: any) => {
    const { serverId } = req.params;
    try {
      const orders = db.prepare('SELECT * FROM server_marketplace_orders WHERE serverId = ? ORDER BY createdAt DESC').all(serverId);
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch orders: " + e.message });
    }
  });

  app.get("/api/vanish-mode", authenticateToken, (req, res) => {
    res.json(globalVanishModes);
  });

  app.post("/api/vanish-mode", authenticateToken, (req: any, res: any) => {
    const { user1, user2, isVanishMode } = req.body;
    
    if (user1 !== req.user.username && user2 !== req.user.username) {
      return res.status(403).json({ error: "Unauthorized to modify vanish mode for these users" });
    }

    if (user1 && user2) {
      const key = [user1, user2].sort().join(':');
      globalVanishModes[key] = isVanishMode;
      saveVanishModes();
      
      if (!isVanishMode) {
        // Delete all vanish messages between these two users
        const initialLength = globalMessages.length;
        globalMessages = globalMessages.filter(m => {
          const isBetweenUsers = (m.sender === user1 && m.receiver === user2) || 
                                 (m.sender === user2 && m.receiver === user1);
          return !(isBetweenUsers && m.isVanish);
        });
        if (globalMessages.length !== initialLength) {
          saveMessages();
        }
      }

      // Broadcast to all connected clients that vanish mode changed
      io.emit("vanish-mode-changed", { user1, user2, isVanishMode });
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "user1 and user2 are required" });
    }
  });

  // Socket.io logic
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return next(new Error("Authentication error"));
      (socket as any).user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    // Send initial group calls state to the newly connected user
    socket.emit("active-group-calls-sync", globalActiveGroupCalls);

    const broadcastUserCallStatus = (userName: string) => {
      const socketIds = userSocketMap[userName] || [];
      const allSocketCalls = socketIds.map(id => {
        const call = globalSocketCalls[id];
        if (call) {
          return {
            socketId: id,
            ...call
          };
        }
        return null;
      }).filter(Boolean);

      // Send each socket its list of *other* active calls on other devices
      socketIds.forEach(id => {
        const otherCalls = allSocketCalls.filter((c: any) => c.socketId !== id);
        io.to(id).emit("active-calls-update", otherCalls);
      });
    };

    socket.on("sync-navigation", ({ activeView, activeServer, activeChannel }) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;
      socket.to(`user:${userName}`).emit("navigation-synced", { activeView, activeServer, activeChannel });
    });

    socket.on("sync-muted-channels", ({ mutedChannels }) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;
      socket.to(`user:${userName}`).emit("muted-channels-synced", { mutedChannels });
    });

    socket.on("sync-muted-servers", ({ mutedServers }) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;
      socket.to(`user:${userName}`).emit("muted-servers-synced", { mutedServers });
    });

    socket.on("sync-call-state", (callState) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;

      if (callState) {
        const session = globalSessions[socket.id];
        const deviceName = session?.deviceName || 'Other Device';
        globalSocketCalls[socket.id] = {
          ...callState,
          socketId: socket.id,
          deviceName
        };
      } else {
        delete globalSocketCalls[socket.id];
      }

      broadcastUserCallStatus(userName);
    });

    socket.on("transfer-call-request", ({ targetSocketId }) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;
      
      const userSockets = userSocketMap[userName] || [];
      if (userSockets.includes(targetSocketId)) {
        io.to(targetSocketId).emit("force-disconnect-call");
      }
    });

    socket.on("join-channel", ({ serverId, channelId }) => {
      const server = globalServers.find(s => s.id === serverId);
      const username = (socket as any).user.username;
      if (server) {
        if (server.bannedUsers?.some((u: any) => u.id === username) || server.bannedMembers?.includes(username)) {
           socket.emit("error", { message: "You are banned from this server" });
           return;
        }

        const userObj = globalUsers.get(username) || globalAccounts[username];
        const userAge = userObj?.age || 18;
        if (server.is18Plus && userAge <= 16) {
           socket.emit("error", { message: "You do not meet the age requirement for this server" });
           return;
        }
      }

      const room = `${serverId}:${channelId}`;
      socket.join(room);
      socket.join('server:' + serverId);
      
      // Send existing messages for this channel (last 100)
      if (globalServerMessages[serverId] && globalServerMessages[serverId][channelId]) {
        const allMsgs = globalServerMessages[serverId][channelId];
        const last100 = allMsgs.slice(-100);
        socket.emit("channel-messages", {
          serverId,
          channelId,
          messages: last100,
          hasMore: allMsgs.length > 100
        });
      }
    });

    socket.on("load-more-messages", ({ type, targetId, channelId, lastMessageId, limit = 100 }) => {
      let allMessages: any[] = [];
      const username = (socket as any).user.username;

      if (type === 'server' && targetId && channelId) {
        allMessages = globalServerMessages[targetId]?.[channelId] || [];
      } else if (type === 'dm' && targetId) {
        allMessages = globalMessages.filter(m => 
          (m.sender === username && m.receiver === targetId) || 
          (m.sender === targetId && m.receiver === username)
        );
      } else if (type === 'group' && targetId) {
        allMessages = globalGroupChatMessages[targetId] || [];
      }

      // Find index of lastMessageId
      const index = allMessages.findIndex(m => m.id === lastMessageId);
      if (index === -1) {
        socket.emit("load-more-messages-res", { messages: [], hasMore: false, type, targetId, channelId });
        return;
      }

      // We want messages BEFORE this index (older messages)
      // allMessages is sorted old -> new
      const olderMessages = allMessages.slice(Math.max(0, index - limit), index);
      const hasMore = index - limit > 0;

      socket.emit("load-more-messages-res", { 
        messages: olderMessages, 
        hasMore, 
        type, 
        targetId, 
        channelId 
      });
    });

    socket.on("leave-channel", ({ serverId, channelId }) => {
      const room = `${serverId}:${channelId}`;
      socket.leave(room);
    });

    socket.on("join-voice-channel", ({ serverId, channelId }) => {
      const server = globalServers.find(s => s.id === serverId);
      const username = (socket as any).user.username;
      
      if (server) {
        if (server.bannedUsers?.some((u: any) => u.id === username) || server.bannedMembers?.includes(username)) {
           socket.emit("error", { message: "You are banned from this server" });
           return;
        }

        const userObj = globalUsers.get(username) || globalAccounts[username];
        const userAge = userObj?.age || 18;
        if (server.is18Plus && userAge <= 16) {
           socket.emit("error", { message: "You do not meet the age requirement for this server" });
           return;
        }
      }

      const room = `${serverId}:${channelId}`;
      socket.join(room);
      socket.join('server:' + serverId);
      const userName = socketUserMap[socket.id];
      if (userName) {
        const user = Array.from(globalUsers.values()).find(u => u.name === userName);
        if (user) {
          if (!globalVoiceChannelMembers[room]) {
            globalVoiceChannelMembers[room] = [];
          }
          if (!globalVoiceChannelMembers[room].some((m: any) => m.id === user.id)) {
            globalVoiceChannelMembers[room].push(user);
          }
          // Emit specific join event for mesh WebRTC signaling
          socket.to(room).emit("user-joined-voice", { serverId, channelId, user });
          
          io.to(room).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[room] });
          io.to('server:' + serverId).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[room] });
        }
      }
    });

    socket.on("leave-voice-channel", ({ serverId, channelId }) => {
      const room = `${serverId}:${channelId}`;
      socket.leave(room);
      const userName = socketUserMap[socket.id];
      if (userName && globalVoiceChannelMembers[room]) {
        const leavingUser = globalVoiceChannelMembers[room].find((m: any) => m.name.toLowerCase() === userName.toLowerCase());
        globalVoiceChannelMembers[room] = globalVoiceChannelMembers[room].filter((m: any) => m.name.toLowerCase() !== userName.toLowerCase());
        
        if (leavingUser) {
          socket.to(room).emit("user-left-voice", { serverId, channelId, userId: leavingUser.id, userName: leavingUser.name });
          io.to(room).emit("user-speaking", { userName: leavingUser.name, isSpeaking: false, serverId, channelId });
          io.to('server:' + serverId).emit("user-speaking", { userName: leavingUser.name, isSpeaking: false, serverId, channelId });
        }
        
        io.to(room).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[room] });
        io.to('server:' + serverId).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[room] });
      }
    });

    socket.on("move-voice-member", ({ serverId, targetUsername, toChannelId }) => {
      const server = globalServers.find(s => s.id === serverId);
      const username = (socket as any).user.username;
      
      if (server) {
        const hasPerm = (perm: string) => {
          if (server.ownerId === username) return true;
          const userObj = globalUsers.get(username) || globalAccounts[username];
          const roles = server.roles?.filter(r => server.memberRoles?.[userObj?.id || username]?.includes(r.id)) || [];
          return roles.some(r => (r.permissions as any)[perm]);
        };

        if (hasPerm('manageChannels') || hasPerm('manageRoles') || hasPerm('editSettings') || server.ownerId === username) {
          // Identify the target socket user connection
          io.to(`user:${targetUsername}`).emit("force-move-voice", { serverId, toChannelId });
        } else {
          socket.emit("error", { message: "Insufficient permissions to move members" });
        }
      }
    });

    socket.on("speaking-status", ({ isSpeaking, targetName, isServer, serverId, channelId }) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;

      if (isServer) {
        const room = `${serverId}:${channelId}`;
        const usersInRoom = globalVoiceChannelMembers[room] || [];
        const memberIdx = usersInRoom.findIndex((m: any) => m.name === userName);
        if (memberIdx !== -1) {
          usersInRoom[memberIdx].isSpeaking = isSpeaking;
          socket.to(room).emit("user-speaking", { userName, isSpeaking, serverId, channelId });
        }
      } else {
        // Check if targetName is a group chat
        const groupChat = globalGroupChats.find(gc => gc.name === targetName);
        if (groupChat) {
          // Notify everyone in the group chat using the group room
          socket.to(`group:${groupChat.id}`).emit("user-speaking", { userName, isSpeaking });
        } else {
          // Private call: send to the target user
          io.to(`user:${targetName}`).emit("user-speaking", { userName, isSpeaking });
        }
      }
    });

    socket.on("voice-state-update", ({ isMuted, isDeafened, isServer, serverId, channelId, targetName }) => {
      const userName = socketUserMap[socket.id];
      if (!userName) return;

      if (isServer && serverId && channelId) {
        const room = `${serverId}:${channelId}`;
        const usersInRoom = globalVoiceChannelMembers[room] || [];
        const memberIdx = usersInRoom.findIndex((m: any) => m.name === userName);
        if (memberIdx !== -1) {
          usersInRoom[memberIdx].isMuted = isMuted;
          usersInRoom[memberIdx].isDeafened = isDeafened;
          io.to(room).emit("user-voice-state-changed", { userName, isMuted, isDeafened, serverId, channelId });
        }
      } else if (targetName) {
        // Private call: notify the specific target
        io.to(`user:${targetName}`).emit("user-voice-state-changed", { userName, isMuted, isDeafened });
      }
    });

    socket.on("register-user", async (userName) => {
      if (!userSocketMap[userName]) {
        userSocketMap[userName] = [];
      }
      if (!userSocketMap[userName].includes(socket.id)) {
        userSocketMap[userName].push(socket.id);
      }
      socketUserMap[socket.id] = userName;
      socket.join(`user:${userName}`);

      // Track session and location
      const ua = socket.handshake.headers['user-agent'] || '';
      const ip = socket.handshake.address || '';
      
      const session = await addPersistentSession(userName, ua, ip, socket.id);
      globalSessions[socket.id] = session;

      // Send group chats the user is part of
      const userGroupChats = globalGroupChats.filter(gc => 
        gc.members.some((m: any) => m.name === userName)
      );
      userGroupChats.forEach(gc => {
        socket.join(`group:${gc.id}`);
      });
      socket.emit("group-chats-list", userGroupChats);

      // Send group chat messages history (last 100)
      userGroupChats.forEach(gc => {
        if (globalGroupChatMessages[gc.id]) {
          const allMsgs = globalGroupChatMessages[gc.id];
          const last100 = allMsgs.slice(-100);
          const safeHistory = last100.map(m => ({
            ...m,
            isVanish: false,
            expiresAt: undefined
          }));
          socket.emit("new-group-chat-message", { 
            groupId: gc.id, 
            message: safeHistory,
            isBulk: true,
            hasMore: allMsgs.length > 100
          });
        }
      });
    });

    socket.on("get-group-chats", (userName) => {
      if (userName !== (socket as any).user.username) return;
      const userGroupChats = globalGroupChats.filter(gc => 
        gc.members.some((m: any) => m.name === userName)
      );
      socket.emit("group-chats-list", userGroupChats);
    });

    socket.on("rejoin-servers", ({ userId, serverRooms }) => {
      serverRooms.forEach(({ serverId, channelIds }: { serverId: string, channelIds: string[] }) => {
        channelIds.forEach(channelId => {
          const room = `${serverId}:${channelId}`;
          socket.join(room);
        });
      });
    });

    socket.on("join-server", ({ serverId, user, channelIds }) => {
      const authUser = (socket as any).user.username;
      if (user.id !== authUser) return;
      
      const server = globalServers.find(s => s.id === serverId);
      if (server?.bannedUsers?.some((u: any) => u.id === authUser)) {
        socket.emit("error", { message: "You are banned from this server" });
        return;
      }
      
      if (!globalServerMembers[serverId]) {
        globalServerMembers[serverId] = [];
      }
      
      // Add user or update existing
      const existingUserIdx = globalServerMembers[serverId].findIndex((m: any) => m.id === user.id);
      if (existingUserIdx === -1) {
        globalServerMembers[serverId].push(user);
      } else {
        globalServerMembers[serverId][existingUserIdx] = { ...globalServerMembers[serverId][existingUserIdx], ...user };
      }
      saveServerMembers();
      
      // Join all channels for this server
      if (channelIds && Array.isArray(channelIds)) {
        channelIds.forEach(channelId => {
          const room = `${serverId}:${channelId}`;
          socket.join(room);
        });
      }

      // Broadcast to everyone that a user joined/updated
      io.emit("user-joined-server", { serverId, user });
      
      // Send the current member list to the user who just joined
      const membersWithLatestStatus = globalServerMembers[serverId].map((m: any) => {
        const latestUser = Array.from(globalUsers.values()).find(u => u.id === m.id || u.name === m.name);
        return latestUser ? {
          ...m,
          status: latestUser.status,
          customStatus: latestUser.customStatus,
          image: latestUser.image
        } : m;
      });
      socket.emit("server-members-list", { serverId, members: membersWithLatestStatus });
    });

    socket.on("send-friend-request", ({ senderName, receiverName, request }) => {
      if (senderName !== (socket as any).user.username) return;
      
      // Check for blocks (case-insensitive)
      const senderBlocks = (globalBlocks[senderName] || []).map(b => b.toLowerCase());
      const receiverBlocks = (globalBlocks[receiverName] || []).map(b => b.toLowerCase());

      if (senderBlocks.includes(receiverName.toLowerCase()) || receiverBlocks.includes(senderName.toLowerCase())) {
        socket.emit("error", { message: "Cannot send friend request due to blocking." });
        return;
      }

      const senderObj = globalUsers.get(senderName) || globalAccounts[senderName];
      const receiverObj = globalUsers.get(receiverName) || globalAccounts[receiverName];
      
      if (senderObj && receiverObj) {
        const senderAge = senderObj.age || 18;
        const receiverAge = receiverObj.age || 18;
        
        if ((senderAge <= 16 && receiverAge >= 18) || (senderAge >= 18 && receiverAge <= 16)) {
           socket.emit("error", { message: "Age gap restriction: Users 16 or below cannot add users 18 or older." });
           return;
        }
      }

      if (!globalFriendRequests[receiverName]) {
        globalFriendRequests[receiverName] = [];
      }
      globalFriendRequests[receiverName].push(request);
      saveFriendRequests();

      io.to(`user:${receiverName}`).emit("new-friend-request", request);
    });

    socket.on("get-friend-requests", (userName) => {
      if (userName !== (socket as any).user.username) return;
      const requests = globalFriendRequests[userName] || [];
      socket.emit("friend-requests-list", requests);
    });

    socket.on("remove-friend-request", ({ userName, requestId }) => {
      if (userName !== (socket as any).user.username) return;
      if (globalFriendRequests[userName]) {
        const request = globalFriendRequests[userName].find((r: any) => r.id === requestId);
        globalFriendRequests[userName] = globalFriendRequests[userName].filter((r: any) => r.id !== requestId);
        saveFriendRequests();
        // Broadcast to other sessions of the same user
        io.to(`user:${userName}`).emit("friend-requests-list", globalFriendRequests[userName]);
        
        if (request) {
          // Notify the sender that the request was removed (e.g., declined)
          io.to(`user:${request.name}`).emit("friend-request-removed", { targetName: userName, requestId });
        }
      }
    });

    socket.on("unfriend", ({ userName, friendName }) => {
      if (userName !== (socket as any).user.username) return;
      // Notify the friend that they have been removed from the friend list
      io.to(`user:${friendName}`).emit("unfriended", { friendName: userName });
    });

    socket.on("cancel-friend-request", ({ senderName, receiverName }) => {
      if (senderName !== (socket as any).user.username) return;
      if (globalFriendRequests[receiverName]) {
        globalFriendRequests[receiverName] = globalFriendRequests[receiverName].filter((r: any) => r.name !== senderName);
        saveFriendRequests();
        io.to(`user:${receiverName}`).emit("friend-requests-list", globalFriendRequests[receiverName]);
      }
    });

    socket.on("accept-friend-request", ({ senderName, receiverName, receiverImage, receiverStatus, receiverCustomStatus }) => {
      if (receiverName !== (socket as any).user.username) return;
      
      io.to(`user:${senderName}`).emit("friend-request-accepted", {
        id: `friend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: receiverName,
        image: receiverImage,
        status: receiverStatus,
        customStatus: receiverCustomStatus
      });
    });

    socket.on("create-group-chat", ({ groupChat }) => {
      if (groupChat.creator !== (socket as any).user.username) return;
      globalGroupChats.push(groupChat);
      saveGroupChats();
      // Join the room
      socket.join(`group:${groupChat.id}`);
      // Notify all members
      groupChat.members.forEach((m: any) => {
        io.to(`user:${m.name}`).emit("group-chat-created", groupChat);
        // They will join the room on their next reconnect or via a 'join-group-room' event if we added one.
        // For now, we'll let them join automatically next connect or we can emit a specific join event.
      });
    });

    socket.on("leave-group-chat", ({ groupId, userId }) => {
      if (userId !== (socket as any).user.username) return;
      const groupChatIndex = globalGroupChats.findIndex(gc => gc.id === groupId);
      if (groupChatIndex === -1) return;
      const groupChat = globalGroupChats[groupChatIndex];

      // Leave the room
      socket.leave(`group:${groupId}`);

      // Remove member
      groupChat.members = groupChat.members.filter((m: any) => m.name !== userId);
      
      // If no members left, delete the group chat
      if (groupChat.members.length === 0) {
        globalGroupChats.splice(groupChatIndex, 1);
        delete globalGroupChatMessages[groupId];
        saveGroupChatMessages();
      } else {
        // If the creator left, reassign creator
        if (groupChat.creator === userId) {
           groupChat.creator = groupChat.members[0].name;
        }
      }
      
      saveGroupChats();
      
      // Notify remaining members
      if (groupChat.members.length > 0) {
        groupChat.members.forEach((m: any) => {
          io.to(`user:${m.name}`).emit("group-chat-updated", groupChat);
        });
      }
      // Inform the user who left
      io.to(`user:${userId}`).emit("group-chat-removed", groupId);
    });

    socket.on("kick-group-chat-member", ({ groupId, memberName }) => {
      const groupChat = globalGroupChats.find(gc => gc.id === groupId);
      if (!groupChat) return;
      if (groupChat.creator !== (socket as any).user.username) return; // Only creator can kick
      
      groupChat.members = groupChat.members.filter((m: any) => m.name !== memberName);
      
      saveGroupChats();
      // Notify remaining members
      io.to(`group:${groupId}`).emit("group-chat-updated", groupChat);
      // Inform the user who was kicked
      io.to(`user:${memberName}`).emit("group-chat-removed", groupId);
    });

    socket.on("transfer-group-ownership", ({ groupId, newOwnerName }) => {
      const groupChat = globalGroupChats.find(gc => gc.id === groupId);
      if (!groupChat) return;
      if (groupChat.creator !== (socket as any).user.username) return; // Only creator can transfer
      
      // Ensure the new owner is actually in the group
      if (!groupChat.members.some((m: any) => m.name === newOwnerName)) return;

      groupChat.creator = newOwnerName;
      saveGroupChats();

      groupChat.members.forEach((m: any) => {
        io.to(`user:${m.name}`).emit("group-chat-updated", groupChat);
      });
    });

    socket.on("add-group-chat-members", ({ groupId, newMembers }) => {
      const groupChat = globalGroupChats.find(gc => gc.id === groupId);
      if (!groupChat) return;
      
      // Add the new members, preventing duplicates
      newMembers.forEach((newMember: any) => {
        if (!groupChat.members.some((m: any) => m.name === newMember.name)) {
          groupChat.members.push(newMember);
        }
      });
      
      saveGroupChats();
      
      // Notify everyone that the group chat updated.
      io.to(`group:${groupId}`).emit("group-chat-updated", groupChat);
      
      // Also notify new members individually so they can join the room
      newMembers.forEach((m: any) => {
        io.to(`user:${m.name}`).emit("group-chat-created", groupChat);
      });
    });

    socket.on("send-dm-message", ({ receiver, message }) => {
      const sender = (socket as any).user?.username || socketUserMap[socket.id];
      if (!sender || !receiver || !message) return;

      // Ensure sender cannot spoof another user name
      const msgSender = (message.sender && message.sender !== sender) ? sender : (message.sender || sender);

      // Check blocks
      const senderBlocks = (globalBlocks[msgSender] || []).map(b => b.toLowerCase());
      const receiverBlocks = (globalBlocks[receiver] || []).map(b => b.toLowerCase());
      if (senderBlocks.includes(receiver.toLowerCase()) || receiverBlocks.includes(msgSender.toLowerCase())) {
        return;
      }

      // Check age restriction
      const senderObj = globalUsers.get(msgSender) || globalAccounts[msgSender];
      const receiverObj = globalUsers.get(receiver) || globalAccounts[receiver];
      if (senderObj && receiverObj) {
        const senderAge = senderObj.age || 18;
        const receiverAge = receiverObj.age || 18;
        if ((senderAge <= 16 && receiverAge >= 18) || (senderAge >= 18 && receiverAge <= 16)) {
          return;
        }
      }

      const fullMessage = {
        ...message,
        sender: msgSender,
        receiver,
        otherPerson: receiver,
        timestamp: message.timestamp || Date.now()
      };

      if (!globalMessages.some(m => m.id === fullMessage.id)) {
        globalMessages.push(fullMessage);
        saveMessages();
      }

      io.to(`user:${msgSender}`).emit("new-dm-message", { message: fullMessage, otherPerson: receiver });
      if (receiver !== msgSender) {
        io.to(`user:${receiver}`).emit("new-dm-message", { message: fullMessage, otherPerson: msgSender });
      }
    });

    socket.on("send-group-chat-message", ({ groupId, message }) => {
      const groupChat = globalGroupChats.find(gc => gc.id === groupId);
      if (!groupChat || !groupChat.members.some((m: any) => m.name === (socket as any).user.username)) {
        socket.emit("error", { message: "Unauthorized or group does not exist" });
        return;
      }
      
      // Store message (strip vanish properties for safety in groups)
      if (!globalGroupChatMessages[groupId]) {
        globalGroupChatMessages[groupId] = [];
      }
      
      const safeMessage = {
        ...message,
        isVanish: false,
        expiresAt: undefined
      };
      
      globalGroupChatMessages[groupId].push(safeMessage);
      // Keep only last 100 messages per group for performance
      if (globalGroupChatMessages[groupId].length > 100) {
        globalGroupChatMessages[groupId].shift();
      }
      saveGroupChatMessages();

      // Broadcast to all members using the group room
      io.to(`group:${groupId}`).emit("new-group-chat-message", { groupId, message: safeMessage });
    });

    socket.on("send-server-message", ({ serverId, channelId, message }) => {
      try {
        if (message.sender !== (socket as any).user.username) {
            socket.emit("error", { message: "Unauthorized message sender" });
            return;
        }
        const room = `${serverId}:${channelId}`;
        
        if (!globalServerMessages[serverId]) {
          globalServerMessages[serverId] = {};
        }
        if (!globalServerMessages[serverId][channelId]) {
          globalServerMessages[serverId][channelId] = [];
        }
        
        globalServerMessages[serverId][channelId].push(message);
        saveMessages();
        
        // Broadcast to everyone in the room (including sender)
        io.to(room).emit("new-server-message", { serverId, channelId, message });

        // Check bots installed in this server for commands, auto-responses, and AI queries
        if (!message.isBot && message.text) {
          const rawText = (message.text || '').trim();
          const serverBots = globalBots.filter((b: any) => b.installedServers?.includes(serverId));
          
          for (const bot of serverBots) {
            const prefix = bot.prefix || '!';

            // 1. Check command
            if (rawText.startsWith(prefix)) {
              const withoutPrefix = rawText.slice(prefix.length).trim();
              const [cmdName, ...args] = withoutPrefix.split(/\s+/);
              const lowerCmd = (cmdName || '').toLowerCase();

              const matchedCmd = bot.commands?.find((c: any) => 
                c.name.toLowerCase() === lowerCmd || 
                (c.aliases && c.aliases.some((a: string) => a.toLowerCase() === lowerCmd))
              );

              if (matchedCmd) {
                const targetServer = globalServers.find(s => s.id === serverId);
                const channels = targetServer?.channels || [];
                const targetChannel = channels.find((c: any) => c.id === channelId);

                const responseText = processBotPlaceholders(matchedCmd.response, {
                  user: message.sender,
                  sender: message.sender,
                  server: targetServer?.name || 'Server',
                  channel: targetChannel?.name || 'channel',
                  args: args.join(' ')
                });

                const botMsg = {
                  id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  serverId,
                  channelId,
                  sender: bot.name,
                  senderImage: bot.avatar,
                  text: responseText,
                  timestamp: Date.now(),
                  isBot: true,
                  botTag: bot.tag || 'BOT',
                  botId: bot.id,
                  replyTo: message.id
                };

                globalServerMessages[serverId][channelId].push(botMsg);
                saveMessages();

                recordBotActivity(bot, {
                  type: 'command',
                  name: matchedCmd.name,
                  trigger: `${prefix}${matchedCmd.name}`,
                  serverName: targetServer?.name || 'Server',
                  channelName: targetChannel?.name || 'channel',
                  userName: message.sender,
                  responseSnippet: responseText
                });

                setTimeout(() => {
                  io.to(room).emit("new-server-message", { serverId, channelId, message: botMsg });
                }, 200);
                continue;
              }
            }

            // 2. Check auto-responses
            const matchedAutoResp = bot.autoResponses?.find((ar: any) => {
              if (!ar.trigger) return false;
              const trig = ar.trigger.toLowerCase();
              const msgText = rawText.toLowerCase();
              if (ar.matchType === 'exact') return msgText === trig;
              if (ar.matchType === 'startsWith') return msgText.startsWith(trig);
              return msgText.includes(trig);
            });

            if (matchedAutoResp) {
              const targetServer = globalServers.find(s => s.id === serverId);
              const channels = targetServer?.channels || [];
              const targetChannel = channels.find((c: any) => c.id === channelId);

              const responseText = processBotPlaceholders(matchedAutoResp.response, {
                user: message.sender,
                sender: message.sender,
                server: targetServer?.name || 'Server',
                channel: targetChannel?.name || 'channel',
                args: ''
              });

              const botMsg = {
                id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                serverId,
                channelId,
                sender: bot.name,
                senderImage: bot.avatar,
                text: responseText,
                timestamp: Date.now(),
                isBot: true,
                botTag: bot.tag || 'BOT',
                botId: bot.id,
                replyTo: message.id
              };

              globalServerMessages[serverId][channelId].push(botMsg);
              saveMessages();

              recordBotActivity(bot, {
                type: 'autoResponse',
                name: matchedAutoResp.trigger,
                trigger: matchedAutoResp.trigger,
                serverName: targetServer?.name || 'Server',
                channelName: targetChannel?.name || 'channel',
                userName: message.sender,
                responseSnippet: responseText
              });

              setTimeout(() => {
                io.to(room).emit("new-server-message", { serverId, channelId, message: botMsg });
              }, 250);
              continue;
            }

            // 3. Check AI prompt or mention
            if (bot.isAiPowered) {
              const mentionPattern = new RegExp(`@${bot.name}`, 'i');
              const aiCmdPattern = new RegExp(`^\\${bot.prefix || '!'}ai`, 'i');
              if (mentionPattern.test(rawText) || aiCmdPattern.test(rawText)) {
                const prompt = rawText.replace(mentionPattern, '').replace(aiCmdPattern, '').trim();
                if (prompt) {
                  handleBotAiResponse(bot, serverId, channelId, message, prompt);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("send-server-message error:", err);
        socket.emit("error", { message: "Failed to send message", resolution: "Please check your connection and try again." });
      }
    });

    socket.on("get-scheduled-messages", () => {
      const username = (socket as any).user?.username;
      if (!username) return;
      const userScheduled = globalScheduledMessages.filter(s => s.sender === username && s.status === 'pending');
      socket.emit("scheduled-messages-list", userScheduled);
    });

    socket.on("schedule-message", ({ targetType, targetId, channelId, targetName, message, scheduledFor }) => {
      const username = (socket as any).user?.username;
      if (!username || !targetType || !targetId || !message || !scheduledFor) return;
      const scheduledTime = Number(scheduledFor);
      if (scheduledTime <= Date.now() + 500) {
        socket.emit("error", { message: "Scheduled time must be in the future" });
        return;
      }

      const scheduledId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newScheduled = {
        id: scheduledId,
        sender: username,
        targetType,
        targetId,
        channelId: channelId || null,
        targetName: targetName || targetId,
        message: {
          ...message,
          id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sender: username,
          timestamp: scheduledTime
        },
        scheduledFor: scheduledTime,
        createdAt: Date.now(),
        status: 'pending'
      };

      globalScheduledMessages.push(newScheduled);
      saveScheduledMessages();
      io.to(`user:${username}`).emit("scheduled-message-created", newScheduled);
    });

    socket.on("cancel-scheduled-message", ({ id }) => {
      const username = (socket as any).user?.username;
      if (!username || !id) return;
      const item = globalScheduledMessages.find(s => s.id === id);
      if (item && item.sender === username) {
        globalScheduledMessages = globalScheduledMessages.filter(s => s.id !== id);
        try {
          db.prepare("DELETE FROM scheduled_messages WHERE id = ?").run(id);
        } catch (e) {}
        io.to(`user:${username}`).emit("scheduled-message-deleted", { id });
      }
    });

    socket.on("send-scheduled-message-now", ({ id }) => {
      const username = (socket as any).user?.username;
      if (!username || !id) return;
      const item = globalScheduledMessages.find(s => s.id === id);
      if (item && item.sender === username) {
        const dispatched = dispatchScheduledMessage(item);
        if (dispatched) {
          globalScheduledMessages = globalScheduledMessages.filter(s => s.id !== id);
          try {
            db.prepare("DELETE FROM scheduled_messages WHERE id = ?").run(id);
          } catch (e) {}
          io.to(`user:${username}`).emit("scheduled-message-deleted", { id });
        }
      }
    });

    socket.on("vote-poll", ({ serverId, channelId, messageId, optionId, userName }) => {
      try {
        const user = (socket as any).user?.username || userName;
        let msg: any = null;
        let isServerMsg = false;
        let isDMMsg = false;
        let isGroupMsg = false;
        let groupID = "";

        // 1. Try server messages
        if (serverId && channelId && globalServerMessages[serverId]?.[channelId]) {
          msg = globalServerMessages[serverId][channelId].find((m: any) => m.id === messageId);
          if (msg) isServerMsg = true;
        }

        // 2. Try globalMessages (DMs)
        if (!msg && globalMessages) {
          msg = globalMessages.find((m: any) => m.id === messageId);
          if (msg) isDMMsg = true;
        }

        // 3. Try group chats
        if (!msg && globalGroupChatMessages) {
          for (const [gId, msgs] of Object.entries(globalGroupChatMessages)) {
            msg = (msgs as any[]).find(m => m.id === messageId);
            if (msg) {
              isGroupMsg = true;
              groupID = gId;
              break;
            }
          }
        }

        if (msg && msg.poll && !msg.poll.closed) {
          const isExpired = msg.poll.expiresAt && Date.now() > msg.poll.expiresAt;
          if (isExpired) {
            msg.poll.closed = true;
          } else {
            const option = msg.poll.options.find((o: any) => o.id === optionId);
            if (option) {
              if (!option.votes) option.votes = [];
              const hasVoted = option.votes.includes(user);
              if (msg.poll.allowMultiple) {
                if (hasVoted) {
                  option.votes = option.votes.filter((v: string) => v !== user);
                } else {
                  option.votes.push(user);
                }
              } else {
                msg.poll.options.forEach((opt: any) => {
                  if (opt.votes) {
                    opt.votes = opt.votes.filter((v: string) => v !== user);
                  }
                });
                if (!hasVoted) {
                  option.votes.push(user);
                }
              }
            }
          }

          if (isServerMsg) {
            saveMessages();
            const room = `${serverId}:${channelId}`;
            io.to(room).emit("poll-updated", { serverId, channelId, messageId, poll: msg.poll });
          } else if (isDMMsg) {
            saveMessages();
            io.to(`user:${msg.sender}`).emit("dm-message-edited", { message: msg, otherPerson: msg.receiver });
            io.to(`user:${msg.receiver}`).emit("dm-message-edited", { message: msg, otherPerson: msg.sender });
          } else if (isGroupMsg) {
            saveGroupChatMessages();
            const gc = globalGroupChats.find(g => g.id === groupID);
            if (gc) {
              gc.members.forEach((m: any) => {
                io.to(`user:${m.name}`).emit("dm-message-edited", { message: msg, otherPerson: groupID });
              });
            }
          }
        }
      } catch (err) {
        console.error("vote-poll error:", err);
      }
    });

    socket.on("close-poll", ({ serverId, channelId, messageId }) => {
      try {
        let msg: any = null;
        let isServerMsg = false;
        let isDMMsg = false;
        let isGroupMsg = false;
        let groupID = "";

        // 1. Try server messages
        if (serverId && channelId && globalServerMessages[serverId]?.[channelId]) {
          msg = globalServerMessages[serverId][channelId].find((m: any) => m.id === messageId);
          if (msg) isServerMsg = true;
        }

        // 2. Try globalMessages (DMs)
        if (!msg && globalMessages) {
          msg = globalMessages.find((m: any) => m.id === messageId);
          if (msg) isDMMsg = true;
        }

        // 3. Try group chats
        if (!msg && globalGroupChatMessages) {
          for (const [gId, msgs] of Object.entries(globalGroupChatMessages)) {
            msg = (msgs as any[]).find(m => m.id === messageId);
            if (msg) {
              isGroupMsg = true;
              groupID = gId;
              break;
            }
          }
        }

        if (msg && msg.poll) {
          msg.poll.closed = true;

          if (isServerMsg) {
            saveMessages();
            const room = `${serverId}:${channelId}`;
            io.to(room).emit("poll-updated", { serverId, channelId, messageId, poll: msg.poll });
          } else if (isDMMsg) {
            saveMessages();
            io.to(`user:${msg.sender}`).emit("dm-message-edited", { message: msg, otherPerson: msg.receiver });
            io.to(`user:${msg.receiver}`).emit("dm-message-edited", { message: msg, otherPerson: msg.sender });
          } else if (isGroupMsg) {
            saveGroupChatMessages();
            const gc = globalGroupChats.find(g => g.id === groupID);
            if (gc) {
              gc.members.forEach((m: any) => {
                io.to(`user:${m.name}`).emit("dm-message-edited", { message: msg, otherPerson: groupID });
              });
            }
          }
        }
      } catch (err) {
        console.error("close-poll error:", err);
      }
    });

    socket.on("join-group-room", ({ groupId }) => {
       socket.join(`group:${groupId}`);
    });

    socket.on("leave-server", ({ serverId, userId }) => {
      const authUser = (socket as any).user?.username;
      const targetUser = userId || authUser;
      if (authUser && targetUser && targetUser === authUser) {
        if (globalServerMembers[serverId]) {
          globalServerMembers[serverId] = globalServerMembers[serverId].filter((m: any) => m.id !== targetUser && m.name !== targetUser);
          saveServerMembers();
        }
        const s = globalServers.find(gs => gs.id === serverId);
        if (s && s.members) {
          s.members = s.members.filter((m: any) => m.id !== targetUser && m.name !== targetUser);
          saveServers();
        }
        io.emit("user-left-server", { serverId, userId: targetUser });
      }
    });

    socket.on("star-server-message", ({ serverId, channelId, messageId }) => {
      const username = (socket as any).user?.username || (socket as any).user?.name;
      if (!username) return;
      
      let foundServerId = serverId;
      let foundChannelId = channelId;
      let msg: any = null;

      if (foundServerId && foundChannelId && globalServerMessages[foundServerId]?.[foundChannelId]) {
        const index = globalServerMessages[foundServerId][foundChannelId].findIndex((m: any) => m.id === messageId);
        if (index !== -1) {
          msg = globalServerMessages[foundServerId][foundChannelId][index];
        }
      }

      if (!msg) {
        if (foundServerId && globalServerMessages[foundServerId]) {
          for (const [cId, msgs] of Object.entries(globalServerMessages[foundServerId])) {
            const index = msgs.findIndex((m: any) => m.id === messageId);
            if (index !== -1) {
              msg = msgs[index];
              foundChannelId = cId;
              break;
            }
          }
        } else {
          for (const [sId, channels] of Object.entries(globalServerMessages)) {
            for (const [cId, msgs] of Object.entries(channels)) {
              const index = msgs.findIndex((m: any) => m.id === messageId);
              if (index !== -1) {
                msg = msgs[index];
                foundServerId = sId;
                foundChannelId = cId;
                break;
              }
            }
            if (msg) break;
          }
        }
      }

      if (msg && foundServerId && foundChannelId) {
        if (!msg.starredBy) msg.starredBy = [];
        
        const starIdx = msg.starredBy.indexOf(username);
        if (starIdx === -1) {
          msg.starredBy.push(username);
        } else {
          msg.starredBy.splice(starIdx, 1);
        }
        
        msg.isStarred = msg.starredBy.length > 0;
        msg.serverId = foundServerId;
        msg.channelId = foundChannelId;
        saveMessages();
        
        const channelRoom = `${foundServerId}:${foundChannelId}`;
        const serverRoom = `server:${foundServerId}`;
        io.to(channelRoom).emit("server-message-starred", { serverId: foundServerId, channelId: foundChannelId, message: msg });
        io.to(serverRoom).emit("server-message-starred", { serverId: foundServerId, channelId: foundChannelId, message: msg });
        io.to(`user:${username}`).emit("server-message-starred", { serverId: foundServerId, channelId: foundChannelId, message: msg });
      }
    });

    const recordServerAudit = (targetServer: any, entry: { action: string; executorName: string; executorId?: string; targetName?: string; targetId?: string; reason?: string }) => {
      if (!targetServer) return;
      if (!targetServer.auditLog) targetServer.auditLog = [];
      const logEntry = {
        id: Math.random().toString(36).substr(2, 9),
        action: entry.action,
        executorId: entry.executorId || entry.executorName,
        executorName: entry.executorName,
        targetId: entry.targetId,
        targetName: entry.targetName,
        reason: entry.reason,
        timestamp: Date.now()
      };
      targetServer.auditLog.unshift(logEntry);
      if (targetServer.auditLog.length > 200) {
        targetServer.auditLog = targetServer.auditLog.slice(0, 200);
      }
    };

    socket.on("kick-member", ({ serverId, memberId, reason }) => {
      const server = globalServers.find(s => s.id === serverId);
      // Basic permission check: only owner or t0ai-assistant for now
      const executor = (socket as any).user.username;
      const isOwner = server && server.ownerId === executor;
      const isAdmin = executor === 't0ai-assistant';
      
      if (!isOwner && !isAdmin) return;

      if (server) {
        recordServerAudit(server, {
          action: 'kick',
          executorName: executor,
          executorId: executor,
          targetName: memberId,
          targetId: memberId,
          reason
        });
        saveServers();
        io.to('server:' + serverId).emit("server-updated", { serverId, server });
      }

      if (globalServerMembers[serverId]) {
        globalServerMembers[serverId] = globalServerMembers[serverId].filter((m: any) => m.id !== memberId);
        saveServerMembers();
        io.to(`user:${memberId}`).emit("kicked-from-server", { serverId, reason });
        io.emit("user-left-server", { serverId, userId: memberId });
        
        const botMessage = {
          id: Math.random().toString(36).substring(2, 15),
          sender: 'T0AI Assistant',
          senderImage: 'https://i.imgur.com/pBnhSqE.png',
          text: `You have been kicked from **${server ? server.name : 'a server'}**${reason ? ` for: *${reason}*` : '.'}`,
          isBot: true,
          timestamp: Date.now(),
          receiver: memberId,
          otherPerson: memberId
        };
        globalMessages.push(botMessage);
        saveMessages();
        io.to(`user:${memberId}`).emit("new-dm-message", { message: botMessage, otherPerson: 'T0AI Assistant' });
      }
    });

    socket.on("ban-member", ({ serverId, memberId, reason }) => {
      const server = globalServers.find(s => s.id === serverId);
      const executor = (socket as any).user.username;
      const isOwner = server && server.ownerId === executor;
      const isAdmin = executor === 't0ai-assistant';
      
      if (!isOwner && !isAdmin) return;

      // Persist ban in server data
      if (server) {
        if (!server.bannedUsers) server.bannedUsers = [];
        if (!server.bannedUsers.some((u: any) => u.id === memberId)) {
          server.bannedUsers.push({ id: memberId, name: memberId, reason, timestamp: Date.now() });
        }
        recordServerAudit(server, {
          action: 'ban',
          executorName: executor,
          executorId: executor,
          targetName: memberId,
          targetId: memberId,
          reason
        });
        saveServers();
        io.to('server:' + serverId).emit("server-updated", { serverId, server });
      }

      if (globalServerMembers[serverId]) {
        globalServerMembers[serverId] = globalServerMembers[serverId].filter((m: any) => m.id !== memberId);
        saveServerMembers();
        io.to(`user:${memberId}`).emit("kicked-from-server", { serverId, banned: true, reason });
        io.emit("user-left-server", { serverId, userId: memberId });
        
        const botMessage = {
          id: Math.random().toString(36).substring(2, 15),
          sender: 'T0AI Assistant',
          senderImage: 'https://i.imgur.com/pBnhSqE.png',
          text: `You have been banned from **${server ? server.name : 'a server'}**${reason ? ` for: *${reason}*` : '.'}`,
          isBot: true,
          timestamp: Date.now(),
          receiver: memberId,
          otherPerson: memberId
        };
        globalMessages.push(botMessage);
        saveMessages();
        io.to(`user:${memberId}`).emit("new-dm-message", { message: botMessage, otherPerson: 'T0AI Assistant' });
      }
    });

    socket.on("delete-server-message", ({ serverId, channelId, messageId }) => {
      const room = `${serverId}:${channelId}`;
      
      if (globalServerMessages[serverId] && globalServerMessages[serverId][channelId]) {
        const msg = globalServerMessages[serverId][channelId].find((m: any) => m.id === messageId);
        if (msg && msg.sender !== (socket as any).user.username) return;

        globalServerMessages[serverId][channelId] = globalServerMessages[serverId][channelId].filter(
          (m: any) => m.id !== messageId
        );
        saveMessages();
        io.to(room).emit("server-message-deleted", { serverId, channelId, messageId });
      }
    });

    socket.on("edit-server-message", ({ serverId, channelId, messageId, newText }) => {
      const room = `${serverId}:${channelId}`;
      
      if (globalServerMessages[serverId] && globalServerMessages[serverId][channelId]) {
        const index = globalServerMessages[serverId][channelId].findIndex((m: any) => m.id === messageId);
        if (index !== -1) {
          if (globalServerMessages[serverId][channelId][index].sender !== (socket as any).user.username) return;
          globalServerMessages[serverId][channelId][index] = {
            ...globalServerMessages[serverId][channelId][index],
            text: newText,
            isEdited: true,
            editedAt: Date.now()
          };
          saveMessages();
          io.to(room).emit("server-message-edited", { 
            serverId, 
            channelId, 
            message: globalServerMessages[serverId][channelId][index] 
          });
        }
      }
    });

    socket.on("react-server-message", ({ serverId, channelId, messageId, emoji }) => {
      const room = `${serverId}:${channelId}`;
      const username = (socket as any).user.username;

      if (!emoji || typeof emoji !== 'string') return;

      // If it is a custom emoji, ensure user is a supporter (isPremium)
      if (emoji.startsWith('<:') && emoji.endsWith('>')) {
        const userObj = Array.from(globalUsers.values()).find(u => u.name === username) || globalAccounts[username];
        if (!userObj?.isPremium) {
          socket.emit("error", { message: "Supporter role required to react with custom emojis", resolution: "Upgrade to Supporter to unlock custom emoji reactions." });
          return;
        }
      }

      if (globalServerMessages[serverId] && globalServerMessages[serverId][channelId]) {
        const index = globalServerMessages[serverId][channelId].findIndex((m: any) => m.id === messageId);
        if (index !== -1) {
          const msg = globalServerMessages[serverId][channelId][index];
          if (!msg.reactions) msg.reactions = {};

          const userList = msg.reactions[emoji] || [];
          const userIndex = userList.indexOf(username);
          if (userIndex !== -1) {
            userList.splice(userIndex, 1);
          } else {
            userList.push(username);
          }

          if (userList.length === 0) {
            delete msg.reactions[emoji];
          } else {
            msg.reactions[emoji] = userList;
          }

          saveMessages();
          io.to(room).emit("server-message-reacted", { 
            serverId, 
            channelId, 
            message: msg 
          });
        }
      }
    });

    socket.on("transfer-ownership", ({ serverId, targetUsername }) => {
      const server = globalServers.find(s => s.id === serverId);
      const executor = (socket as any).user.username;
      
      if (!server || server.ownerId !== executor) return;

      // Check if target is in server members
      const members = globalServerMembers[serverId] || [];
      const target = members.find((m: any) => m.name === targetUsername || m.id === targetUsername);
      
      if (!target && targetUsername !== executor) {
        socket.emit("error", { message: "Target user is not a member of this server" });
        return;
      }

      const targetId = target ? target.id : targetUsername;

      server.ownerId = targetId;

      recordServerAudit(server, {
        action: 'transfer_ownership',
        executorName: executor,
        targetName: targetUsername
      });
      
      saveServers();
      io.emit("server-updated", { serverId: server.id, server });
      io.to('server:' + serverId).emit("ownership-transferred", { serverId, newOwnerId: targetId });
    });

    socket.on("delete-server", ({ serverId }) => {
      const server = globalServers.find(s => s.id === serverId);
      if (!server) return; // Cannot delete what doesn't exist in our global list
      
      // Strict ownership check
      if (server.ownerId && server.ownerId !== (socket as any).user.username) {
        return; 
      }
      
      // If server.ownerId is missing, only allow if the user is the one who created it (using another check if possible)
      // For now, if it has no owner, it might be a system server, so protect it.
      if (!server.ownerId) return;

      if (globalServerMessages[serverId]) {
        delete globalServerMessages[serverId];
        saveMessages();
      }
      if (globalServerMembers[serverId]) {
        delete globalServerMembers[serverId];
        saveServerMembers();
      }
      const initialServersLength = globalServers.length;
      globalServers = globalServers.filter(s => s.id !== serverId);
      if (globalServers.length !== initialServersLength) {
        saveServers();
      }
      io.emit("server-deleted", { serverId });
    });

    socket.on("create-channel", ({ serverId, channel }) => {
      const server = globalServers.find(s => s.id === serverId);
      if (!server || !server.channels) return;
      
      const exists = server.channels.some((c: any) => c.id === channel.id);
      if (!exists) {
        server.channels.push(channel);
        recordServerAudit(server, {
          action: 'create_channel',
          executorName: (socket as any).user?.username || 'User',
          targetName: channel.name
        });
        saveServers();
      }
      io.to('server:' + serverId).emit("channel-created", { serverId, channel });
      io.to('server:' + serverId).emit("server-updated", { serverId, server });
    });

    const hasPermission = (server: any, username: string, permission: string): boolean => {
      if (server.ownerId === username) return true;
      if (username === 't0ai-assistant') return true;
      
      const userRoles = server.memberRoles?.[username] || [];
      const roles = server.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
      return roles.some((r: any) => r.permissions && r.permissions[permission] === true);
    };

    socket.on("update-server", ({ serverId, updates }) => {
      const server = globalServers.find(s => s.id === serverId);
      if (!server) return;
      
      const username = (socket as any).user.username;
      
      // Allow if owner OR has manageRoles (if updating roles) OR editSettings (if updating other things)
      const isOwner = server.ownerId === username;
      const canManageRoles = hasPermission(server, username, 'manageRoles');
      const canEditSettings = hasPermission(server, username, 'editSettings');
      const canManageChannels = hasPermission(server, username, 'manageChannels');

      if (!isOwner && !canManageRoles && !canEditSettings && !canManageChannels) {
        socket.emit("error", { message: "Insufficient permissions to update server" });
        return;
      }

      if (!isOwner && !canEditSettings) {
        const keys = Object.keys(updates);
        if (!canManageChannels && keys.some(k => !['memberRoles', 'roles'].includes(k))) {
            socket.emit("error", { message: "Access denied: You can only manage roles." });
            return;
        }
        if (!canManageRoles && keys.some(k => !['channels', 'categories'].includes(k))) {
            socket.emit("error", { message: "Access denied: You can only manage channels." });
            return;
        }
        if (keys.some(k => !['channels', 'categories', 'memberRoles', 'roles'].includes(k))) {
            socket.emit("error", { message: "Access denied." });
            return;
        }
      }

      
      if (!isOwner && updates.roles) {
        const userRoleIds = server.memberRoles?.[username] || [];
        const userRoles = server.roles?.filter((r: any) => userRoleIds.includes(r.id)) || [];
        const highestUserPosition = userRoles.length > 0 ? Math.min(...userRoles.map((r: any) => r.position)) : Infinity;

        // Check if any role was deleted that is higher or equal to user's highest role
        const oldRoles = server.roles || [];
        const newRoles = updates.roles;
        const newRoleIds = newRoles.map((r: any) => r.id);
        const deletedRoles = oldRoles.filter((r: any) => !newRoleIds.includes(r.id));
        if (deletedRoles.some((r: any) => highestUserPosition >= r.position)) {
           socket.emit("error", { message: "Access denied: Cannot delete roles equal or higher to your own." });
           return;
        }

        // Check if any role was modified that is higher or equal to user's highest role
        const modifiedRoles = newRoles.filter((nr: any) => {
           const old = oldRoles.find((or: any) => or.id === nr.id);
           return old && JSON.stringify(old) !== JSON.stringify(nr);
        });
        if (modifiedRoles.some((nr: any) => {
           const old = oldRoles.find((or: any) => or.id === nr.id);
           return highestUserPosition >= old.position || highestUserPosition >= nr.position;
        })) {
           socket.emit("error", { message: "Access denied: Cannot modify roles equal or higher to your own." });
           return;
        }
      }

      if (!server.auditLog) server.auditLog = [];

      // If client provided explicit audit log entries, merge them
      if (updates.auditLog && Array.isArray(updates.auditLog) && updates.auditLog.length > 0) {
        const existingIds = new Set(server.auditLog.map((e: any) => e.id));
        const newEntries = updates.auditLog.filter((e: any) => !existingIds.has(e.id));
        if (newEntries.length > 0) {
          server.auditLog = [...newEntries, ...server.auditLog].slice(0, 200);
        }
      } else {
        // Automatic change detection to record audits
        if (updates.name && updates.name !== server.name) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: `renamed server to "${updates.name}"` });
        } else if (updates.description !== undefined && updates.description !== server.description) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: 'description updated' });
        } else if (updates.image !== undefined && updates.image !== server.image) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: 'server icon updated' });
        } else if (updates.icon !== undefined && updates.icon !== server.icon) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: 'server icon updated' });
        } else if (updates.banner !== undefined && updates.banner !== server.banner) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: 'server banner updated' });
        } else if (updates.autoModEnabled !== undefined && updates.autoModEnabled !== server.autoModEnabled) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: updates.autoModEnabled ? 'AutoMod enabled' : 'AutoMod disabled' });
        } else if (updates.customBlockedWords !== undefined && JSON.stringify(updates.customBlockedWords) !== JSON.stringify(server.customBlockedWords)) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: 'blocked words updated' });
        } else if (updates.showMemberCount !== undefined && updates.showMemberCount !== server.showMemberCount) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: updates.showMemberCount ? 'Member counter enabled' : 'Member counter disabled' });
        } else if (updates.hasMarketplace !== undefined && updates.hasMarketplace !== server.hasMarketplace) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: updates.hasMarketplace ? 'Server marketplace enabled' : 'Server marketplace disabled' });
        } else if (updates.showMarketplaceInDiscovery !== undefined && updates.showMarketplaceInDiscovery !== server.showMarketplaceInDiscovery) {
          recordServerAudit(server, { action: 'update_server', executorName: username, targetName: updates.showMarketplaceInDiscovery ? 'Marketplace discovery label enabled' : 'Marketplace discovery label disabled' });
        }

        // Channels
        if (updates.channels && Array.isArray(updates.channels)) {
          const oldChannels: any[] = server.channels || [];
          const newChannels: any[] = updates.channels;
          const newIds = new Set(newChannels.map(c => c.id));
          const oldIds = new Set(oldChannels.map(c => c.id));
          
          for (const oc of oldChannels) {
            if (!newIds.has(oc.id)) {
              recordServerAudit(server, { action: 'delete_channel', executorName: username, targetName: oc.name });
            }
          }
          for (const nc of newChannels) {
            if (!oldIds.has(nc.id)) {
              recordServerAudit(server, { action: 'create_channel', executorName: username, targetName: nc.name });
            }
          }
          for (const nc of newChannels) {
            const oc = oldChannels.find(c => c.id === nc.id);
            if (oc && (oc.name !== nc.name || oc.topic !== nc.topic || oc.categoryId !== nc.categoryId || JSON.stringify(oc.permissions) !== JSON.stringify(nc.permissions))) {
              recordServerAudit(server, { action: 'update_channel', executorName: username, targetName: nc.name });
            }
          }
        }

        // Categories
        if (updates.categories && Array.isArray(updates.categories)) {
          const oldCats: any[] = server.categories || [];
          const newCats: any[] = updates.categories;
          const newIds = new Set(newCats.map(c => c.id));
          const oldIds = new Set(oldCats.map(c => c.id));
          
          for (const oc of oldCats) {
            if (!newIds.has(oc.id)) {
              recordServerAudit(server, { action: 'delete_category', executorName: username, targetName: oc.name });
            }
          }
          for (const nc of newCats) {
            if (!oldIds.has(nc.id)) {
              recordServerAudit(server, { action: 'create_category', executorName: username, targetName: nc.name });
            }
          }
          for (const nc of newCats) {
            const oc = oldCats.find(c => c.id === nc.id);
            if (oc && oc.name !== nc.name) {
              recordServerAudit(server, { action: 'update_category', executorName: username, targetName: nc.name });
            }
          }
        }

        // Roles
        if (updates.roles && Array.isArray(updates.roles)) {
          const oldRoles: any[] = server.roles || [];
          const newRoles: any[] = updates.roles;
          const newIds = new Set(newRoles.map(r => r.id));
          const oldIds = new Set(oldRoles.map(r => r.id));
          
          for (const or of oldRoles) {
            if (!newIds.has(or.id)) {
              recordServerAudit(server, { action: 'delete_role', executorName: username, targetName: or.name });
            }
          }
          for (const nr of newRoles) {
            if (!oldIds.has(nr.id)) {
              recordServerAudit(server, { action: 'create_role', executorName: username, targetName: nr.name });
            }
          }
          for (const nr of newRoles) {
            const or = oldRoles.find(r => r.id === nr.id);
            if (or && (or.name !== nr.name || or.color !== nr.color || or.hoist !== nr.hoist || JSON.stringify(or.permissions) !== JSON.stringify(nr.permissions))) {
              recordServerAudit(server, { action: 'update_role', executorName: username, targetName: nr.name });
            }
          }
        }

        // Member Roles
        if (updates.memberRoles && typeof updates.memberRoles === 'object') {
          const oldMR: Record<string, string[]> = server.memberRoles || {};
          const newMR: Record<string, string[]> = updates.memberRoles;
          const allUsers = Array.from(new Set([...Object.keys(oldMR), ...Object.keys(newMR)]));
          for (const u of allUsers) {
            const oldR = [...(oldMR[u] || [])].sort();
            const newR = [...(newMR[u] || [])].sort();
            if (JSON.stringify(oldR) !== JSON.stringify(newR)) {
              recordServerAudit(server, { action: 'update_member_role', executorName: username, targetName: u });
            }
          }
        }

        // Banned Users (Unban)
        if (updates.bannedUsers && Array.isArray(updates.bannedUsers)) {
          const oldBans: any[] = server.bannedUsers || [];
          const newBans: any[] = updates.bannedUsers;
          const newBanIds = new Set(newBans.map(b => b.id));
          for (const ob of oldBans) {
            if (!newBanIds.has(ob.id)) {
              recordServerAudit(server, { action: 'unban', executorName: username, targetName: ob.name || ob.id });
            }
          }
        }

        // Emojis
        if (updates.emojis && Array.isArray(updates.emojis)) {
          const oldEmojis: any[] = server.emojis || [];
          const newEmojis: any[] = updates.emojis;
          const newIds = new Set(newEmojis.map(e => e.id));
          const oldIds = new Set(oldEmojis.map(e => e.id));
          for (const oe of oldEmojis) {
            if (!newIds.has(oe.id)) {
              recordServerAudit(server, { action: 'delete_emoji', executorName: username, targetName: `:${oe.name}:` });
            }
          }
          for (const ne of newEmojis) {
            if (!oldIds.has(ne.id)) {
              recordServerAudit(server, { action: 'create_emoji', executorName: username, targetName: `:${ne.name}:` });
            }
          }
        }
      }

      const { auditLog: _, ...otherUpdates } = updates;
      Object.assign(server, otherUpdates);
      if (updates.auditLog) {
        server.auditLog = updates.auditLog;
      }

      saveServers();
      
      // Broadcast to all members of this server
      io.to('server:' + serverId).emit("server-updated", { serverId, server });
    });

    socket.on("update-status", ({ userName, status, customStatus }) => {
      if (userName !== (socket as any).user.username) return;
      const user = Array.from(globalUsers.values()).find(u => u.name === userName);
      if (user) {
        user.status = status;
        if (customStatus !== undefined) user.customStatus = customStatus;
        user.lastSeen = Date.now();
        user.lastUpdated = Date.now();
        saveUsers();
        io.emit("user-status-changed", { 
          userId: user.id, 
          userName: user.name, 
          status, 
          customStatus: user.customStatus, 
          image: user.image,
          isPremium: user.isPremium,
          preferences: user.preferences
        });
      }
    });

    // WebRTC Signaling
    socket.on("call-user", ({ targetName, callerName, type, serverId, isGroup }) => {
      if (callerName !== (socket as any).user.username) return;
      
      if (isGroup) {
        // Group Call Routing
        const groupChat = globalGroupChats.find(gc => gc.name === targetName || gc.id === targetName);
        if (!groupChat) return;

        // Add caller to active group calls
        if (!globalActiveGroupCalls[groupChat.name]) globalActiveGroupCalls[groupChat.name] = [];
        if (!globalActiveGroupCalls[groupChat.name].includes(callerName)) {
           globalActiveGroupCalls[groupChat.name].push(callerName);
           io.emit("active-group-calls-sync", globalActiveGroupCalls);
        }

        groupChat.members.forEach((m: any) => {
          if (m.name !== callerName) {
            io.to(`user:${m.name}`).emit("incoming-call", { callerName, type, serverId: undefined, isGroup: true, groupName: groupChat.name });
          }
        });

      } else {
        // Regular DM Routing
        // Block check
        const senderBlocks = (globalBlocks[callerName] || []).map(b => b.toLowerCase());
        const receiverBlocks = (globalBlocks[targetName] || []).map(b => b.toLowerCase());
        if (senderBlocks.includes(targetName.toLowerCase()) || receiverBlocks.includes(callerName.toLowerCase())) {
          return;
        }
        
        io.to(`user:${targetName}`).emit("incoming-call", { callerName, type, serverId });
      }
    });

    socket.on("answer-call", ({ targetName, answererName, accepted, isGroup, groupName }) => {
      if (answererName !== (socket as any).user.username) return;

      if (isGroup) {
         const groupChat = globalGroupChats.find(gc => gc.name === groupName || gc.id === groupName);
         if (groupChat) {
           if (accepted) {
             if (!globalActiveGroupCalls[groupChat.name]) globalActiveGroupCalls[groupChat.name] = [];
             if (!globalActiveGroupCalls[groupChat.name].includes(answererName)) {
                globalActiveGroupCalls[groupChat.name].push(answererName);
                io.emit("active-group-calls-sync", globalActiveGroupCalls);
             }
           }
           groupChat.members.forEach((m: any) => {
             if (m.name !== answererName) {
               io.to(`user:${m.name}`).emit("call-answered", { answererName, accepted, isGroup: true, groupName: groupChat.name });
             }
           });
         }
      } else {
         io.to(`user:${targetName}`).emit("call-answered", { answererName, accepted });
         // Notify other devices of the answerer
         socket.emit("call-answered", { answererName, accepted, handledElsewhere: false });
         socket.to(`user:${answererName}`).emit("call-answered", { answererName, accepted, handledElsewhere: true });
      }
    });

    socket.on("camera-state-changed", ({ targetName, senderName, isOn, isServer, serverId, channelId }) => {
      const authUser = (socket as any).user?.username || socketUserMap[socket.id];
      if (senderName !== authUser) return;

      if (isServer) {
        const room = `${serverId}:${channelId}`;
        const usersInRoom = globalVoiceChannelMembers[room] || [];
        const memberIdx = usersInRoom.findIndex((m: any) => m.name === senderName);
        if (memberIdx !== -1) {
          usersInRoom[memberIdx].isCameraOn = isOn;
          io.to(room).emit("user-camera-state-changed", { userName: senderName, isOn, serverId, channelId });
        }
      } else {
        io.to(`user:${targetName}`).emit("camera-state-changed", { senderName, isOn });
        // Notify other devices of the sender
        io.to(`user:${senderName}`).emit("camera-state-changed", { senderName, isOn });
      }
    });

    socket.on("screen-share-state-changed", ({ targetName, senderName, isOn, isServer, serverId, channelId }) => {
      const authUser = (socket as any).user?.username || socketUserMap[socket.id];
      if (senderName !== authUser) return;

      if (isServer) {
        const room = `${serverId}:${channelId}`;
        const usersInRoom = globalVoiceChannelMembers[room] || [];
        const memberIdx = usersInRoom.findIndex((m: any) => m.name === senderName);
        if (memberIdx !== -1) {
          usersInRoom[memberIdx].isScreenSharing = isOn;
          io.to(room).emit("user-screen-share-state-changed", { userName: senderName, isOn, serverId, channelId });
        }
      } else {
        io.to(`user:${targetName}`).emit("screen-share-state-changed", { senderName, isOn });
        // Notify other devices of the sender
        io.to(`user:${senderName}`).emit("screen-share-state-changed", { senderName, isOn });
      }
    });

    socket.on("ice-candidate", ({ targetName, candidate, senderName }) => {
      if (senderName !== (socket as any).user.username) return;
      io.to(`user:${targetName}`).emit("ice-candidate", { candidate, senderName });
    });

    socket.on("sdp-offer", ({ targetName, offer, senderName }) => {
      if (senderName !== (socket as any).user.username) return;
      io.to(`user:${targetName}`).emit("sdp-offer", { offer, senderName });
    });

    socket.on("sdp-answer", ({ targetName, answer, senderName }) => {
      if (senderName !== (socket as any).user.username) return;
      io.to(`user:${targetName}`).emit("sdp-answer", { answer, senderName });
    });

    socket.on("end-call", ({ targetName, senderName, isGroup, groupName }) => {
      if (senderName !== (socket as any).user.username) return;
      
      if (isGroup) {
         const groupChat = globalGroupChats.find(gc => gc.name === groupName || gc.id === groupName);
         if (groupChat) {
           if (globalActiveGroupCalls[groupChat.name]) {
             globalActiveGroupCalls[groupChat.name] = globalActiveGroupCalls[groupChat.name].filter(n => n !== senderName);
             if (globalActiveGroupCalls[groupChat.name].length === 0) {
               delete globalActiveGroupCalls[groupChat.name];
             }
             io.emit("active-group-calls-sync", globalActiveGroupCalls);
           }
           groupChat.members.forEach((m: any) => {
             if (m.name !== senderName) {
               io.to(`user:${m.name}`).emit("call-ended", { senderName, isGroup: true, groupName: groupChat.name });
               io.to(`user:${m.name}`).emit("user-speaking", { userName: senderName, isSpeaking: false });
             }
           });
         }
      } else {
         io.to(`user:${targetName}`).emit("call-ended", { senderName });
         io.to(`user:${targetName}`).emit("user-speaking", { userName: senderName, isSpeaking: false });
         // Also notify other devices of the sender
         io.to(`user:${senderName}`).emit("call-ended", { targetName, senderName });
         io.to(`user:${senderName}`).emit("user-speaking", { userName: targetName, isSpeaking: false });
      }
    });

    socket.on("typing", ({ targetName, senderName, isTyping }) => {
      if (senderName !== (socket as any).user?.username) return;
      
      // Block check
      const senderBlocks = (globalBlocks[senderName] || []).map(b => b.toLowerCase());
      const receiverBlocks = (globalBlocks[targetName] || []).map(b => b.toLowerCase());
      if (senderBlocks.includes(targetName.toLowerCase()) || receiverBlocks.includes(senderName.toLowerCase())) {
        return;
      }

      io.to(`user:${targetName}`).emit("user-typing", { senderName, isTyping });
    });

    socket.on("server-typing", ({ serverId, channelId, senderName, isTyping }) => {
      if (senderName !== (socket as any).user?.username) return;
      const room = `${serverId}:${channelId}`;
      socket.to(room).emit("server-user-typing", { serverId, channelId, senderName, isTyping });
      socket.to(`server:${serverId}`).emit("server-user-typing", { serverId, channelId, senderName, isTyping });
    });

    socket.on("disconnect", () => {
      const userName = socketUserMap[socket.id];
      if (userName) {
        if (userSocketMap[userName]) {
          userSocketMap[userName] = userSocketMap[userName].filter(id => id !== socket.id);
          if (userSocketMap[userName].length === 0) {
            delete userSocketMap[userName];
          }
        }
        delete socketUserMap[socket.id];
        delete globalSessions[socket.id];
        delete globalSocketCalls[socket.id];
        broadcastUserCallStatus(userName);
        
        // Mark user as offline in globalUsers if no more sockets
        if (!userSocketMap[userName]) {
          const user = Array.from(globalUsers.values()).find(u => u.name === userName);
          if (user && user.status !== 'offline') {
            user.status = 'offline';
            user.lastUpdated = Date.now();
            saveUsers();
            io.emit("user-status-changed", { userId: user.id, userName: user.name, status: 'offline', image: user.image });
          }
        }

        // Remove user from all voice channels
        Object.keys(globalVoiceChannelMembers).forEach(room => {
          if (globalVoiceChannelMembers[room].some((m: any) => (m.name || '').toLowerCase() === (userName || '').toLowerCase())) {
            globalVoiceChannelMembers[room] = globalVoiceChannelMembers[room].filter((m: any) => (m.name || '').toLowerCase() !== (userName || '').toLowerCase());
            const [serverId, channelId] = room.split(':');
            io.to(room).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[room] });
            io.to('server:' + serverId).emit("voice-channel-members-updated", { serverId, channelId, members: globalVoiceChannelMembers[room] });
            
            // Optimization: explicitly notify each other member in the room about the leave
            io.to(room).emit("user-left-voice", { userId: userName, userName: userName });
            io.to(room).emit("user-speaking", { userName, isSpeaking: false, serverId, channelId });
            io.to('server:' + serverId).emit("user-speaking", { userName, isSpeaking: false, serverId, channelId });
          }
        });

        // Remove user from active group calls
        let groupCallsChanged = false;
        Object.keys(globalActiveGroupCalls).forEach(groupName => {
          if (globalActiveGroupCalls[groupName].some(name => (name || '').toLowerCase() === (userName || '').toLowerCase())) {
            globalActiveGroupCalls[groupName] = globalActiveGroupCalls[groupName].filter(name => (name || '').toLowerCase() !== (userName || '').toLowerCase());
            groupCallsChanged = true;
          }
        });
        if (groupCallsChanged) {
          io.emit("active-group-calls-sync", globalActiveGroupCalls);
        }
      }
    });
  });

  // 404 handler for API routes
  app.all("/api/*", (req, res) => {
    console.warn(`API Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware for development
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(_dirname, 'index.html')) 
      ? _dirname 
      : (fs.existsSync(path.join(_dirname, 'dist')) ? path.join(_dirname, 'dist') : path.join(process.cwd(), 'dist'));
    console.log(`Serving static files from: ${distPath}`);
    if (!fs.existsSync(distPath)) {
      console.error(`ERROR: dist directory not found at ${distPath}`);
    } else {
      console.log(`dist directory contents: ${fs.readdirSync(distPath).join(', ')}`);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`ERROR: index.html not found at ${indexPath}`);
        res.status(404).send('Application build not found. Please ensure "npm run build" has completed.');
      }
    });
  }

  const server = httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  // Increase timeouts for large file uploads
  server.timeout = 600000; // 10 minutes
  server.keepAliveTimeout = 600000;
  server.headersTimeout = 605000;
}

process.on('uncaughtException', (err: any) => {
  if (err.code === 'EPIPE') {
    return;
  }
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
