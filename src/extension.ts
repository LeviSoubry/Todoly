import * as vscode from "vscode";
import { TodoProvider } from "./todoProvider";
import { TodoItem } from "./todoItem";

export function activate(context: vscode.ExtensionContext) {
  const provider = new TodoProvider(context.extensionUri);

  const treeView = vscode.window.createTreeView("todoList", {
    treeDataProvider: provider,
  });
  context.subscriptions.push(treeView);

  // Toggle (primary click)
  context.subscriptions.push(
    vscode.commands.registerCommand("todoly.toggleTodo", async (item: TodoItem) => {
      if (!item) {return;}
      await provider.toggle(item);
    })
  );

  // Open (context menu / Enter)
  context.subscriptions.push(
    vscode.commands.registerCommand("todoly.openTodo", async (item: TodoItem) => {
      if (!item) {return;}
      await provider.open(item);
    })
  );

  // Delete one
  context.subscriptions.push(
    vscode.commands.registerCommand("todoly.deleteTodo", async (item: TodoItem) => {
      if (!item) {return;}
      await provider.delete(item);
    })
  );

  // Delete all completed
  context.subscriptions.push(
    vscode.commands.registerCommand("todoly.deleteCompleted", async () => {
      await provider.deleteAllCompleted();
    })
  );

  // Refresh on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => provider.refresh())
  );
}

export function deactivate() {}