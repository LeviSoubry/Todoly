import * as vscode from "vscode";

export type TodoKind = "TODO" | "DONE";

export class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly message: string,
    public readonly uri: vscode.Uri,
    public readonly line: number,
    public readonly kind: TodoKind,
    extensionUri: vscode.Uri
  ) {
    super(message, vscode.TreeItemCollapsibleState.None);

    // Primary click: toggle TODO <-> DONE
    this.command = {
      command: "todoly.toggleTodo",
      title: "Toggle",
      arguments: [this],
    };

    const icon = kind === "DONE" ? "todo-done.svg" : "todo-empty.svg";
    this.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, "media", icon),
      dark: vscode.Uri.joinPath(extensionUri, "media", icon),
    };

    // This is what menus use to decide if it's a task vs folder
    this.contextValue = "todoTask";

    // Optional: show DONE label
    this.description = kind === "DONE" ? "done" : undefined;
  }
}

export class FolderItem extends vscode.TreeItem {
  constructor(
    public readonly folderLabel: string,
    public readonly children: vscode.TreeItem[]
  ) {
    super(folderLabel, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon("folder");
    this.contextValue = "todoFolder";
  }
}