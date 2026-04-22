// Exercises the TS test-suite loader. defineTestSuite is an identity
// helper; the real power is that YAML-hostile things (closures, imports,
// dynamic data) work here.
//
// Outside this repo, the `'promptforge'` import requires the package to
// be installed locally (`npm install --save-dev promptforge`) — a global
// CLI install alone can't resolve this specifier. If you only have the
// global CLI, drop the import and `export default { ... }` as a plain
// object instead.
import { defineTestSuite } from 'promptforge';

const namesToGreet = ['Alice', 'Bob', 'Carol'];

export default defineTestSuite({
  prompt: './greet.md',
  providers: ['mock'],
  tests: namesToGreet.map((name) => ({
    name: `greets ${name} via custom assertion`,
    vars: { name },
    mockOutput: `Hello, ${name}! So glad to meet you.`,
    assert: [
      // Simple boolean return.
      {
        type: 'custom',
        fn: (output: string) => output.length > 10,
      },
      // Structured return with a message that surfaces on failure.
      {
        type: 'custom',
        fn: async (output: string) => ({
          passed: output.toLowerCase().includes(name.toLowerCase()),
          message: `expected output to address "${name}"`,
        }),
      },
    ],
  })),
});
