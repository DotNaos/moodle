package moodle

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/mxschmitt/playwright-go"
)

func TestPlaywrightFreshInstallAndLaunch(t *testing.T) {
	if os.Getenv("MOODLE_PLAYWRIGHT_SMOKE") != "1" {
		t.Skip("set MOODLE_PLAYWRIGHT_SMOKE=1 to run the real driver install and browser launch")
	}

	cacheDir := t.TempDir()
	driverDir := filepath.Join(cacheDir, "driver")
	t.Setenv("PLAYWRIGHT_DRIVER_PATH", driverDir)
	t.Setenv("PLAYWRIGHT_BROWSERS_PATH", filepath.Join(cacheDir, "browsers"))

	pw, err := runPlaywrightWithAutoInstall()
	if err != nil {
		t.Fatalf("auto-install and start Playwright on %s/%s: %v", runtime.GOOS, runtime.GOARCH, err)
	}
	t.Cleanup(func() { _ = pw.Stop() })

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(true),
	})
	if err != nil {
		t.Fatalf("launch Chromium after fresh install: %v", err)
	}
	t.Cleanup(func() { _ = browser.Close() })

	page, err := browser.NewPage()
	if err != nil {
		t.Fatalf("create page: %v", err)
	}
	if err := page.SetContent("<title>Moodle Playwright smoke</title>"); err != nil {
		t.Fatalf("set local page content: %v", err)
	}
	title, err := page.Title()
	if err != nil {
		t.Fatalf("read local page title: %v", err)
	}
	if title != "Moodle Playwright smoke" {
		t.Fatalf("unexpected page title %q", title)
	}
}
