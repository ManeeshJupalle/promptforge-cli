# Charm/vhs recording tape. Produces docs/images/demo.gif deterministically.
#   https://github.com/charmbracelet/vhs
#
# Install vhs: `brew install vhs`  (or `go install github.com/charmbracelet/vhs@latest`)
# Record:     `vhs scripts/demo.tape`
#
# Target: ~15 seconds, crisp pixels. The scene shows a failing assertion
# because failures are why PromptForge exists — tests that only show
# green are marketing, not demos.

Output docs/images/demo.gif

Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 1100
Set Height 640
Set Theme "Builtin Dark"
Set TypingSpeed 35ms
Set Padding 18
Set LoopOffset 30%

# Start in a clean temp project so viewers see a realistic first-run.
Hide
Type "cd /tmp/pf-demo && rm -rf .promptforge prompts promptforge.config.ts && promptforge init --no-open < /dev/null || true" Enter
Sleep 500ms
Show

# Scene 1: show the test file
Type "cat prompts/hello.test.yaml" Enter
Sleep 2s

# Scene 2: first run — clean pass
Type "promptforge run" Enter
Sleep 3s

# Scene 3: break the prompt to simulate a regression
Hide
Type "sed -i 's/Welcome aboard/Goodbye forever/' prompts/hello.test.yaml" Enter
Sleep 200ms
Show

Type "promptforge run" Enter
Sleep 4s

# Scene 4: compare shows the regression
Type "promptforge compare previous latest" Enter
Sleep 3s
