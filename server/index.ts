import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";

type Winner = "white" | "black" | null;
type MatchBody = {
  mode: string;
  ai_level: number | null;
  winner: Winner;
  reason: string;
  plies: number;
  moves: string[];
  start_fen: string;
  final_fen: string;
  duration_s: number;
};

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const publicDir = join(process.cwd(), "dist");
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(join(dataDir, "anarch-chess.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    ai_level INTEGER,
    winner TEXT CHECK (winner IN ('white', 'black') OR winner IS NULL),
    reason TEXT NOT NULL,
    plies INTEGER NOT NULL,
    moves_json TEXT NOT NULL,
    start_fen TEXT NOT NULL,
    final_fen TEXT NOT NULL,
    duration_s INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS matches_created_at_idx ON matches(created_at DESC);
`);

function json(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
      if (raw.length > 1_000_000) reject(new Error("request body too large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function isMatchBody(value: unknown): value is MatchBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<MatchBody>;
  return typeof body.mode === "string" &&
    (body.ai_level === null || typeof body.ai_level === "number") &&
    (body.winner === null || body.winner === "white" || body.winner === "black") &&
    typeof body.reason === "string" &&
    Number.isInteger(body.plies) && body.plies !== undefined && body.plies >= 0 &&
    Array.isArray(body.moves) && body.moves.every((move) => typeof move === "string") &&
    typeof body.start_fen === "string" &&
    typeof body.final_fen === "string" &&
    Number.isInteger(body.duration_s) && body.duration_s !== undefined && body.duration_s >= 0;
}

function toMatch(row: Record<string, unknown>) {
  return {
    id: row.id,
    mode: row.mode,
    ai_level: row.ai_level,
    winner: row.winner,
    reason: row.reason,
    plies: row.plies,
    moves: JSON.parse(String(row.moves_json)),
    start_fen: row.start_fen,
    final_fen: row.final_fen,
    duration_s: row.duration_s,
    created_at: row.created_at,
  };
}

function serveStatic(pathname: string, res: ServerResponse): void {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(publicDir, requested));
  const isInsidePublicDir = file === publicDir || file.startsWith(`${publicDir}\\`);
  const target = isInsidePublicDir && existsSync(file) ? file : join(publicDir, "index.html");
  if (!existsSync(target)) {
    json(res, 404, { detail: "frontend build not found; run npm run build" });
    return;
  }
  const contentTypes: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };
  res.writeHead(200, { "Content-Type": contentTypes[extname(target)] ?? "application/octet-stream" });
  res.end(readFileSync(target));
}

function matches(limit: number) {
  const rows = db.prepare("SELECT * FROM matches ORDER BY created_at DESC LIMIT ?").all(limit) as Record<string, unknown>[];
  return rows.map(toMatch);
}

function stats() {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN winner = 'white' THEN 1 ELSE 0 END) AS white_wins,
      SUM(CASE WHEN winner = 'black' THEN 1 ELSE 0 END) AS black_wins,
      SUM(CASE WHEN winner IS NULL THEN 1 ELSE 0 END) AS draws,
      SUM(CASE WHEN mode IN ('ai_white', 'ai_black') AND winner =
        CASE WHEN mode = 'ai_white' THEN 'white' ELSE 'black' END THEN 1 ELSE 0 END) AS vs_ai_wins,
      SUM(CASE WHEN mode IN ('ai_white', 'ai_black') AND winner IS NOT NULL AND winner !=
        CASE WHEN mode = 'ai_white' THEN 'white' ELSE 'black' END THEN 1 ELSE 0 END) AS vs_ai_losses,
      SUM(CASE WHEN mode IN ('ai_white', 'ai_black') AND winner IS NULL THEN 1 ELSE 0 END) AS vs_ai_draws,
      COALESCE(ROUND(AVG(plies), 1), 0) AS avg_plies
    FROM matches
  `).get() as Record<string, number>;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value ?? 0)]));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (!url.pathname.startsWith("/api/")) {
      if (req.method === "GET") serveStatic(url.pathname, res);
      else json(res, 404, { detail: "not found" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/matches") {
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
      json(res, 200, matches(Number.isFinite(limit) ? limit : 20));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/stats") {
      json(res, 200, stats());
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/matches/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/matches/".length));
      const row = db.prepare("SELECT * FROM matches WHERE id = ?").get(id) as Record<string, unknown> | undefined;
      if (!row) {
        json(res, 404, { detail: "match not found" });
        return;
      }
      json(res, 200, toMatch(row));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/matches") {
      const body = await readBody(req);
      if (!isMatchBody(body)) {
        json(res, 422, { detail: "invalid match payload" });
        return;
      }
      const match = body;
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO matches
          (id, mode, ai_level, winner, reason, plies, moves_json, start_fen, final_fen, duration_s, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, match.mode, match.ai_level, match.winner, match.reason, match.plies,
        JSON.stringify(match.moves), match.start_fen, match.final_fen, match.duration_s, createdAt);
      json(res, 201, { ...match, id, created_at: createdAt });
      return;
    }
    json(res, 404, { detail: "not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal server error";
    json(res, message === "request body must be valid JSON" ? 422 : 500, { detail: message });
  }
});

server.listen(port, host, () => {
  console.log(`Anarch Chess listening on http://${host}:${port}`);
});
