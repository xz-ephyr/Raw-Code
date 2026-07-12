package model

import "strings"

type ParserMode int

const (
	ModeText ParserMode = iota
	ModeReasoning
)

type ParsedEvent struct {
	Type  string
	Delta string
}

type TaggedReasoningParser struct {
	mode     ParserMode
	buffer   string
	openTag  string
	closeTag string
}

func NewTaggedReasoningParser(openTag, closeTag string) *TaggedReasoningParser {
	return &TaggedReasoningParser{
		mode:     ModeText,
		openTag:  openTag,
		closeTag: closeTag,
	}
}

func (p *TaggedReasoningParser) Push(delta string) []ParsedEvent {
	if delta == "" {
		return nil
	}

	p.buffer += delta
	var events []ParsedEvent

	for len(p.buffer) > 0 {
		if p.mode == ModeText {
			tagIdx := strings.Index(p.buffer, p.openTag)
			if tagIdx == -1 {
				events = append(events, ParsedEvent{Type: "text", Delta: p.buffer})
				p.buffer = ""
				break
			}

			if tagIdx > 0 {
				events = append(events, ParsedEvent{Type: "text", Delta: p.buffer[:tagIdx]})
			}

			p.buffer = p.buffer[tagIdx+len(p.openTag):]
			p.mode = ModeReasoning
		}

		if p.mode == ModeReasoning {
			closeIdx := strings.Index(p.buffer, p.closeTag)
			if closeIdx == -1 {
				events = append(events, ParsedEvent{Type: "reasoning", Delta: p.buffer})
				p.buffer = ""
				break
			}

			content := p.buffer[:closeIdx]
			if content != "" {
				events = append(events, ParsedEvent{Type: "reasoning", Delta: content})
			}

			p.buffer = p.buffer[closeIdx+len(p.closeTag):]
			p.mode = ModeText
		}
	}

	return events
}

func (p *TaggedReasoningParser) Flush() []ParsedEvent {
	if p.buffer == "" {
		return nil
	}
	ev := ParsedEvent{Type: "text", Delta: p.buffer}
	if p.mode == ModeReasoning {
		ev.Type = "reasoning"
	}
	p.buffer = ""
	return []ParsedEvent{ev}
}

func (p *TaggedReasoningParser) Reset() {
	p.mode = ModeText
	p.buffer = ""
}
