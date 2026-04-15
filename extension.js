const vscode = require("vscode");
const simpleGit = require("simple-git");
const axios = require("axios");

/* ---------------- GIT DIFF ---------------- */
async function getGitDiff() {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      vscode.window.showErrorMessage("Open a Git project first");
      return null;
    }

    const repoPath = workspaceFolders[0].uri.fsPath;
    const git = simpleGit(repoPath);
    const diff = await git.diff();

    if (!diff) {
      vscode.window.showWarningMessage("No changes found");
      return null;
    }

    return diff;
  } catch (err) {
    vscode.window.showErrorMessage("Git diff failed");
    console.error(err);
    return null;
  }
}

/* ---------------- AI COMMIT ---------------- */
async function generateAICommitMessage(diff) {
  try {
    const response = await axios.post("http://localhost:3000/generate-commit", {
      diff,
    });

    return response.data.message;
  } catch (error) {
    vscode.window.showErrorMessage("AI API commit message generation failed");
    console.error(error);
    return "chore: update code";
  }
}

/* ---------------- AI CODE IMPROVEMENT ---------------- */
async function getAIUpdatedCode(originalCode) {
  try {
    const res = await axios.post("http://localhost:3000/improve-code", {
      code: originalCode,
    });

    return res.data.code;
  } catch (err) {
    vscode.window.showErrorMessage("AI code improvement failed");
    console.error(err);
    return null;
  }
}

/* ---------------- DIFF VIEW ---------------- */
async function showDiffAndHandle(editor, originalCode, modifiedCode) {
  const originalUri = vscode.Uri.parse("untitled:Original Code");
  const modifiedUri = vscode.Uri.parse("untitled:AI Suggested Code");

  const originalDoc = await vscode.workspace.openTextDocument(originalUri);
  const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);

  await vscode.window.showTextDocument(originalDoc, { preview: false });
  await vscode.window.activeTextEditor.edit((edit) => {
    edit.insert(new vscode.Position(0, 0), originalCode);
  });

  await vscode.window.showTextDocument(modifiedDoc, { preview: false });
  await vscode.window.activeTextEditor.edit((edit) => {
    edit.insert(new vscode.Position(0, 0), modifiedCode);
  });

  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    modifiedUri,
    "AI Code Suggestion",
  );

  const action = await vscode.window.showInformationMessage(
    "Apply AI changes?",
    "Accept",
    "Reject",
  );

  if (action === "Accept") {
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(originalCode.length),
    );

    await editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, modifiedCode);
    });

    vscode.window.showInformationMessage("✅ Changes applied");
  } else {
    vscode.window.showInformationMessage("❌ Changes rejected");
  }
}

/* ---------------- ACTIVATE ---------------- */
function activate(context) {
  // Command 1: Commit message
  const commitCommand = vscode.commands.registerCommand(
    "git-commit-helper.generateCommitMessage",
    async function () {
      vscode.window.showInformationMessage("Generating AI commit message...");

      const diff = await getGitDiff();
      if (!diff) return;

      const message = await generateAICommitMessage(diff);

      vscode.window.showInformationMessage(`Commit: ${message}`);
      await vscode.env.clipboard.writeText(message);
    },
  );

  // Command 2: AI code suggestion
  const aiSuggestionCommand = vscode.commands.registerCommand(
    "git-commit-helper.applyAISuggestion",
    async function () {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("Open a file first");
        return;
      }

      const originalCode = editor.document.getText();

      vscode.window.showInformationMessage("AI is generating suggestion...");

      const modifiedCode = await getAIUpdatedCode(originalCode);
      if (!modifiedCode) return;

      await showDiffAndHandle(editor, originalCode, modifiedCode);
    },
  );

  context.subscriptions.push(commitCommand, aiSuggestionCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
