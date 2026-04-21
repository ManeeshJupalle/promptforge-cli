import chalk from 'chalk';

export interface UiOptions {
  port?: string;
  open?: boolean;
}

export async function uiCommand(options: UiOptions): Promise<number> {
  const projectRoot = process.cwd();
  const port = parseInt(options.port ?? '3939', 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    console.error(chalk.red(`Invalid port: ${options.port}`));
    return 1;
  }

  // Hono + server are dynamic-imported inside startServer so non-ui commands
  // never load them. We still import *this* function eagerly from the CLI
  // entry, but that's just a tiny wrapper.
  const { startServer } = await import('../../dashboard/server.js');

  let running;
  try {
    running = await startServer({ projectRoot, port });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if (msg.includes('EADDRINUSE')) {
      console.error(chalk.red(`Port ${port} is already in use.`));
      console.error(chalk.dim(`Try \`promptforge ui --port ${port + 1}\``));
    } else {
      console.error(chalk.red(msg));
    }
    return 1;
  }

  console.log();
  console.log(chalk.bold('🧪 PromptForge dashboard'));
  console.log(`   ${chalk.cyan(running.url)}`);
  console.log(chalk.dim(`   reading .promptforge/db.sqlite at ${projectRoot}`));
  console.log(chalk.dim('   press Ctrl-C to stop'));
  console.log();

  if (options.open !== false) {
    try {
      const mod = await import('open');
      await mod.default(running.url);
    } catch {
      // Browser auto-open is nice-to-have — headless users can ignore this.
    }
  }

  // Register a SIGINT handler so Ctrl-C closes the server, closes the DB,
  // and lets Node drain naturally (no process.exit — matches the Day 3+
  // UV_HANDLE_CLOSING avoidance).
  await new Promise<void>((resolve) => {
    const onSignal = async (sig: NodeJS.Signals) => {
      console.log(chalk.dim(`\nshutting down (${sig})...`));
      try {
        await running.shutdown();
      } catch {
        // Swallow — we're exiting anyway.
      }
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      resolve();
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
  });

  return 0;
}
