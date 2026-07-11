package cli

import (
	"bytes"
	"strings"
	"testing"

	ver "github.com/DotNaos/moodle-services/internal/version"
)

func TestRootVersionFlag(t *testing.T) {
	var output bytes.Buffer
	rootCmd.SetArgs([]string{"--version"})
	rootCmd.SetOut(&output)
	t.Cleanup(func() {
		rootCmd.SetArgs(nil)
		rootCmd.SetOut(nil)
	})

	if _, err := rootCmd.ExecuteC(); err != nil {
		t.Fatalf("execute --version: %v", err)
	}
	if got := strings.TrimSpace(output.String()); got != ver.DefaultVersion {
		t.Fatalf("expected %q, got %q", ver.DefaultVersion, got)
	}
}
