import * as vscode from 'vscode';
import { CsvEditorProvider } from './csvEditorProvider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(CsvEditorProvider.register(context));

  context.subscriptions.push(
    vscode.commands.registerCommand('csvTableViewer.openAsText', async () => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
      const input = tab?.input;
      if (input instanceof vscode.TabInputCustom) {
        await vscode.commands.executeCommand('vscode.openWith', input.uri, 'default');
      } else {
        vscode.window.showWarningMessage('CSV Table Viewer: no active CSV tab to reopen as text.');
      }
    })
  );
}

export function deactivate(): void {
  // disposal is handled by VSCODE SELF
}
