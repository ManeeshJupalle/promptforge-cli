// Exercises the Day-4 TS config loader. defineTestSuite is an identity
// helper; the real power is that YAML-hostile things (closures, imports,
// dynamic data) work here.
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
