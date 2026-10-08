import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { CONFIG } from "./config";
import { ConversationTurn } from "./types";
import { clip } from "./text";

/**
 * Memoria conversacional por sesión usando el SQLite nativo de Node (node:sqlite,
 * estable desde Node 22.5+; correr con --experimental-sqlite en versiones previas).
 * Cada POST al orquestador era stateless: ARIA no recordaba turnos anteriores.
 * Ahora persistimos cada turno y reinyectamos los últimos N al prompt del planner
 * y de cada especialista, dándole continuidad real a la conversación.
 *
 * No usamos un pool: en Next dev el módulo se reusa entre requests, así que
 * mantenemos una única conexión lazy a nivel de módulo.
 */

const DB_PATH = path.join(process.cwd(), ".office-ai", "memory.sqlite");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;

  // Aseguramos el directorio padre para no romper en cold start.
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_turns_session
      ON conversation_turns (session_id, id);
  `);
  return db;
}

export function appendTurn(sessionId: string, role: ConversationTurn["role"], content: string) {
  if (!sessionId || !content.trim()) return;
  try {
    const database = getDb();
    const stmt = database.prepare(
      "INSERT INTO conversation_turns (session_id, role, content, created_at) VALUES (?, ?, ?, ?)"
    );
    stmt.run(sessionId, role, clip(content.replace(/\s+/g, " ").trim(), 1200), new Date().toISOString());
  } catch (error) {
    console.error("No pude guardar el turno en memoria:", error);
  }
}

export function getRecentTurns(sessionId: string, limit = CONFIG.historyTurns): ConversationTurn[] {
  if (!sessionId) return [];
  try {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT role, content, created_at FROM conversation_turns WHERE session_id = ? ORDER BY id DESC LIMIT ?"
    );
    const rows = stmt.all(sessionId, limit) as Array<{ role: string; content: string; created_at: string }>;
    return rows
      .reverse()
      .map((row) => ({ role: row.role as ConversationTurn["role"], content: row.content, createdAt: row.created_at }));
  } catch (error) {
    console.error("No pude leer la memoria de sesión:", error);
    return [];
  }
}

/**
 * Renderiza el historial reciente como bloque de contexto para inyectar al prompt.
 * Vacío si no hay turnos previos, para no ensuciar la primera interacción.
 */
export function buildHistoryContext(sessionId: string, limit = CONFIG.historyTurns) {
  const turns = getRecentTurns(sessionId, limit);
  if (turns.length === 0) return "";
  const rendered = turns
    .map((turn) => `${turn.role === "user" ? "Usuario" : "ARIA"}: ${turn.content}`)
    .join("\n");
  return `Historial reciente de la conversación:\n${rendered}`;
}
