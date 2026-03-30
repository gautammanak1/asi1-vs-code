import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

export interface AgentScaffoldInput {
  /** Human-readable name (e.g. "My Weather Bot"). */
  displayName: string;
  /** Folder that will contain `<safe-name>/` (must exist). */
  parentFolder: vscode.Uri;
  /** uAgent listen port (default 8000). */
  agentPort?: number;
  /** Hosting port for docker mapping (default 8080). Must differ from agentPort. */
  hostingPort?: number;
  /** Short description for manifests / README. */
  agentDescription?: string;
  /** Optional JWT for Agentverse registration. */
  agentverseApiKey?: string;
}

const TEMPLATE_FILES: Array<{ template: string; output: string }> = [
  { template: "template.agent.py.j2", output: "agent.py" },
  { template: "template.main.py.j2", output: "main.py" },
  { template: "env.j2", output: ".env" },
  { template: "template.Makefile.j2", output: "Makefile" },
  { template: "template.pyproject.toml.j2", output: "pyproject.toml" },
  { template: "template.docker-compose.yml.j2", output: "docker-compose.yml" },
  { template: "template.Dockerfile.j2", output: "Dockerfile" },
  { template: "template.test.py.j2", output: "test.py" },
  { template: "README.md.j2", output: "README.md" },
];

/** Minimal requirements so Docker `pip install -r` works before Poetry lock. */
const REQUIREMENTS_TXT = `uagents>=0.23.4,<0.24
python-dotenv>=1.2.1
pydantic>=2,<3
`;

function safeName(displayName: string): string {
  const s = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return s.length > 0 ? s : "my-agent";
}

function titleCaseDisplay(displayName: string): string {
  const t = displayName.trim();
  if (!t) {
    return "My Agent";
  }
  return t.replace(/\w\S*/g, (x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase());
}

/**
 * Replace `{{ key }}` placeholders (same as create-agentverse-agent Jinja variables).
 */
export function renderTemplate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    ctx[key] !== undefined ? ctx[key] : ""
  );
}

function buildContext(input: AgentScaffoldInput): Record<string, string> {
  const displayName = input.displayName.trim();
  const display_name = titleCaseDisplay(displayName);
  const safe_name = safeName(displayName);
  let agent_port = input.agentPort ?? 8000;
  let hosting_port = input.hostingPort ?? 8080;
  if (agent_port === hosting_port) {
    hosting_port = agent_port === 8080 ? 8081 : 8080;
  }
  const agent_seed_phrase = randomBytes(32).toString("hex");
  const agent_description =
    input.agentDescription?.trim() ||
    "An ASI1-compatible uAgent using the Agent Chat Protocol (scaffolded from ASI1 Code).";
  const agentverse_api_key = input.agentverseApiKey?.trim() ?? "";
  const env = "development";
  const hosting_address = "localhost";
  const max_processed_messages = "1000";
  const processed_message_ttl_minutes = "60";
  const cleanup_interval_seconds = "300";
  const rate_limit_max_requests = "30";
  const rate_limit_window_minutes = "60";
  const agent_route = `/${safe_name}`;
  const hosting_endpoint = `http://${hosting_address}:${hosting_port}`;

  return {
    display_name,
    safe_name,
    agent_name: display_name,
    agent_description,
    agent_seed_phrase,
    agent_port: String(agent_port),
    hosting_port: String(hosting_port),
    hosting_address,
    hosting_endpoint,
    agent_route,
    env,
    max_processed_messages,
    processed_message_ttl_minutes,
    cleanup_interval_seconds,
    rate_limit_max_requests,
    rate_limit_window_minutes,
    agentverse_api_key,
  };
}

async function readTemplate(extensionUri: vscode.Uri, name: string): Promise<string> {
  const uri = vscode.Uri.joinPath(extensionUri, "resources", "agentverse-templates", name);
  const buf = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(buf).toString("utf8");
}

async function writeText(target: vscode.Uri, text: string): Promise<void> {
  await vscode.workspace.fs.writeFile(target, Buffer.from(text, "utf8"));
}

async function uriExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a project folder matching `create-agentverse-agent` output: uAgents + chat protocol (`main.py`, `agent.py`, Makefile, etc.).
 */
export async function scaffoldAgentverseProject(
  extensionUri: vscode.Uri,
  input: AgentScaffoldInput
): Promise<vscode.Uri> {
  const ctx = buildContext(input);
  const projectDir = vscode.Uri.joinPath(input.parentFolder, ctx.safe_name);

  const existed = await uriExists(projectDir);
  if (existed) {
    const ok = await vscode.window.showWarningMessage(
      `Folder already exists: ${ctx.safe_name}. Replace scaffold files?`,
      { modal: true },
      "Replace"
    );
    if (ok !== "Replace") {
      throw new Error("Cancelled");
    }
  } else {
    await vscode.workspace.fs.createDirectory(projectDir);
  }

  for (const { template, output } of TEMPLATE_FILES) {
    const raw = await readTemplate(extensionUri, template);
    const rendered = renderTemplate(raw, ctx);
    await writeText(vscode.Uri.joinPath(projectDir, output), rendered);
  }

  await writeText(vscode.Uri.joinPath(projectDir, "requirements.txt"), REQUIREMENTS_TXT);

  return projectDir;
}
