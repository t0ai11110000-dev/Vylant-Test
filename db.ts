import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'vylant.db');
let db: any;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    email TEXT,
    password TEXT,
    displayName TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'offline',
    customStatus TEXT,
    banner TEXT,
    about TEXT,
    lastSeen INTEGER,
    lastUpdated INTEGER,
    preferences TEXT,
    security TEXT,
    stories TEXT,
    isVerified INTEGER DEFAULT 0,
    isPremium INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT,
    ownerId TEXT,
    icon TEXT,
    banner TEXT,
    description TEXT,
    categories TEXT,
    channels TEXT,
    roles TEXT,
    auditLog TEXT,
    bannedUsers TEXT,
    customAssets TEXT,
    createdAt INTEGER,
    isPublic INTEGER DEFAULT 0,
    is18Plus INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    showMemberCount INTEGER DEFAULT 0,
    hasMarketplace INTEGER DEFAULT 0,
    showMarketplaceInDiscovery INTEGER DEFAULT 0,
    marketplaceSettings TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    serverId TEXT,
    channelId TEXT,
    sender TEXT,
    text TEXT,
    timestamp INTEGER,
    imageUrl TEXT,
    audioUrl TEXT,
    videoUrl TEXT,
    fileUrl TEXT,
    type TEXT,
    reactions TEXT,
    isEdited INTEGER DEFAULT 0,
    editedAt INTEGER,
    otherPerson TEXT,
    isVanish INTEGER DEFAULT 0,
    expiresAt INTEGER,
    replyTo TEXT,
    isStarred INTEGER DEFAULT 0,
    starredBy TEXT,
    isForwarded INTEGER DEFAULT 0,
    forwardedFrom TEXT
  );

  CREATE TABLE IF NOT EXISTS groupChats (
    id TEXT PRIMARY KEY,
    name TEXT,
    creator TEXT,
    members TEXT,
    avatar TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS friends (
    userName TEXT,
    friendName TEXT,
    status TEXT, -- 'friends', 'pending_in', 'pending_out'
    PRIMARY KEY (userName, friendName)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    userName TEXT,
    blockedName TEXT,
    PRIMARY KEY (userName, blockedName)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userName TEXT,
    ip TEXT,
    userAgent TEXT,
    location TEXT,
    lastActive INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS bugReports (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    category TEXT,
    userName TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    name TEXT,
    creator TEXT,
    config TEXT,
    isPublic INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS server_events (
    id TEXT PRIMARY KEY,
    serverId TEXT,
    creator TEXT,
    name TEXT,
    description TEXT,
    location TEXT,
    startTime TEXT,
    endTime TEXT,
    interested TEXT DEFAULT '[]',
    bannerUrl TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    targetType TEXT NOT NULL,
    targetId TEXT NOT NULL,
    channelId TEXT,
    message TEXT NOT NULL,
    scheduledFor INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS server_invites (
    code TEXT PRIMARY KEY,
    serverId TEXT NOT NULL,
    creator TEXT,
    expiresAt INTEGER,
    maxUses INTEGER,
    uses INTEGER DEFAULT 0,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    ownerName TEXT,
    name TEXT NOT NULL,
    tag TEXT,
    token TEXT UNIQUE NOT NULL,
    avatar TEXT,
    banner TEXT,
    about TEXT,
    customStatus TEXT,
    prefix TEXT DEFAULT '!',
    isPublic INTEGER DEFAULT 0,
    isAiPowered INTEGER DEFAULT 0,
    systemPrompt TEXT,
    commands TEXT,
    autoResponses TEXT,
    welcomeMessage TEXT,
    installedServers TEXT DEFAULT '[]',
    createdAt INTEGER,
    stats TEXT
  );

  CREATE TABLE IF NOT EXISTS server_marketplace_items (
    id TEXT PRIMARY KEY,
    serverId TEXT NOT NULL,
    sellerId TEXT NOT NULL,
    sellerName TEXT NOT NULL,
    sellerAvatar TEXT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    category TEXT DEFAULT 'general',
    imageUrl TEXT,
    stock INTEGER DEFAULT -1,
    contactInfo TEXT,
    tags TEXT DEFAULT '[]',
    interestedUsers TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS server_marketplace_orders (
    id TEXT PRIMARY KEY,
    serverId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    itemTitle TEXT NOT NULL,
    buyerId TEXT NOT NULL,
    buyerName TEXT NOT NULL,
    sellerName TEXT NOT NULL,
    price REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    note TEXT,
    status TEXT DEFAULT 'completed',
    createdAt INTEGER
  );
`;

const runMigrations = (database: any) => {
  const migrations = [
    "ALTER TABLE messages ADD COLUMN replyTo TEXT;",
    "ALTER TABLE server_events ADD COLUMN bannerUrl TEXT;",
    "ALTER TABLE messages ADD COLUMN isStarred INTEGER DEFAULT 0;",
    "ALTER TABLE messages ADD COLUMN starredBy TEXT;",
    "ALTER TABLE users ADD COLUMN email TEXT;",
    "ALTER TABLE users ADD COLUMN age INTEGER;",
    "ALTER TABLE users ADD COLUMN birthDate TEXT;",
    "ALTER TABLE servers ADD COLUMN isPublic INTEGER DEFAULT 0;",
    "ALTER TABLE servers ADD COLUMN is18Plus INTEGER DEFAULT 0;",
    "ALTER TABLE servers ADD COLUMN verified INTEGER DEFAULT 0;",
    "ALTER TABLE messages ADD COLUMN videoUrl TEXT;",
    "ALTER TABLE users ADD COLUMN isPremium INTEGER DEFAULT 0;",
    "ALTER TABLE messages ADD COLUMN isForwarded INTEGER DEFAULT 0;",
    "ALTER TABLE messages ADD COLUMN forwardedFrom TEXT;",
    "CREATE TABLE IF NOT EXISTS scheduled_messages (id TEXT PRIMARY KEY, sender TEXT NOT NULL, targetType TEXT NOT NULL, targetId TEXT NOT NULL, channelId TEXT, message TEXT NOT NULL, scheduledFor INTEGER NOT NULL, createdAt INTEGER NOT NULL, status TEXT DEFAULT 'pending');",
    "CREATE TABLE IF NOT EXISTS server_invites (code TEXT PRIMARY KEY, serverId TEXT NOT NULL, creator TEXT, expiresAt INTEGER, maxUses INTEGER, uses INTEGER DEFAULT 0, createdAt INTEGER);",
    "CREATE TABLE IF NOT EXISTS bots (id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, ownerName TEXT, name TEXT NOT NULL, tag TEXT, token TEXT UNIQUE NOT NULL, avatar TEXT, banner TEXT, about TEXT, customStatus TEXT, prefix TEXT DEFAULT '!', isPublic INTEGER DEFAULT 0, isAiPowered INTEGER DEFAULT 0, systemPrompt TEXT, commands TEXT, autoResponses TEXT, welcomeMessage TEXT, installedServers TEXT DEFAULT '[]', createdAt INTEGER, stats TEXT);",
    "ALTER TABLE servers ADD COLUMN showMemberCount INTEGER DEFAULT 0;",
    "ALTER TABLE servers ADD COLUMN hasMarketplace INTEGER DEFAULT 0;",
    "ALTER TABLE servers ADD COLUMN showMarketplaceInDiscovery INTEGER DEFAULT 0;",
    "ALTER TABLE servers ADD COLUMN marketplaceSettings TEXT;",
    "CREATE TABLE IF NOT EXISTS server_marketplace_items (id TEXT PRIMARY KEY, serverId TEXT NOT NULL, sellerId TEXT NOT NULL, sellerName TEXT NOT NULL, sellerAvatar TEXT, title TEXT NOT NULL, description TEXT, price REAL DEFAULT 0, currency TEXT DEFAULT 'USD', category TEXT DEFAULT 'general', imageUrl TEXT, stock INTEGER DEFAULT -1, contactInfo TEXT, tags TEXT DEFAULT '[]', status TEXT DEFAULT 'active', createdAt INTEGER);",
    "CREATE TABLE IF NOT EXISTS server_marketplace_orders (id TEXT PRIMARY KEY, serverId TEXT NOT NULL, itemId TEXT NOT NULL, itemTitle TEXT NOT NULL, buyerId TEXT NOT NULL, buyerName TEXT NOT NULL, sellerName TEXT NOT NULL, price REAL DEFAULT 0, currency TEXT DEFAULT 'USD', note TEXT, status TEXT DEFAULT 'completed', createdAt INTEGER);",
    "ALTER TABLE server_marketplace_items ADD COLUMN interestedUsers TEXT DEFAULT '[]';",
    "ALTER TABLE servers ADD COLUMN showEvents INTEGER DEFAULT 0;"
  ];

  for (const m of migrations) {
    try {
      database.exec(m);
    } catch (e) {
      // Ignore if column already exists
    }
  }
};

const initialize = () => {
  try {
    const newDb = new Database(dbPath);
    newDb.exec(SCHEMA);
    runMigrations(newDb);
    return newDb;
  } catch (e) {
    console.error("Database initialization failed. Recreating database...", e);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const newDb = new Database(dbPath);
    newDb.exec(SCHEMA);
    runMigrations(newDb);
    return newDb;
  }
};

db = initialize();

export default db;
