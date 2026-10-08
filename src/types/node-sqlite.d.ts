/**
 * @types/node@20 todavía no declara node:sqlite (estable en Node 22.5+).
 * Declaración mínima con la superficie que usamos en memory.ts.
 * Si actualizás a @types/node@22+, podés borrar este archivo.
 */
declare module "node:sqlite" {
  type SQLValue = string | number | bigint | null | Uint8Array;

  interface StatementSync {
    run(...params: SQLValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: SQLValue[]): unknown;
    all(...params: SQLValue[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
