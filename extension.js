const vscode = require("vscode");
const simpleGit = require("simple-git");

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

function generateMessage(diff) {
  if (!diff) return "No changes detected";

  if (diff.includes("fix") || diff.includes("bug")) {
    return "fix: resolve bug issues";
  }
  if (diff.includes("add") || diff.includes("new")) {
    return "feat: add new feature";
  }
  if (diff.includes("remove")) {
    return "chore: remove unused code";
  }

  return "chore: update codebase";
}

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "git-commit-helper.generateCommitMessage",
    async function () {
      const diff = await getGitDiff();

      if (!diff) return;

      const message = generateMessage(diff);

      // Show message
      vscode.window.showInformationMessage(`Commit: ${message}`);

      // Copy to clipboard
      await vscode.env.clipboard.writeText(message);
    },
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
