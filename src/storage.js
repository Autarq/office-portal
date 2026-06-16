import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { extensionForName, typeForExtension } from "./file-types.js";

export class FileStore {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.filesDir = path.join(rootDir, "files");
    this.indexPath = path.join(rootDir, "index.json");
  }

  async init() {
    await fs.mkdir(this.filesDir, { recursive: true });
    try {
      await fs.access(this.indexPath);
    } catch {
      await this.writeIndex([]);
    }
  }

  async list() {
    const index = await this.readIndex();
    return index.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async get(id) {
    const file = (await this.readIndex()).find((item) => item.id === id);
    if (!file) {
      return null;
    }
    return file;
  }

  async createFromBuffer(name, buffer) {
    const safeName = sanitizeFileName(name);
    const ext = extensionForName(safeName);
    const type = typeForExtension(ext);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record = {
      id,
      name: safeName,
      ext,
      mime: type.mime,
      documentType: type.documentType,
      size: buffer.length,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    await fs.mkdir(this.recordDir(id), { recursive: true });
    await fs.writeFile(this.recordPath(record), buffer);
    const index = await this.readIndex();
    index.push(record);
    await this.writeIndex(index);
    return record;
  }

  async updateContent(id, buffer) {
    const index = await this.readIndex();
    const record = index.find((item) => item.id === id);
    if (!record) {
      throw new Error(`File not found: ${id}`);
    }
    record.size = buffer.length;
    record.version += 1;
    record.updatedAt = new Date().toISOString();
    await fs.writeFile(this.recordPath(record), buffer);
    await this.writeIndex(index);
    return record;
  }

  async delete(id) {
    const index = await this.readIndex();
    const nextIndex = index.filter((item) => item.id !== id);
    if (nextIndex.length === index.length) {
      return false;
    }
    await fs.rm(this.recordDir(id), { recursive: true, force: true });
    await this.writeIndex(nextIndex);
    return true;
  }

  async readContent(record) {
    return fs.readFile(this.recordPath(record));
  }

  recordPath(record) {
    return path.join(this.recordDir(record.id), record.name);
  }

  recordDir(id) {
    return path.join(this.filesDir, id);
  }

  async readIndex() {
    const raw = await fs.readFile(this.indexPath, "utf8");
    return JSON.parse(raw);
  }

  async writeIndex(index) {
    await fs.mkdir(this.rootDir, { recursive: true });
    const tmpPath = `${this.indexPath}.${process.pid}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(index, null, 2)}\n`);
    await fs.rename(tmpPath, this.indexPath);
  }
}

export function sanitizeFileName(name) {
  const cleaned = String(name || "Untitled")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Untitled";
}
