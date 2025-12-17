import * as vscode from "vscode";
import { FolderItem, TodoItem, TodoKind } from "./todoItem";

const LINE_REGEX =
  /\/\/\s*(TODO|DONE)\s*((?:\[[^\]]+\])*)\s*:\s*(.+)/;

function parseTags(raw: string): string[] {
  if (!raw) {return [];}
  return raw
    .match(/\[([^\]]+)\]/g)
    ?.map(t => t.slice(1, -1).toLowerCase()) ?? [];
}

export class TodoProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(item: vscode.TreeItem) {
    return item;
  }

  async getChildren(
    element?: vscode.TreeItem
  ): Promise<vscode.TreeItem[]> {
    if (!element) {return this.buildRoot();}
    if (element instanceof FolderItem) {return element.children;}
    return [];
  }

  // ---------------- Commands ----------------

  async toggle(item: TodoItem) {
    const doc = await vscode.workspace.openTextDocument(item.uri);
    const line = doc.lineAt(item.line);
    const updated =
      item.kind === "TODO"
        ? line.text.replace(/\bTODO\b/, "DONE")
        : line.text.replace(/\bDONE\b/, "TODO");

    const edit = new vscode.WorkspaceEdit();
    edit.replace(item.uri, line.range, updated);
    await vscode.workspace.applyEdit(edit);

    this.refresh();
  }

  async open(item: TodoItem) {
    const doc = await vscode.workspace.openTextDocument(item.uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
    });

    const pos = new vscode.Position(item.line, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(
      new vscode.Range(pos, pos),
      vscode.TextEditorRevealType.InCenter
    );
  }

  async delete(item: TodoItem) {
    const doc = await vscode.workspace.openTextDocument(item.uri);
    const line = doc.lineAt(item.line);

    const edit = new vscode.WorkspaceEdit();
    edit.delete(item.uri, line.rangeIncludingLineBreak);
    await vscode.workspace.applyEdit(edit);

    this.refresh();
  }

  async deleteAllCompleted() {
    const files = await vscode.workspace.findFiles("**/*.{ts,tsx,js,cs}");
    const edit = new vscode.WorkspaceEdit();

    for (const file of files) {
      const doc = await vscode.workspace.openTextDocument(file);

      for (let i = doc.lineCount - 1; i >= 0; i--) {
        if (/\bDONE\b/.test(doc.lineAt(i).text)) {
          edit.delete(file, doc.lineAt(i).rangeIncludingLineBreak);
        }
      }
    }

    await vscode.workspace.applyEdit(edit);
    this.refresh();
  }

  // ---------------- Tree building ----------------

  private async buildRoot(): Promise<vscode.TreeItem[]> {
    const files = await vscode.workspace.findFiles("**/*.{ts,tsx,js,cs}");

    const folders = new Map<string, Map<string, TodoItem[]>>();
    const rootTodos: TodoItem[] = [];

    for (const file of files) {
      const doc = await vscode.workspace.openTextDocument(file);

      doc.getText().split("\n").forEach((raw, index) => {
        const match = raw.match(LINE_REGEX);
        if (!match) {return;}

        const kind = match[1] as TodoKind;
        const tags = parseTags(match[2]);
        const message = match[3];

        const todo = new TodoItem(
          message,
          file,
          index,
          kind,
          this.extensionUri
        );

        // 👉 NO TAGS → root level
        if (tags.length === 0) {
          rootTodos.push(todo);
          return;
        }

        // 👉 TAGGED → folders
        const main = tags[0];
        const sub = tags[1] ?? "";

        if (!folders.has(main)) {folders.set(main, new Map());}
        const subMap = folders.get(main)!;
        if (!subMap.has(sub)) {subMap.set(sub, []);}

        subMap.get(sub)!.push(todo);
      });
    }

    // Build folder tree FIRST
    const result: vscode.TreeItem[] = [];

    for (const [mainTag, subMap] of [...folders.entries()].sort()) {
      const children: vscode.TreeItem[] = [];

      // Tasks with only one tag
      if (subMap.has("")) {
        children.push(...subMap.get("")!);
      }

      // Subfolders
      for (const [subTag, tasks] of [...subMap.entries()].sort()) {
        if (!subTag) {continue;}
        children.push(new FolderItem(subTag, tasks));
      }

      result.push(new FolderItem(mainTag, children));
    }

    // THEN append untagged todos
    result.push(...rootTodos);

    return result;
  }
}