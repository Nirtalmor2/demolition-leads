// סינגלטון של Prisma Client — מתחבר ל-Neon דרך ה-serverless driver (HTTPS/WebSocket, פורט 443).
// הסיבה: הרשת התאגידית חוסמת לסירוגין את פורט 5432, אבל 443 תמיד פתוח.
// poolQueryViaFetch=true מנתב שאילתות מעל HTTPS (fetch) — ידידותי ל-proxy תאגידי.
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    console.error("DATABASE_URL not found in process.env");
    console.error("Available vars:", Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES")));
    throw new Error(
      "Missing DATABASE_URL. Set the same connection string locally and in Vercel."
    );
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
