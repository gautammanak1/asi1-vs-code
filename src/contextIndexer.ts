import * as vscode from "vscode";

export interface ProjectContext {
  framework: string | null;
  language: string;
  packageManager: string | null;
  testFramework: string | null;
  linter: string | null;
  formatter: string | null;
  database: string | null;
  orm: string | null;
  cssFramework: string | null;
  uiLibrary: string | null;
  deployment: string | null;
  monorepo: boolean;
  summary: string;
}

export interface SymbolInfo {
  name: string;
  kind: "class" | "function" | "interface" | "type" | "component" | "route" | "model" | "export";
  file: string;
  line?: number;
}

let cachedContext: ProjectContext | null = null;
let cachedSymbols: SymbolInfo[] = [];
let lastIndexTime = 0;
const CACHE_TTL_MS = 60_000;

export async function getProjectContext(): Promise<ProjectContext> {
  if (cachedContext && Date.now() - lastIndexTime < CACHE_TTL_MS) {
    return cachedContext;
  }
  cachedContext = await detectProjectContext();
  lastIndexTime = Date.now();
  return cachedContext;
}

export function getProjectContextSummary(): string {
  return cachedContext?.summary ?? "Project not yet indexed.";
}

export function getCachedSymbols(): readonly SymbolInfo[] {
  return cachedSymbols;
}

export function invalidateCache(): void {
  cachedContext = null;
  cachedSymbols = [];
  lastIndexTime = 0;
}

async function detectProjectContext(): Promise<ProjectContext> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!root) {
    return emptyContext("No workspace open");
  }

  const fileExists = async (rel: string): Promise<boolean> => {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(root, rel));
      return true;
    } catch {
      return false;
    }
  };

  const readJson = async (rel: string): Promise<Record<string, unknown> | null> => {
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, rel));
      return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const pkg = await readJson("package.json");
  const allDeps = {
    ...(pkg?.dependencies as Record<string, string> ?? {}),
    ...(pkg?.devDependencies as Record<string, string> ?? {}),
  };
  const hasDep = (name: string) => name in allDeps;

  const [
    hasRequirements, hasPipfile, hasSetupPy, hasCargoToml,
    hasGoMod, hasPom, hasBuildGradle, hasGemfile,
    hasComposerJson, hasNextConfig, hasNuxtConfig,
    hasTsConfig, hasYarnLock, hasPnpmLock, hasBunLock,
    hasPrisma, hasDrizzle, hasTailwindConfig,
    hasWorkspaces, hasLernaJson,
  ] = await Promise.all([
    fileExists("requirements.txt"),
    fileExists("Pipfile"),
    fileExists("setup.py"),
    fileExists("Cargo.toml"),
    fileExists("go.mod"),
    fileExists("pom.xml"),
    fileExists("build.gradle"),
    fileExists("Gemfile"),
    fileExists("composer.json"),
    fileExists("next.config.js").then(a => a || fileExists("next.config.mjs")).then(a => a || fileExists("next.config.ts")),
    fileExists("nuxt.config.ts").then(a => a || fileExists("nuxt.config.js")),
    fileExists("tsconfig.json"),
    fileExists("yarn.lock"),
    fileExists("pnpm-lock.yaml"),
    fileExists("bun.lockb"),
    fileExists("prisma/schema.prisma"),
    fileExists("drizzle.config.ts").then(a => a || fileExists("drizzle.config.js")),
    fileExists("tailwind.config.js").then(a => a || fileExists("tailwind.config.ts")),
    Promise.resolve(pkg?.workspaces !== undefined),
    fileExists("lerna.json"),
  ]);

  const language = hasCargoToml ? "Rust" : hasGoMod ? "Go" : hasPom || hasBuildGradle ? "Java" :
    hasGemfile ? "Ruby" : hasComposerJson ? "PHP" :
    hasRequirements || hasPipfile || hasSetupPy ? "Python" :
    hasTsConfig ? "TypeScript" : pkg ? "JavaScript" : "Unknown";

  const pyFramework = hasRequirements || hasPipfile ? await detectPythonFramework(root) : null;
  const framework = hasNextConfig ? "Next.js" :
    hasNuxtConfig ? "Nuxt" :
    hasDep("@angular/core") ? "Angular" :
    hasDep("vue") ? "Vue" :
    hasDep("svelte") ? "Svelte" :
    hasDep("react") ? "React" :
    hasDep("express") ? "Express" :
    hasDep("fastify") ? "Fastify" :
    hasDep("@nestjs/core") ? "NestJS" :
    hasDep("hono") ? "Hono" :
    pyFramework ? pyFramework :
    hasCargoToml ? "Rust" :
    hasGoMod ? "Go" :
    null;

  const packageManager = hasPnpmLock ? "pnpm" : hasYarnLock ? "yarn" : hasBunLock ? "bun" : pkg ? "npm" : null;

  const testFramework = hasDep("vitest") ? "Vitest" :
    hasDep("jest") ? "Jest" :
    hasDep("mocha") ? "Mocha" :
    hasDep("@playwright/test") ? "Playwright" :
    hasDep("cypress") ? "Cypress" :
    hasRequirements ? "pytest" : null;

  const linter = hasDep("eslint") ? "ESLint" :
    hasDep("@biomejs/biome") ? "Biome" :
    hasDep("tslint") ? "TSLint" : null;

  const formatter = hasDep("prettier") ? "Prettier" :
    hasDep("@biomejs/biome") ? "Biome" : null;

  const database = hasDep("pg") || hasDep("postgres") ? "PostgreSQL" :
    hasDep("mysql2") || hasDep("mysql") ? "MySQL" :
    hasDep("better-sqlite3") || hasDep("sqlite3") ? "SQLite" :
    hasDep("mongodb") || hasDep("mongoose") ? "MongoDB" :
    hasDep("redis") || hasDep("ioredis") ? "Redis" : null;

  const orm = hasPrisma ? "Prisma" :
    hasDrizzle || hasDep("drizzle-orm") ? "Drizzle" :
    hasDep("typeorm") ? "TypeORM" :
    hasDep("sequelize") ? "Sequelize" :
    hasDep("mongoose") ? "Mongoose" :
    hasDep("knex") ? "Knex" : null;

  const cssFramework = hasTailwindConfig || hasDep("tailwindcss") ? "Tailwind CSS" :
    hasDep("styled-components") ? "styled-components" :
    hasDep("@emotion/react") ? "Emotion" :
    hasDep("sass") ? "Sass" : null;

  const uiLibrary = hasDep("@shadcn/ui") || hasDep("class-variance-authority") ? "shadcn/ui" :
    hasDep("@chakra-ui/react") ? "Chakra UI" :
    hasDep("@mui/material") ? "Material UI" :
    hasDep("antd") ? "Ant Design" :
    hasDep("@radix-ui/react-dialog") ? "Radix UI" : null;

  const deployment = hasDep("vercel") || await fileExists("vercel.json") ? "Vercel" :
    await fileExists("Dockerfile") ? "Docker" :
    await fileExists("fly.toml") ? "Fly.io" :
    await fileExists("railway.json") ? "Railway" :
    await fileExists("render.yaml") ? "Render" : null;

  const monorepo = hasWorkspaces || hasLernaJson;

  const parts: string[] = [];
  if (language !== "Unknown") parts.push(language);
  if (framework) parts.push(framework);
  if (cssFramework) parts.push(cssFramework);
  if (uiLibrary) parts.push(uiLibrary);
  if (orm) parts.push(orm);
  if (database) parts.push(database);
  if (testFramework) parts.push(testFramework);
  if (packageManager) parts.push(packageManager);
  if (deployment) parts.push(deployment);
  if (monorepo) parts.push("monorepo");

  const summary = parts.length
    ? `Stack: ${parts.join(" · ")}`
    : "Could not detect project stack.";

  return {
    framework, language, packageManager, testFramework,
    linter, formatter, database, orm, cssFramework,
    uiLibrary, deployment, monorepo, summary,
  };
}

async function detectPythonFramework(root: vscode.Uri): Promise<string | null> {
  try {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, "requirements.txt"));
    const txt = new TextDecoder().decode(bytes).toLowerCase();
    if (txt.includes("django")) return "Django";
    if (txt.includes("fastapi")) return "FastAPI";
    if (txt.includes("flask")) return "Flask";
    if (txt.includes("tornado")) return "Tornado";
  } catch { /* ignore */ }
  return null;
}

function emptyContext(summary: string): ProjectContext {
  return {
    framework: null, language: "Unknown", packageManager: null,
    testFramework: null, linter: null, formatter: null,
    database: null, orm: null, cssFramework: null,
    uiLibrary: null, deployment: null, monorepo: false, summary,
  };
}

/**
 * Extract symbols from workspace files (classes, functions, interfaces, components, routes).
 */
export async function indexWorkspaceSymbols(maxFiles = 100): Promise<SymbolInfo[]> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) return [];

  const uris = await vscode.workspace.findFiles(
    "**/*.{ts,tsx,js,jsx,py,go,rs,java,rb,php,vue,svelte}",
    "{**/node_modules/**,**/dist/**,**/.git/**,**/build/**,**/coverage/**,**/.next/**,**/out/**}",
    maxFiles
  );

  const symbols: SymbolInfo[] = [];

  for (const uri of uris) {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(bytes);
      const rel = vscode.workspace.asRelativePath(uri, false);
      extractSymbolsFromText(text, rel, symbols);
    } catch {
      /* skip unreadable */
    }
  }

  cachedSymbols = symbols;
  return symbols;
}

function extractSymbolsFromText(text: string, file: string, out: SymbolInfo[]): void {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let m: RegExpMatchArray | null;

    m = line.match(/^\s*(?:export\s+)?(?:default\s+)?class\s+(\w+)/);
    if (m) { out.push({ name: m[1], kind: "class", file, line: i + 1 }); continue; }

    m = line.match(/^\s*(?:export\s+)?interface\s+(\w+)/);
    if (m) { out.push({ name: m[1], kind: "interface", file, line: i + 1 }); continue; }

    m = line.match(/^\s*(?:export\s+)?type\s+(\w+)\s*[=<]/);
    if (m) { out.push({ name: m[1], kind: "type", file, line: i + 1 }); continue; }

    m = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (m) { out.push({ name: m[1], kind: "function", file, line: i + 1 }); continue; }

    m = line.match(/^\s*(?:export\s+)?const\s+(\w+)\s*[=:]\s*(?:\(|React\.FC|React\.memo|forwardRef|styled)/);
    if (m) { out.push({ name: m[1], kind: "component", file, line: i + 1 }); continue; }

    m = line.match(/^\s*(?:export\s+)?(?:default\s+)?function\s+(\w+)\s*\(/);
    if (m && /[A-Z]/.test(m[1][0]) && /\.(tsx|jsx|vue|svelte)$/.test(file)) {
      out.push({ name: m[1], kind: "component", file, line: i + 1 });
      continue;
    }

    m = line.match(/(?:app|router)\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)/);
    if (m) { out.push({ name: `${m[1].toUpperCase()} ${m[2]}`, kind: "route", file, line: i + 1 }); continue; }

    m = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/);
    if (m && /^[A-Z]/.test(m[1]) && !out.some(s => s.name === m![1] && s.file === file)) {
      out.push({ name: m[1], kind: "export", file, line: i + 1 });
    }

    // Python
    m = line.match(/^class\s+(\w+)/);
    if (m && file.endsWith(".py")) { out.push({ name: m[1], kind: "class", file, line: i + 1 }); continue; }

    m = line.match(/^def\s+(\w+)/);
    if (m && file.endsWith(".py")) { out.push({ name: m[1], kind: "function", file, line: i + 1 }); continue; }
  }
}
