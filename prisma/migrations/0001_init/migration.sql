-- Initial core schema
CREATE TABLE "Hotel" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT,
    "hotelId" TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "User_hotelId_idx" ON "User"("hotelId");

CREATE TABLE "Staff" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "hotelId" TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
    "position" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Staff_hotelId_idx" ON "Staff"("hotelId");

CREATE TABLE "Role" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserRole" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "roleId" TEXT NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
    "hotelId" TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "roleId", "hotelId")
);
CREATE INDEX "UserRole_hotelId_idx" ON "UserRole"("hotelId");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

CREATE TABLE "Session" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "hotelId" TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL DEFAULT 'REFRESH',
    "token" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("type", "token")
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_hotelId_idx" ON "Session"("hotelId");
CREATE INDEX "Session_type_idx" ON "Session"("type");

CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "hotelId" TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_hotelId_idx" ON "AuditLog"("hotelId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
