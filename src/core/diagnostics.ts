import type { Diagnostic } from "./types.ts";
export class DiagnosticError extends Error {
  readonly diagnostic: Diagnostic;
  constructor(diagnostic: Diagnostic) {
    super(
      `${diagnostic.source}${diagnostic.line === undefined ? "" : `:${diagnostic.line}`}: ${diagnostic.message}`,
    );
    this.diagnostic = diagnostic;
  }
}
