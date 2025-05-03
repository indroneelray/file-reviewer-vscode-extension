// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const OpenAI = require('openai');
const markdownit = require('markdown-it')

const hljs = require('highlight.js') // https://highlightjs.org

const md = markdownit({
	html: true,
	linkify: true,
	typographer: true,
	highlight: function (str, lang) {
		if (lang && hljs.getLanguage(lang)) {
		  try {
			return hljs.highlight(str, { language: lang }).value;
		  } catch (__) {}
		}
	
		return ''; // use external default escaping
	  }
})

let openaiClient = undefined
let currentPanel = undefined;
const modelName = 'gpt-4.1-mini' // 'gpt-4o-mini' or 'gpt-3.5-turbo';
const configTemplate = {
	OPENAI_API_KEY: 'openaiApiKey',
	OPENAI_MODEL: 'openAiModel',
}

let cachedApiKey = undefined

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "file-reviewer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const reviewFileDisposable = vscode.commands.registerCommand('file-reviewer.reviewFile', async function () {
		// The code you place here will be executed every time your command is executed

		try {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active file to review. Please open a file first.');
				return;
			}
			let openaiApiKey = cachedApiKey ?? vscode.workspace.getConfiguration('fileReviewer').get(configTemplate.OPENAI_API_KEY);
			if (!openaiApiKey) {
				const apiKeyInput = await promptForOpenAiApiKey();
				if (!apiKeyInput) {
					vscode.window.showErrorMessage('No OpenAI API key provided. Please set it in the extension settings.');
					return;
				}

				openaiApiKey = apiKeyInput
				cachedApiKey = apiKeyInput
				// Save the API key in settings
				const config = vscode.workspace.getConfiguration('fileReviewer');
				await config.update(configTemplate.OPENAI_API_KEY, openaiApiKey, vscode.ConfigurationTarget.Global);
			}
			// Get the content of the current file
			const document = editor.document;
			const fileContent = document.getText();
			const fileName = path.basename(document.fileName);
			const fileLanguage = document.languageId;
			// Show a progress indicator
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `Reviewing ${fileName}...`,
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0 });

				try {
					// Get OpenAI API key from settings

					if (!openaiApiKey) {
						throw new Error('OpenAI API key is not configured. Please set it in the extension settings.');
					}

					// Send the file content to OpenAI for review
					progress.report({ increment: 50, message: 'Analyzing code...' });
					const reviewResult = await sendToOpenAI(fileContent, fileLanguage, openaiApiKey, modelName);

					// Create or show the webview panel with the results
					createOrShowWebview(context.extensionUri, fileName, fileContent, reviewResult);

					progress.report({ increment: 100, message: 'Done!' });
				} catch (error) {
					vscode.window.showErrorMessage(`Error reviewing code: ${error.message}`);
				}
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error.message}`);
		}
	});

	context.subscriptions.push(reviewFileDisposable);


	const setConfigApiKeyDisposable = vscode.commands.registerCommand('file-reviewer.configureApiKey', async () => {
		const apiKey = await promptForOpenAiApiKey();
		if (apiKey) {
			// Save the API key in settings
			cachedApiKey = apiKey
			const config = vscode.workspace.getConfiguration('fileReviewer');
			await config.update(configTemplate.OPENAI_API_KEY, cachedApiKey, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage('OpenAI API key has been saved');
		}

	})
	context.subscriptions.push(setConfigApiKeyDisposable);

}



async function promptForOpenAiApiKey() {
	const apiKey = await vscode.window.showInputBox({
		prompt: 'Enter your OpenAI API key',
		password: true,
		ignoreFocusOut: true,
	});
	return apiKey
}


// Send file content to OpenAI API using the SDK
async function sendToOpenAI(fileContent, fileLanguage, apiKey, modelName) {
	try {
		// Initialize the OpenAI client
		openaiClient = new OpenAI({
			apiKey: apiKey,
		});
		// Define the system prompt for code review
		const systemPrompt = `You are an expert ${fileLanguage} code reviewer. Review the following ${fileLanguage} code and provide detailed, constructive feedback.
		 Be specific in your review by referencing function names, line numbers, variable names, etc in the file content.
	 	 Format your response in markdown for better readability. 
		Structure the review in a clear and organized manner in the following sequence:
		1. Summary of the code
		2. Code quality and best practices
		3. Potential bugs or errors
		4. Performance issues
		5. Security vulnerabilities
		6. Readability and maintainability
		7. Suggestions for improvement
		8. Provide a refactored version of the code based on your suggestions.
		9. Provide a summary of the review and code changes at the end.
	`;

		// Create the request using the SDK
		const completion = await openaiClient.chat.completions.create({
			model: modelName ?? 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: fileContent }
			],
			temperature: 0.7,
			max_tokens: 3000,
			
		});

		// Extract and return the review content
		return completion.choices[0].message.content;
	} catch (error) {
		if (error.response) {
			// Handle API error response
			const statusCode = error.status;
			const errorData = error.error;
			throw new Error(`OpenAI API error (${statusCode}): ${JSON.stringify(errorData)}`);
		} else {
			throw new Error(`Error calling OpenAI API: ${error.message}`);
		}
	}
}


function createOrShowWebview(
	extensionUri,
	fileName,
	fileContent,
	reviewResult
) {
	const columnToShowIn = vscode.window.activeTextEditor
		? vscode.window.activeTextEditor.viewColumn
		: undefined;

	// If we already have a panel, show it in the target column
	if (currentPanel) {
		currentPanel.reveal(columnToShowIn);
		updateWebviewContent(currentPanel, fileName, fileContent, reviewResult);
		return;
	}

	// Otherwise, create a new panel
	currentPanel = vscode.window.createWebviewPanel(
		'codeReview',
		`Review: ${fileName}`,
		vscode.ViewColumn.Beside, // Show the webview in the column beside the active editor
		{
			// Enable scripts in the webview
			enableScripts: true,
			// Restrict the webview to only load content from our extension's directory
			localResourceRoots: [extensionUri],
			retainContextWhenHidden: true,
		}
	);

	// Set initial HTML content
	updateWebviewContent(currentPanel, fileName, fileContent, reviewResult);

	// Handle panel disposal
	currentPanel.onDidDispose(
		() => {
			currentPanel = undefined;
		},
		null,
		[]
	);
}

// Update the webview content
function updateWebviewContent(
	panel,
	fileName,
	fileContent,
	reviewResult
) {
	// Create HTML content for the webview
	panel.webview.html = getWebviewContent(panel.webview, fileName, fileContent, reviewResult);
}

function getWebviewContent(
	webview,
	fileName,
	fileContent,
	reviewResult
) {

	console.log(reviewResult)
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>Code Review: ${fileName}</title>
	  <style>
		body {
		  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		  padding: 20px;
		  color: #333;
		  background-color: white;
		  line-height: 1.5;
		  width:100%;
		  overflow: scroll
		}
		
		code {
			color: #F8F8F8;
		}
			
		pre {
			background: #F8F8F8;
			border: 1px solid #ccc;
			border-radius: 4px;
			padding: 10px;
		}

		pre code {
			background:transparent;
			color: #333
		}
	  </style>
	</head>
	<body>
	  <h1>Code Review: ${fileName}</h1>
	  <div class="review-container">
		${md.render(reviewResult.split('```markdown')[1])}
	  </div>
	</body>
	</html>`;
}



// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
