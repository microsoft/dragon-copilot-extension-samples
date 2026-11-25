import chalk from 'chalk';

export const DEBUG_FLAGS = ['--debug', '--verbose'] as const;

/**
 * Stack traces are shown only when --debug/--verbose is passed or the DEBUG environment variable is set.
 */
export function isDebugEnabled(argv: readonly string[] = process.argv, env: NodeJS.ProcessEnv = process.env): boolean {
  const debugEnv = env.DEBUG?.trim().toLowerCase();
  const envEnabled = !!debugEnv && debugEnv !== '0' && debugEnv !== 'false';
  return envEnabled || argv.some(arg => (DEBUG_FLAGS as readonly string[]).includes(arg));
}

/**
 * Prints a CLI failure: a clean "Error: <message>" by default, plus the stack in debug mode.
 */
export function reportCliError(error: unknown, debug: boolean = isDebugEnabled()): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  if (debug && error instanceof Error && error.stack) {
    // V8 stacks start with "<name>: <message>", which was already printed above.
    const header = `${error.name}: ${error.message}`;
    const frames = error.stack.startsWith(header) ? error.stack.slice(header.length).replace(/^\n/, '') : error.stack;
    console.error(chalk.gray(frames));
  }
}
