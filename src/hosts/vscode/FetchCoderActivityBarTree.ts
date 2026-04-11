import * as vscode from "vscode";
import { ExtensionRegistryInfo } from "@/registry";

/**
 * Single-item activity bar tree: opens/focuses the secondary sidebar chat webview.
 */
export class FetchCoderActivityBarProvider
	implements vscode.TreeDataProvider<vscode.TreeItem>
{
	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<vscode.TreeItem[]> {
		const item = new vscode.TreeItem(
			"Fetch Coder Chat",
			vscode.TreeItemCollapsibleState.None,
		);
		item.iconPath = new vscode.ThemeIcon("comment-discussion");
		item.command = {
			command: ExtensionRegistryInfo.commands.OpenAiChat,
			title: "Fetch Coder Chat",
		};
		item.tooltip = "Open Fetch Coder chat (secondary sidebar)";
		return Promise.resolve([item]);
	}
}
