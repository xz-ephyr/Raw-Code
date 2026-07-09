package agent

import (
	"fmt"
	"log"
	"strings"
	"time"
)

type LogLevel int

const (
	LogDebug LogLevel = iota
	LogInfo
	LogWarn
	LogError
)

func (l LogLevel) String() string {
	switch l {
	case LogDebug:
		return "DEBUG"
	case LogInfo:
		return "INFO"
	case LogWarn:
		return "WARN"
	case LogError:
		return "ERROR"
	default:
		return "LOG"
	}
}

type LogEvent struct {
	Level   LogLevel
	Time    time.Time
	Message string
	Fields  map[string]any
}

type LogFn func(level LogLevel, msg string, fields map[string]any)

func DefaultLogFn(level LogLevel, msg string, fields map[string]any) {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("[%s] %s", level, msg))
	if len(fields) > 0 {
		b.WriteString(" {")
		first := true
		for k, v := range fields {
			if !first {
				b.WriteString(", ")
			}
			b.WriteString(fmt.Sprintf("%s=%v", k, v))
			first = false
		}
		b.WriteString("}")
	}
	if level >= LogWarn {
		log.Println(b.String())
	}
}

func logEvent(fn LogFn, level LogLevel, msg string, fields map[string]any) {
	if fn != nil {
		fn(level, msg, fields)
	} else if level >= LogInfo {
		DefaultLogFn(level, msg, fields)
	}
}
