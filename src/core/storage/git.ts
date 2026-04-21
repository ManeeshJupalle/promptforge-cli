import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

// Non-throwing: if the command fails (no git installed, not a repo, permission
// error, etc.), returns null. The run row just records git_commit = NULL.
export async function detectGitCommit(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP('git', ['rev-parse', 'HEAD'], {
      cwd,
      timeout: 2000,
    });
    const commit = stdout.trim();
    return /^[0-9a-f]{40}$/.test(commit) ? commit : null;
  } catch {
    return null;
  }
}
