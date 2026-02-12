/**
 * Detect whether stdout is a TTY (interactive terminal).
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Write output to stdout, optionally as JSON.
 */
export function writeOutput(data: unknown, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else if (typeof data === "string") {
    process.stdout.write(data.endsWith("\n") ? data : data + "\n");
  } else {
    process.stdout.write(String(data) + "\n");
  }
}

/**
 * Write an error message to stderr.
 */
export function writeError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}
