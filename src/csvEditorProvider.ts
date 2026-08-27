import * as vscode from 'vscode';
import { parseCsv, detectDelimiter, stripBom, Delimiter } from './csvParser';

export class CsvEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'csvTableViewer.editor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new CsvEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(CsvEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true,
    });
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const sendData = (): void => {
      const config = vscode.workspace.getConfiguration('csvTableViewer');
      const maxRows = Math.max(1, config.get<number>('maxRows', 20000));
      const delimiterSetting = config.get<string>('delimiter', 'auto');
      const pageSize = config.get<number>('pageSize', 200);

      const text = stripBom(document.getText());
      const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? '';
      const override = this.settingToDelimiter(delimiterSetting);
      const delimiter = detectDelimiter(firstLine, override);

      // +1 so the header row doesn't clip into the user-configured data row.
      const parsed = parseCsv(text, delimiter, maxRows + 1);

      void webviewPanel.webview.postMessage({
        type: 'csv-data',
        fileName: this.getFileName(document.uri),
        headers: parsed.headers,
        rows: parsed.rows,
        delimiter: parsed.delimiter,
        truncated: parsed.truncated,
        totalRowCount: parsed.totalRowCount,
        pageSize,
      });
    };

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        sendData();
      }
    });
    const configSub = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('csvTableViewer')) {
        sendData();
      }
    });
    const messageSub = webviewPanel.webview.onDidReceiveMessage((message: { type?: string }) => {
      if (message?.type === 'ready') {
        sendData();
      } else if (message?.type === 'open-as-text') {
        void vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
      }
    });

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      configSub.dispose();
      messageSub.dispose();
    });
  }

  private settingToDelimiter(setting: string): Delimiter | undefined {
    switch (setting) {
      case 'comma':
        return ',';
      case 'semicolon':
        return ';';
      case 'tab':
        return '\t';
      case 'pipe':
        return '|';
      default:
        return undefined; // 'auto' (or anything unexpected) -> let detection decide so VSCODE ITSELF can handle it.
    }
  }

  private getFileName(uri: vscode.Uri): string {
    const parts = uri.path.split('/');
    return parts[parts.length - 1] || uri.path;
  }

  private getHtml(webview: vscode.Webview): string { // never put any user data in here, it can be exploited by a malicious CSV file. Only use the webview.asWebviewUri() for local resources.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'csvEditor.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'csvEditor.css'));
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>CSV Table Viewer</title>
</head>
<body>
  <div id="toolbar">
    <input id="search" type="text" placeholder="Search all columns…" aria-label="Search CSV" autocomplete="off" />
    <span id="rowCount" class="muted" aria-live="polite"></span>
    <button id="openAsText" class="link-button" title="Open the raw file in the default text editor">Open as Text</button>
  </div>
  <div id="warningBanner" class="banner" role="status" hidden></div>
  <div id="tableWrapper" title="Double-click a cell to copy its value">
    <table id="csvTable">
      <thead id="csvHead"></thead>
      <tbody id="csvBody"></tbody>
    </table>
  </div>
  <div id="pagination">
    <button id="prevPage" class="link-button">◀ Prev</button>
    <span id="pageInfo" class="muted"></span>
    <button id="nextPage" class="link-button">Next ▶</button>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
