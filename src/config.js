import crypto from "node:crypto";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";

export function loadConfig() {
  const jwtSecret = process.env.JWT_SECRET || "";
  if (isProduction && !jwtSecret) {
    throw new Error("JWT_SECRET is required in production");
  }

  return {
    port: Number(process.env.PORT || 3000),
    publicBaseUrl: trimTrailingSlash(process.env.PUBLIC_BASE_URL || "http://localhost:3000"),
    documentServerUrl: trimTrailingSlash(process.env.DOCUMENT_SERVER_URL || "https://eurooffice.autarq.now"),
    storageDir: path.resolve(process.env.STORAGE_DIR || ".data"),
    jwtSecret: jwtSecret || "dev-insecure-secret",
    basicAuthUser: process.env.BASIC_AUTH_USER || "",
    basicAuthPassword: process.env.BASIC_AUTH_PASSWORD || "",
    instanceId: process.env.INSTANCE_ID || crypto.randomUUID()
  };
}

export function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
