import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	const provider = new ColorsViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ColorsViewProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('calicoColors.addColor', () => {
			provider.addColor();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('calicoColors.clearColors', () => {
			provider.clearColors();
		}));
}

class ColorsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'calicoColors.colorsView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
				case 'notification':
					{
						// 显示通知消息
						vscode.window.showInformationMessage(data.message);
						break;
					}
			}
		});
	}

	public addColor() {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
		
		// 获取图标的URI
		const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'images', 'icon.svg'));
		// 获取coppy图标的URI
		const copyIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'images', 'copy.svg'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src https://vscodeapi.frontlearn.work:8086;">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<!-- 添加图标路径作为数据属性 -->
				<meta id="icon-path" data-path="${iconUri}">
				<!-- 添加coppy图标路径作为数据属性 -->
				<meta id="copy-icon-path" data-path="${copyIconUri}">

				<title>Cat Colors</title>
			</head>
			<body>
				<!-- 
					Vue2
				-->
				<div id="Vue2Wrap" class="topWrap">
					<div class="title">Vue2提示词</div>
					<div class="prompt-content">
						<div class="prompt-list">
							<!-- 
							<div class="prompt-item">
								<div class="prompt-icon"></div>
								<div class="prompt-right">
									<div class="prompt-title"></div>
									<div class="prompt-content"></div>
								</div>
							</div>
							-->
						</div>
					</div>
				</div>
				
				<!-- 
					Vue3
				-->
				<div id="Vue3Wrap" class="topWrap">
					<div class="title">Vue3提示词</div>
					<div class="prompt-content">
						<div class="prompt-list">
						</div>
					</div>
				</div>
				
				<!-- 
					Git
				-->
				<div id="gitWrap" class="topWrap">
					<div class="title">Git提示词</div>
					<div class="prompt-content">
						<div class="prompt-list">
						</div>
					</div>
				</div>
				
				<!-- 
					css
				-->
				<div class="color-list">
				</div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
