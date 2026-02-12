import { vi } from "vitest";

interface CapturedOutput {
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}

export function captureOutput() {
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stdout += String(chunk);
      return true;
    });

  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    });

  const exitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation((code?: string | number | null | undefined) => {
      exitCode = typeof code === "number" ? code : code ? Number(code) : 0;
      throw new Error(`process.exit(${exitCode})`);
    });

  function getOutput(): CapturedOutput {
    return { stdout, stderr, exitCode };
  }

  function restore() {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { getOutput, restore };
}
