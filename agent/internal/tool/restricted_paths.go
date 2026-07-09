package tool

import (
	"os"
	"path/filepath"
	"strings"
)

var restrictedFileNames = []string{
	".env",
	".env.local",
	".env.production",
	".env.development",
	".env.staging",
}

var restrictedFileSuffixes = []string{
	"_rsa",
	"_dsa",
	"_ecdsa",
	"_ed25519",
	".pem",
	".key",
	".p12",
	".pfx",
	".cert",
	".crt",
	".der",
}

func IsRestrictedPath(path string) bool {
	name := filepath.Base(path)

	// Block all hidden files (dotfiles) unless explicitly allowed via env var
	if strings.HasPrefix(name, ".") && os.Getenv("RAW_CODE_ALLOW_DOTFILES") != "1" {
		return true
	}

	lower := strings.ToLower(name)
	for _, pattern := range restrictedFileNames {
		if matched, _ := filepath.Match(pattern, lower); matched {
			return true
		}
	}
	for _, suffix := range restrictedFileSuffixes {
		if strings.HasSuffix(lower, suffix) {
			return true
		}
	}
	return false
}
