//go:build windows

package sandbox

import (
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

type Sandbox struct {
	job           windows.Handle
	memoryLimitMB uint64
	maxProcesses  uint32
}

type Process struct {
	Handle windows.Handle
	Pid    uint32
}

const (
	jobObjectLimitKillOnJobClose = 0x2000
	jobObjectLimitProcessMemory  = 0x100
	jobObjectLimitActiveProcess  = 0x8
	jobObjectInfoClassExtended   = 9
)

type jobObjectExtendedLimitInfo struct {
	BasicLimitInformation basicLimitInformation
	IoInfo                ioCounters
	ProcessMemoryLimit    uintptr
	JobMemoryLimit        uintptr
	PeakProcessMemoryUsed uintptr
	PeakJobMemoryUsed     uintptr
}

type basicLimitInformation struct {
	PerProcessUserTimeLimit int64
	PerJobUserTimeLimit     int64
	LimitFlags              uint32
	MinimumWorkingSetSize   uintptr
	MaximumWorkingSetSize   uintptr
	ActiveProcessLimit      uint32
	Affinity                uintptr
	ChildProcessRate        uint32
	ExtendedFlags           uint16
}

type ioCounters struct {
	ReadOperationCount  uint64
	WriteOperationCount uint64
	OtherOperationCount uint64
	ReadTransferCount   uint64
	WriteTransferCount  uint64
	OtherTransferCount  uint64
}

func New(memoryLimitMB uint64, maxProcesses uint32) (*Sandbox, error) {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return nil, fmt.Errorf("CreateJobObject: %w", err)
	}

	sb := &Sandbox{
		job:           job,
		memoryLimitMB: memoryLimitMB,
		maxProcesses:  maxProcesses,
	}

	if err := sb.setLimits(); err != nil {
		windows.CloseHandle(job)
		return nil, fmt.Errorf("set limits: %w", err)
	}

	return sb, nil
}

func (sb *Sandbox) setLimits() error {
	var info jobObjectExtendedLimitInfo

	info.BasicLimitInformation.LimitFlags =
		jobObjectLimitKillOnJobClose |
			jobObjectLimitProcessMemory |
			jobObjectLimitActiveProcess

	info.BasicLimitInformation.ActiveProcessLimit = sb.maxProcesses

	if sb.memoryLimitMB > 0 {
		info.ProcessMemoryLimit = uintptr(sb.memoryLimitMB * 1024 * 1024)
	}

	_, err := windows.SetInformationJobObject(
		sb.job,
		jobObjectInfoClassExtended,
		uintptr(unsafe.Pointer(&info)),
		uint32(unsafe.Sizeof(info)),
	)
	if err != nil {
		return fmt.Errorf("SetInformationJobObject: %w", err)
	}

	return nil
}

func (sb *Sandbox) Launch(name string, args []string, workdir string) (*Process, error) {
	return sb.createProcess(name, args, workdir, windows.Token(0))
}

func (sb *Sandbox) createProcess(name string, args []string, workdir string, token windows.Token) (*Process, error) {
	appPtr, err := windows.UTF16PtrFromString(name)
	if err != nil {
		return nil, fmt.Errorf("UTF16PtrFromString app: %w", err)
	}

	cmdLine := name
	for _, a := range args {
		cmdLine += " " + a
	}
	cmdPtr, err := windows.UTF16PtrFromString(cmdLine)
	if err != nil {
		return nil, fmt.Errorf("UTF16PtrFromString cmd: %w", err)
	}

	si := &windows.StartupInfo{
		Cb: uint32(unsafe.Sizeof(windows.StartupInfo{})),
	}
	pi := &windows.ProcessInformation{}

	var flags uint32 = windows.CREATE_SUSPENDED | windows.CREATE_UNICODE_ENVIRONMENT | windows.CREATE_NEW_CONSOLE

	var currentDir *uint16
	if workdir != "" {
		currentDir, err = windows.UTF16PtrFromString(workdir)
		if err != nil {
			return nil, fmt.Errorf("UTF16PtrFromString workdir: %w", err)
		}
	}

	if token != 0 {
		err = windows.CreateProcessAsUser(
			token,
			appPtr,
			cmdPtr,
			nil,
			nil,
			false,
			flags,
			nil,
			currentDir,
			si,
			pi,
		)
	} else {
		err = windows.CreateProcess(
			appPtr,
			cmdPtr,
			nil,
			nil,
			false,
			flags,
			nil,
			currentDir,
			si,
			pi,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("CreateProcess: %w", err)
	}

	err = windows.AssignProcessToJobObject(sb.job, pi.Process)
	if err != nil {
		windows.TerminateProcess(pi.Process, 1)
		windows.CloseHandle(pi.Process)
		windows.CloseHandle(pi.Thread)
		return nil, fmt.Errorf("AssignProcessToJobObject: %w", err)
	}

	_, err = windows.ResumeThread(pi.Thread)
	if err != nil {
		windows.TerminateProcess(pi.Process, 1)
		windows.CloseHandle(pi.Process)
		windows.CloseHandle(pi.Thread)
		return nil, fmt.Errorf("ResumeThread: %w", err)
	}

	windows.CloseHandle(pi.Thread)

	return &Process{
		Handle: pi.Process,
		Pid:    pi.ProcessId,
	}, nil
}

func (sb *Sandbox) AssignProcess(pid uint32) error {
	handle, err := windows.OpenProcess(
		windows.PROCESS_SET_QUOTA|windows.PROCESS_SET_INFORMATION|windows.PROCESS_TERMINATE,
		false,
		pid,
	)
	if err != nil {
		return fmt.Errorf("OpenProcess(%d): %w", pid, err)
	}
	defer windows.CloseHandle(handle)

	return windows.AssignProcessToJobObject(sb.job, handle)
}

func (sb *Sandbox) Close() error {
	if sb.job != 0 {
		return windows.CloseHandle(sb.job)
	}
	return nil
}
