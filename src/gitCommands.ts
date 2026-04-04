import * as vscode from "vscode";
import * as cp from "child_process";
import { completeChat, type ChatMessage } from "./asiClient";

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = cp.spawn("git", args, { cwd, timeout: 15_000 });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0 && !out) reject(new Error(err || `git exited ${code}`));
      else resolve(out);
    });
    proc.on("error", reject);
  });
}

export function registerGitCommands(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.aiCommit", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showErrorMessage("No workspace open.");
        return;
      }
      const cwd = folder.uri.fsPath;

      const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBar.text = "$(sync~spin) Generating commit message…";
      statusBar.show();

      try {
        const diff = await runGit(["diff", "--staged", "--stat"], cwd);
        const diffContent = await runGit(["diff", "--staged"], cwd);

        if (!diff.trim()) {
          vscode.window.showWarningMessage("No staged changes. Run `git add` first.");
          return;
        }

        const clipped = diffContent.slice(0, 8000);
        const messages: ChatMessage[] = [
          {
            role: "system",
            content: `You are a git commit message generator. Analyze the diff and output ONLY a conventional commit message. Format:
<type>(<scope>): <description>

<body>

Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build
Keep subject under 72 chars. Body should explain WHY, not WHAT.
Output ONLY the commit message, no markdown, no explanation.`,
          },
          {
            role: "user",
            content: `Generate a commit message for these staged changes:\n\n${diff}\n\nDiff:\n${clipped}`,
          },
        ];

        const result = await completeChat(messages);
        const commitMsg = result.content.trim().replace(/^```[\s\S]*?\n/, "").replace(/```$/, "").trim();

        const edited = await vscode.window.showInputBox({
          title: "AI Commit Message",
          value: commitMsg,
          prompt: "Edit the commit message if needed, then press Enter to commit.",
        });

        if (edited === undefined) return;

        await runGit(["commit", "-m", edited], cwd);
        vscode.window.showInformationMessage("Committed successfully!");
      } catch (e) {
        vscode.window.showErrorMessage(`Commit failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        statusBar.dispose();
      }
    }),

    vscode.commands.registerCommand("asiAssistant.aiPullRequest", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showErrorMessage("No workspace open.");
        return;
      }
      const cwd = folder.uri.fsPath;

      const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBar.text = "$(sync~spin) Generating PR description…";
      statusBar.show();

      try {
        const branch = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd)).trim();
        const logOutput = await runGit(["log", "--oneline", "main..HEAD"], cwd).catch(() =>
          runGit(["log", "--oneline", "-10"], cwd)
        );
        const diffStat = await runGit(["diff", "--stat", "main..HEAD"], cwd).catch(() =>
          runGit(["diff", "--stat", "HEAD~5..HEAD"], cwd).catch(() => "")
        );

        const messages: ChatMessage[] = [
          {
            role: "system",
            content: `Generate a GitHub Pull Request description. Output ONLY in this format:
## Title
<concise PR title>

## Summary
<2-4 bullet points describing changes>

## Test Plan
<testing checklist>

## Changelog
<user-facing changes>

No markdown code fences. No extra explanation.`,
          },
          {
            role: "user",
            content: `Branch: ${branch}\n\nCommits:\n${logOutput}\n\nChanges:\n${diffStat}`,
          },
        ];

        const result = await completeChat(messages);
        const doc = await vscode.workspace.openTextDocument({ content: result.content, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (e) {
        vscode.window.showErrorMessage(`PR generation failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        statusBar.dispose();
      }
    })
  );
}
