/**
 * The risk tag of a test: a JSDoc comment with `@risk impact=<1-5> likelihood=<1-3>` directly
 * above each test call that no other test call holds. docs/checks.md gives the levels.
 */
export const riskTag = /@risk impact=(?<impact>[1-5]) likelihood=(?<likelihood>[1-3])(?!\d)/u;

/** The functions of node:test that declare a test or a group of tests. */
export const testFunctions = new Set(["describe", "it", "suite", "test"]);
