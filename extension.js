const vscode = require("vscode");
const simpleGit = require("simple-git");
const axios = require("axios");

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
    console.error(err);
    vscode.window.showErrorMessage("Git diff failed from getGitDiff function");
    return null;
  }
}

async function generateAICommitMessage(diff) {
  try {
    const response = await axios.post("http://localhost:3000/generate-commit", {
      diff,
    });

    return response.data.message;
  } catch (error) {
    vscode.window.showErrorMessage("AI API failed");
    console.error("error ", error?.message);
    return "chore: update code";
  }
}

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "git-commit-helper.generateCommitMessage",
    async function () {
      vscode.window.showInformationMessage("Generating AI commit message...");

      const diff = await getGitDiff();
      if (!diff) return;

      const message = await generateAICommitMessage(diff);

      // Show result
      vscode.window.showInformationMessage(`Commit: ${message}`);
      // await vscode.window.showInputBox({
      //   value: message,
      //   prompt: "Edit your commit message",
      // });

      // Copy to clipboard
      await vscode.env.clipboard.writeText(message);
    },
  );

  context.subscriptions.push(disposable);
}

module.exports = { activate };
