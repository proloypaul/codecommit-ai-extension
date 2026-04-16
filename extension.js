// const vscode = require("vscode");
// const simpleGit = require("simple-git");
// const axios = require("axios");

// /* ---------------- GIT DIFF ---------------- */
// async function getGitDiff() {
//   try {
//     const workspaceFolders = vscode.workspace.workspaceFolders;

//     if (!workspaceFolders) {
//       vscode.window.showErrorMessage("Open a Git project first");
//       return null;
//     }

//     const repoPath = workspaceFolders[0].uri.fsPath;
//     const git = simpleGit(repoPath);
//     const diff = await git.diff();

//     if (!diff) {
//       vscode.window.showWarningMessage("No changes found");
//       return null;
//     }

//     return diff;
//   } catch (err) {
//     vscode.window.showErrorMessage("Git diff failed");
//     console.error(err);
//     return null;
//   }
// }

// /* ---------------- AI COMMIT ---------------- */
// async function generateAICommitMessage(diff) {
//   try {
//     const response = await axios.post(`http://localhost:4045/generate-commit`, {
//       diff,
//     });

//     return response.data.message;
//   } catch (error) {
//     vscode.window.showErrorMessage("AI API commit message generation failed");
//     console.error(error);
//     return "chore: update code";
//   }
// }

// /* ---------------- AI CODE IMPROVEMENT ---------------- */
// async function getAIUpdatedCode(originalCode) {
//   try {
//     const res = await axios.post(`http://localhost:4045/improve-code`, {
//       code: originalCode,
//     });

//     return res.data.code;
//   } catch (err) {
//     vscode.window.showErrorMessage("AI code improvement failed");
//     console.error(err);
//     return null;
//   }
// }

// /* ---------------- DIFF VIEW ---------------- */
// async function showDiffAndHandle(editor, originalCode, modifiedCode) {
//   const originalUri = vscode.Uri.parse("untitled:Original Code");
//   const modifiedUri = vscode.Uri.parse("untitled:AI Suggested Code");

//   const originalDoc = await vscode.workspace.openTextDocument(originalUri);
//   const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);

//   await vscode.window.showTextDocument(originalDoc, { preview: false });
//   await vscode.window.activeTextEditor.edit((edit) => {
//     edit.insert(new vscode.Position(0, 0), originalCode);
//   });

//   await vscode.window.showTextDocument(modifiedDoc, { preview: false });
//   await vscode.window.activeTextEditor.edit((edit) => {
//     edit.insert(new vscode.Position(0, 0), modifiedCode);
//   });

//   await vscode.commands.executeCommand(
//     "vscode.diff",
//     originalUri,
//     modifiedUri,
//     "AI Code Suggestion",
//   );

//   const action = await vscode.window.showInformationMessage(
//     "Apply AI changes?",
//     "Accept",
//     "Reject",
//   );

//   if (action === "Accept") {
//     const fullRange = new vscode.Range(
//       editor.document.positionAt(0),
//       editor.document.positionAt(originalCode.length),
//     );

//     await editor.edit((editBuilder) => {
//       editBuilder.replace(fullRange, modifiedCode);
//     });

//     vscode.window.showInformationMessage("✅ Changes applied");
//   } else {
//     vscode.window.showInformationMessage("❌ Changes rejected");
//   }
// }

// /* ---------------- ACTIVATE ---------------- */
// function activate(context) {
//   // Command 1: Commit message
//   const commitCommand = vscode.commands.registerCommand(
//     "git-commit-helper.generateCommitMessage",
//     async function () {
//       vscode.window.showInformationMessage("Generating AI commit message...");

//       const diff = await getGitDiff();
//       if (!diff) return;

//       const message = await generateAICommitMessage(diff);

//       vscode.window.showInformationMessage(`Commit: ${message}`);
//       await vscode.env.clipboard.writeText(message);
//     },
//   );

//   // Command 2: AI code suggestion
//   const aiSuggestionCommand = vscode.commands.registerCommand(
//     "git-commit-helper.applyAISuggestion",
//     async function () {
//       const editor = vscode.window.activeTextEditor;

//       if (!editor) {
//         vscode.window.showErrorMessage("Open a file first");
//         return;
//       }

//       const originalCode = editor.document.getText();

//       vscode.window.showInformationMessage("AI is generating suggestion...");

//       const modifiedCode = await getAIUpdatedCode(originalCode);
//       if (!modifiedCode) return;

//       await showDiffAndHandle(editor, originalCode, modifiedCode);
//     },
//   );

//   context.subscriptions.push(commitCommand, aiSuggestionCommand);
// }

// function deactivate() {}

// module.exports = {
//   activate,
//   deactivate,
// };

const vscode = require("vscode");

let panel;
let pendingChanges = [];
let activeEditor;

/**
 * Fake AI (replace with your API later)
 */
function getFakeChanges(editor) {
  const doc = editor.document;
  const changes = [];

  for (let i = 0; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;

    if (text.includes("var ")) {
      changes.push({
        startLine: i,
        endLine: i,
        oldText: text,
        newText: text.replace("var ", "const "),
      });
    }
  }

  return changes;
}

function activate(context) {
  const command = vscode.commands.registerCommand(
    "ai-inline.openWebview",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("Open a file first");
        return;
      }

      activeEditor = editor;
      pendingChanges = getFakeChanges(editor);

      if (pendingChanges.length === 0) {
        vscode.window.showInformationMessage("No AI suggestions");
        return;
      }

      panel = vscode.window.createWebviewPanel(
        "aiDiff",
        "AI Code Review",
        vscode.ViewColumn.Beside,
        { enableScripts: true },
      );

      panel.webview.html = getWebviewContent(pendingChanges);

      panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === "accept") {
          await applyChange(msg.index);
        }

        if (msg.type === "reject") {
          removeChange(msg.index);
        }

        // refresh UI
        panel.webview.html = getWebviewContent(pendingChanges);
      });
    },
  );

  context.subscriptions.push(command);
}

async function applyChange(index) {
  const change = pendingChanges[index];

  const range = new vscode.Range(
    change.startLine,
    0,
    change.endLine,
    activeEditor.document.lineAt(change.endLine).text.length,
  );

  await activeEditor.edit((editBuilder) => {
    editBuilder.replace(range, change.newText);
  });

  pendingChanges.splice(index, 1);
}

function removeChange(index) {
  pendingChanges.splice(index, 1);
}

/**
 * Webview UI (GitHub style)
 */
function getWebviewContent(changes) {
  return `
  <html>
  <body style="font-family: sans-serif; padding: 10px;">
    <h2>AI Code Suggestions</h2>

    ${changes
      .map(
        (c, i) => `
      <div style="border:1px solid #ddd; margin-bottom:10px; padding:10px;">
        
        <div style="background:#ffecec; color:#b91c1c; padding:5px;">
          - ${escapeHtml(c.oldText)}
        </div>

        <div style="background:#eaffea; color:#166534; padding:5px;">
          + ${escapeHtml(c.newText)}
        </div>

        <button onclick="accept(${i})">✅ Accept</button>
        <button onclick="reject(${i})">❌ Reject</button>

      </div>
    `,
      )
      .join("")}

    <script>
      const vscode = acquireVsCodeApi();

      function accept(index) {
        vscode.postMessage({ type: "accept", index });
      }

      function reject(index) {
        vscode.postMessage({ type: "reject", index });
      }
    </script>
  </body>
  </html>
  `;
}

function escapeHtml(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function deactivate() {}

module.exports = { activate, deactivate };
