import * as vscode from "vscode";
import { runComposerMode, applyComposerPlan } from "./composerMode";

export interface ScaffoldTemplate {
  name: string;
  description: string;
  prompt: string;
}

export const SCAFFOLD_TEMPLATES: ScaffoldTemplate[] = [
  {
    name: "React App",
    description: "Create-React-App with TypeScript, Tailwind, and basic layout",
    prompt: "Create a new React app with TypeScript and Tailwind CSS. Include: App.tsx with basic layout, index.tsx, tailwind.config.js, tsconfig.json, package.json with all dependencies, and a src/components/Header.tsx component.",
  },
  {
    name: "Next.js App",
    description: "Next.js 14+ with App Router, TypeScript, Tailwind",
    prompt: "Create a Next.js 14 app with App Router, TypeScript, and Tailwind CSS. Include: app/layout.tsx, app/page.tsx, app/globals.css with Tailwind, tailwind.config.ts, next.config.mjs, tsconfig.json, package.json.",
  },
  {
    name: "Express API",
    description: "Express.js REST API with TypeScript",
    prompt: "Create an Express.js REST API with TypeScript. Include: src/index.ts (server with error handling), src/routes/health.ts, src/middleware/errorHandler.ts, tsconfig.json, package.json, .env.example.",
  },
  {
    name: "FastAPI Backend",
    description: "FastAPI Python backend with proper structure",
    prompt: "Create a FastAPI Python backend. Include: main.py, app/routes/__init__.py, app/routes/health.py, app/models/__init__.py, requirements.txt, .env.example.",
  },
  {
    name: "Chrome Extension",
    description: "Chrome Extension with Manifest V3",
    prompt: "Create a Chrome Extension with Manifest V3. Include: manifest.json, popup.html, popup.js, content.js, background.js, styles.css, icons placeholder.",
  },
  {
    name: "VS Code Extension",
    description: "VS Code extension with TypeScript",
    prompt: "Create a VS Code extension with TypeScript. Include: package.json with contributes, src/extension.ts, tsconfig.json, .vscode/launch.json, .vscodeignore, README.md.",
  },
  {
    name: "SaaS Starter",
    description: "Next.js SaaS with auth, database, and billing",
    prompt: "Create a SaaS starter with Next.js 14, TypeScript, Tailwind, Prisma (PostgreSQL). Include: app/layout.tsx, app/page.tsx, app/dashboard/page.tsx, app/api/auth/route.ts, prisma/schema.prisma with User model, lib/prisma.ts, package.json.",
  },
];

export function registerScaffoldingCommands(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.scaffold", async () => {
      const items = SCAFFOLD_TEMPLATES.map((t) => ({
        label: t.name,
        description: t.description,
        template: t,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        title: "Project Scaffold",
        placeHolder: "Choose a project template…",
      });

      if (!picked) return;

      const customization = await vscode.window.showInputBox({
        title: "Customize Template",
        placeHolder: "Any special requirements? (optional)",
        prompt: `Creating: ${picked.label} — ${picked.description}`,
      });

      const fullPrompt = customization
        ? `${picked.template.prompt}\n\nAdditional requirements: ${customization}`
        : picked.template.prompt;

      try {
        const plan = await runComposerMode(fullPrompt, {
          onProgress: (text) => vscode.window.setStatusBarMessage(text, 5000),
        });

        const fileItems = plan.files.map((f) => ({
          label: `$(${f.action === "create" ? "new-file" : "edit"}) ${f.path}`,
          description: f.action,
          detail: f.reason,
          picked: true,
          filePath: f.path,
        }));

        const selected = await vscode.window.showQuickPick(fileItems, {
          title: `Scaffold: ${picked.label}`,
          placeHolder: "Select files to create",
          canPickMany: true,
        });

        if (!selected?.length) return;

        const paths = new Set(selected.map((s) => s.filePath));
        const result = await applyComposerPlan(plan, paths);
        vscode.window.showInformationMessage(
          `Scaffold complete: ${result.applied.length} files created.`
        );
      } catch (e) {
        vscode.window.showErrorMessage(
          `Scaffold error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    })
  );
}
