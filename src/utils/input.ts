import { readFile } from "node:fs/promises";

/**
 * Read XML input from a file path or stdin.
 */
export async function readInput(filePath?: string): Promise<string> {
  if (filePath) {
    return readFile(filePath, "utf-8");
  }

  // Read from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
