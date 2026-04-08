/**
 * Creates a mock child process that emulates the EventEmitter API
 * used by flashcard.service.ts and summary.service.ts.
 */
import { EventEmitter } from "events";

export interface MockProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: {
    write: jest.Mock;
    end: jest.Mock;
    on: jest.Mock;
  };
  kill: jest.Mock;
}

/**
 * @param stdoutData  String the process writes to stdout
 * @param exitCode    Exit code emitted with the 'close' event (default 0)
 * @param stderrData  Optional stderr output
 */
export function createMockProcess(
  stdoutData: string,
  exitCode = 0,
  stderrData = "",
): MockProcess {
  const proc = new EventEmitter() as MockProcess;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = {
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  proc.kill = jest.fn();

  // Emit data and close events asynchronously so handlers register first
  setImmediate(() => {
    if (stdoutData) proc.stdout.emit("data", Buffer.from(stdoutData));
    if (stderrData) proc.stderr.emit("data", Buffer.from(stderrData));
    proc.emit("close", exitCode);
  });

  return proc;
}
