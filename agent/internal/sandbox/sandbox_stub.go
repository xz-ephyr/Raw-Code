//go:build !windows

package sandbox

import "fmt"

type Sandbox struct{}

type Process struct {
	Handle uintptr
	Pid    uint32
}

func New(memoryLimitMB uint64, maxProcesses uint32) (*Sandbox, error) {
	return nil, fmt.Errorf("sandbox not supported on this platform")
}

func (sb *Sandbox) Launch(name string, args []string, workdir string) (*Process, error) {
	return nil, fmt.Errorf("sandbox not supported on this platform")
}

func (sb *Sandbox) AssignProcess(pid uint32) error {
	return fmt.Errorf("sandbox not supported on this platform")
}

func (sb *Sandbox) Close() error {
	return fmt.Errorf("sandbox not supported on this platform")
}
