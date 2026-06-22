package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/DotNaos/moodle-services/internal/moodle"
	contract "github.com/DotNaos/moodle-services/pkg/apicontracts"
	"github.com/DotNaos/moodle-services/pkg/studypipeline"
)

type readinessReport struct {
	Summary struct {
		TotalSheets int `json:"totalSheets"`
		Ready       int `json:"ready"`
		Unprocessed int `json:"unprocessed"`
	} `json:"summary"`
	Sheets []readinessSheet `json:"sheets"`
}

type readinessSheet struct {
	ResourceID               string   `json:"resourceId"`
	Verdict                  string   `json:"verdict"`
	Readiness                string   `json:"readiness"`
	ReadOnly                 bool     `json:"readOnly"`
	ContentStatus            string   `json:"contentStatus"`
	RenderedPageCount        int      `json:"renderedPageCount"`
	PagePreviewAssetCount    int      `json:"pagePreviewAssetCount"`
	ExtractedImageAssetCount int      `json:"extractedImageAssetCount"`
	SourcePath               string   `json:"sourcePath"`
	Problems                 []string `json:"problems"`
}

type evidence struct {
	ArtifactRoot    string         `json:"artifactRoot"`
	CourseID        string         `json:"courseId"`
	GeneratedAt     string         `json:"generatedAt"`
	PromotedSheet   promotedSheet  `json:"promotedSheet"`
	ReadinessReport string         `json:"readinessReport,omitempty"`
	ResourceSource  string         `json:"resourceSource"`
	Source          string         `json:"source"`
	Summary         evidenceCounts `json:"summary"`
}

type evidenceCounts struct {
	ReadinessReportReady       int `json:"readinessReportReady,omitempty"`
	ReadinessReportSheets      int `json:"readinessReportSheets,omitempty"`
	ReadinessReportUnprocessed int `json:"readinessReportUnprocessed,omitempty"`
	TaskViewReady              int `json:"taskViewReady"`
	TaskViewSheets             int `json:"taskViewSheets"`
	TaskViewUnprocessed        int `json:"taskViewUnprocessed"`
}

type promotedSheet struct {
	ReadinessReport *readinessSheet       `json:"readinessReport,omitempty"`
	ResourceID      string                `json:"resourceId"`
	TaskView        promotedTaskViewState `json:"taskView"`
	Title           string                `json:"title"`
}

type promotedTaskViewState struct {
	ContentSourcePath            string `json:"contentSourcePath"`
	ContentStatus                string `json:"contentStatus"`
	PromptHasExtractedAssetImage bool   `json:"promptHasExtractedAssetImage"`
	PromptHasMoodleSource        bool   `json:"promptHasMoodleSource"`
	PromptHasPlaceholder         bool   `json:"promptHasPlaceholder"`
	ReadOnly                     bool   `json:"readOnly"`
	Readiness                    string `json:"readiness"`
	SolutionResourceID           string `json:"solutionResourceId,omitempty"`
	TaskCount                    int    `json:"taskCount"`
}

func main() {
	var courseID string
	var artifactRoot string
	var resourceID string
	var resourcesFile string
	var readinessFile string
	var outputFile string
	var requireReady bool

	flag.StringVar(&courseID, "course", "", "Moodle course ID")
	flag.StringVar(&artifactRoot, "artifact-root", studypipeline.ArtifactRootFromEnv(), "Study pipeline artifact root")
	flag.StringVar(&resourceID, "resource", "", "Task sheet resource ID to verify")
	flag.StringVar(&resourcesFile, "resources", "", "Course resources JSON. Defaults to <artifact-root>/courses/<course>/raw/resources.json")
	flag.StringVar(&readinessFile, "readiness-report", "", "Optional readiness report JSON to cross-check")
	flag.StringVar(&outputFile, "output", "", "Write evidence JSON to this file")
	flag.BoolVar(&requireReady, "require-ready", true, "Exit non-zero unless the target sheet satisfies the ready evidence gate")
	flag.Parse()

	if strings.TrimSpace(courseID) == "" {
		fatal(errors.New("--course is required"), 1)
	}
	if strings.TrimSpace(resourceID) == "" {
		fatal(errors.New("--resource is required"), 1)
	}

	root := expandHome(artifactRoot)
	if resourcesFile == "" {
		resourcesFile = filepath.Join(root, "courses", safeSegment(courseID), "raw", "resources.json")
	}
	resourcesFile = expandHome(resourcesFile)

	resources, err := readResources(resourcesFile)
	if err != nil {
		fatal(err, 1)
	}
	view, err := studypipeline.LoadTaskView(courseID, resources, false, studypipeline.RunOptions{Root: root})
	if err != nil {
		fatal(err, 1)
	}

	var report *readinessReport
	if strings.TrimSpace(readinessFile) != "" {
		loaded, err := readReadiness(expandHome(readinessFile))
		if err != nil {
			fatal(err, 1)
		}
		report = &loaded
	}

	result, err := buildEvidence(root, courseID, resourcesFile, readinessFile, resourceID, view, report)
	if err != nil {
		fatal(err, 1)
	}
	if err := writeEvidence(outputFile, result); err != nil {
		fatal(err, 1)
	}
	if requireReady {
		if problems := validateReadyEvidence(result.PromotedSheet); len(problems) > 0 {
			fatal(fmt.Errorf("ready evidence failed for %s: %s", resourceID, strings.Join(problems, "; ")), 2)
		}
	}
}

func buildEvidence(root string, courseID string, resourcesFile string, readinessFile string, resourceID string, view contract.StudyPipelineTaskViewResponse, report *readinessReport) (evidence, error) {
	var target *contract.StudyPipelineTaskSheet
	counts := evidenceCounts{TaskViewSheets: len(view.Sheets)}
	for index := range view.Sheets {
		sheet := &view.Sheets[index]
		switch sheet.Readiness {
		case "ready":
			counts.TaskViewReady++
		case "unprocessed":
			counts.TaskViewUnprocessed++
		}
		if sheet.ResourceID == resourceID {
			target = sheet
		}
	}
	if target == nil {
		return evidence{}, fmt.Errorf("target sheet %s missing from task view", resourceID)
	}

	var reportSheet *readinessSheet
	if report != nil {
		counts.ReadinessReportSheets = report.Summary.TotalSheets
		counts.ReadinessReportReady = report.Summary.Ready
		counts.ReadinessReportUnprocessed = report.Summary.Unprocessed
		for index := range report.Sheets {
			if report.Sheets[index].ResourceID == resourceID {
				reportSheet = &report.Sheets[index]
				break
			}
		}
	}

	prompt := ""
	if len(target.Tasks) > 0 {
		prompt = target.Tasks[0].PromptMarkdown
	}
	return evidence{
		ArtifactRoot:    root,
		CourseID:        courseID,
		GeneratedAt:     view.GeneratedAt,
		ReadinessReport: displayPath(readinessFile),
		ResourceSource:  resourcesFile,
		Source:          "studypipeline.LoadTaskView local smoke",
		Summary:         counts,
		PromotedSheet: promotedSheet{
			ReadinessReport: reportSheet,
			ResourceID:      target.ResourceID,
			Title:           target.Title,
			TaskView: promotedTaskViewState{
				ContentSourcePath:            target.ContentState.SourcePath,
				ContentStatus:                target.ContentState.Status,
				PromptHasExtractedAssetImage: strings.Contains(prompt, "/extracted-asset?"),
				PromptHasMoodleSource:        strings.Contains(prompt, "moodle-resource:"+resourceID),
				PromptHasPlaceholder:         strings.Contains(prompt, "Only machine-extracted content is available") || strings.Contains(prompt, "Run Codex curation before using this sheet"),
				ReadOnly:                     target.ReadOnly,
				Readiness:                    target.Readiness,
				SolutionResourceID:           target.SolutionResourceID,
				TaskCount:                    len(target.Tasks),
			},
		},
	}, nil
}

func validateReadyEvidence(sheet promotedSheet) []string {
	problems := []string{}
	if sheet.TaskView.Readiness != "ready" {
		problems = append(problems, "task-view readiness is not ready")
	}
	if sheet.TaskView.ReadOnly {
		problems = append(problems, "task-view is still read-only")
	}
	if sheet.TaskView.ContentStatus != "codex-improved" {
		problems = append(problems, "content status is not codex-improved")
	}
	if !sheet.TaskView.PromptHasMoodleSource {
		problems = append(problems, "prompt does not preserve Moodle source reference")
	}
	if sheet.TaskView.PromptHasPlaceholder {
		problems = append(problems, "prompt still contains unprocessed placeholder text")
	}
	if sheet.ReadinessReport != nil {
		if sheet.ReadinessReport.Verdict != "ready" {
			problems = append(problems, "readiness report verdict is not ready")
		}
		if sheet.ReadinessReport.ExtractedImageAssetCount > 0 && !sheet.TaskView.PromptHasExtractedAssetImage {
			problems = append(problems, "extracted images exist but task-view prompt has no extracted asset image")
		}
	}
	return problems
}

func readResources(filePath string) ([]moodle.Resource, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var resources []moodle.Resource
	if err := json.Unmarshal(content, &resources); err != nil {
		return nil, err
	}
	return resources, nil
}

func readReadiness(filePath string) (readinessReport, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return readinessReport{}, err
	}
	var report readinessReport
	if err := json.Unmarshal(content, &report); err != nil {
		return readinessReport{}, err
	}
	return report, nil
}

func writeEvidence(outputFile string, result evidence) error {
	encoded, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')
	if strings.TrimSpace(outputFile) == "" {
		_, err = os.Stdout.Write(encoded)
		return err
	}
	outputFile = expandHome(outputFile)
	if err := os.MkdirAll(filepath.Dir(outputFile), 0o755); err != nil {
		return err
	}
	return os.WriteFile(outputFile, encoded, 0o644)
}

func fatal(err error, code int) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(code)
}

func expandHome(value string) string {
	if value == "~" {
		if home, err := os.UserHomeDir(); err == nil {
			return home
		}
	}
	if strings.HasPrefix(value, "~/") {
		if home, err := os.UserHomeDir(); err == nil {
			return filepath.Join(home, value[2:])
		}
	}
	return value
}

func displayPath(value string) string {
	value = filepath.ToSlash(value)
	if index := strings.Index(value, "plans/"); index >= 0 {
		return value[index:]
	}
	return value
}

func safeSegment(value string) string {
	replacer := strings.NewReplacer("ä", "ae", "ö", "oe", "ü", "ue", "Ä", "ae", "Ö", "oe", "Ü", "ue", "ß", "ss")
	value = strings.ToLower(replacer.Replace(strings.TrimSpace(value)))
	var builder strings.Builder
	lastDash := false
	for _, item := range value {
		allowed := item >= 'a' && item <= 'z' || item >= '0' && item <= '9' || item == '.' || item == '_' || item == '-'
		if allowed {
			builder.WriteRune(item)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}
