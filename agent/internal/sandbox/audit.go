package sandbox

import (
	"encoding/json"
	"log"
	"time"
)

type Violation struct {
	Timestamp time.Time `json:"timestamp"`
	Tool      string    `json:"tool"`
	Type      string    `json:"type"`
	Detail    string    `json:"detail"`
	Project   string    `json:"project"`
}

func LogViolation(v Violation) {
	v.Timestamp = time.Now()
	data, _ := json.Marshal(v)
	log.Printf("[SANDBOX_VIOLATION] %s", string(data))
}
