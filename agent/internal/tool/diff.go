package tool

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
)

type patchHunk struct {
	oldStart  int
	oldCount  int
	newStart  int
	newCount  int
	oldString string
	newString string
}

var hunkRe = regexp.MustCompile(`^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)`)

func parseUnifiedDiff(diff string) (path string, hunks []patchHunk, err error) {
	lines := strings.Split(diff, "\n")

	if len(lines) == 0 {
		return "", nil, fmt.Errorf("empty diff")
	}

	i := 0
	for i < len(lines) && !strings.HasPrefix(lines[i], "---") {
		i++
	}
	if i >= len(lines) {
		return "", nil, fmt.Errorf("diff must start with ---")
	}
	path = extractPath(lines[i])

	i++
	if i >= len(lines) || !strings.HasPrefix(lines[i], "+++") {
		return "", nil, fmt.Errorf("diff must have +++ line after ---")
	}
	i++

	for i < len(lines) {
		for i < len(lines) && strings.TrimSpace(lines[i]) == "" {
			i++
		}
		if i >= len(lines) {
			break
		}

		match := hunkRe.FindStringSubmatch(lines[i])
		if match == nil {
			i++
			continue
		}

		var h patchHunk
		h.oldStart, _ = strconv.Atoi(match[1])
		h.oldCount, _ = strconv.Atoi(match[2])
		if match[2] == "" {
			h.oldCount = 1
		}
		h.newStart, _ = strconv.Atoi(match[3])
		h.newCount, _ = strconv.Atoi(match[4])
		if match[4] == "" {
			h.newCount = 1
		}
		i++

		var oldLines, newLines []string

		for i < len(lines) {
			line := lines[i]
			if strings.HasPrefix(line, "@@") {
				break
			}

			if line == "" {
				oldLines = append(oldLines, "")
				newLines = append(newLines, "")
				i++
				continue
			}

			prefix := line[0]
			content := ""
			if len(line) > 1 {
				content = line[1:]
			}

			switch prefix {
			case ' ':
				oldLines = append(oldLines, content)
				newLines = append(newLines, content)
			case '-':
				oldLines = append(oldLines, content)
			case '+':
				newLines = append(newLines, content)
			}
			i++
		}

		h.oldString = strings.Join(oldLines, "\n")
		h.newString = strings.Join(newLines, "\n")
		hunks = append(hunks, h)
	}

	if len(hunks) == 0 {
		return "", nil, fmt.Errorf("no hunks found in diff")
	}

	return path, hunks, nil
}

func extractPath(header string) string {
	trimmed := strings.TrimPrefix(header, "---")
	trimmed = strings.TrimSpace(trimmed)
	if strings.HasPrefix(trimmed, "a/") || strings.HasPrefix(trimmed, "b/") {
		trimmed = trimmed[2:]
	}
	return trimmed
}

func applyDiff(e *Executor, path, patchContent string) (any, error) {
	safePath, err := e.SandboxPath(path)
	if err != nil {
		return nil, err
	}
	path = safePath

	if IsRestrictedPath(path) {
		e.LogViolation("edit_file", "restricted_file", path)
		return nil, fmt.Errorf("cannot edit restricted file (may contain secrets): %s", path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	content := string(data)

	_, hunks, err := parseUnifiedDiff(patchContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse diff: %w", err)
	}

	applied := 0
	for i := len(hunks) - 1; i >= 0; i-- {
		h := hunks[i]
		if h.oldString == "" {
			continue
		}
		count := strings.Count(content, h.oldString)
		if count == 0 {
			return nil, fmt.Errorf("diff hunk %d not found in file", i+1)
		}
		content = strings.Replace(content, h.oldString, h.newString, 1)
		applied++
	}

	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return nil, fmt.Errorf("failed to write patched file: %w", err)
	}

	return map[string]any{
		"path":    path,
		"hunks":   applied,
		"total":   len(hunks),
		"status":  "patched",
	}, nil
}
