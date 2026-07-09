//go:build windows

package sandbox

import (
	"syscall"
	"testing"
	"unsafe"

	"golang.org/x/sys/windows"
)

var cmdExe = "C:\\Windows\\System32\\cmd.exe"

func TestNewSandbox(t *testing.T) {
	sb, err := New(128, 10)
	if err != nil {
		t.Fatalf("New(128, 10) failed: %v", err)
	}
	defer sb.Close()

	if sb.job == 0 {
		t.Fatal("job handle is zero")
	}
}

func TestLaunchCmd(t *testing.T) {
	sb, err := New(128, 10)
	if err != nil {
		t.Fatalf("New failed: %v", err)
	}
	defer sb.Close()

	proc, err := sb.Launch(cmdExe, []string{"/c", "echo", "sandbox_test"}, "")
	if err != nil {
		t.Fatalf("Launch failed: %v", err)
	}

	if proc.Handle == 0 {
		t.Fatal("process handle is zero")
	}

	if proc.Pid == 0 {
		t.Fatal("process pid is zero")
	}

	syscall.WaitForSingleObject(syscall.Handle(proc.Handle), syscall.INFINITE)
	windows.CloseHandle(proc.Handle)

	t.Logf("Launched process with PID %d", proc.Pid)
}

func TestKillOnClose(t *testing.T) {
	sb, err := New(128, 10)
	if err != nil {
		t.Fatalf("New failed: %v", err)
	}

	proc, err := sb.Launch(cmdExe, []string{"/c", "ping", "-n", "30", "127.0.0.1"}, "")
	if err != nil {
		t.Fatalf("Launch failed: %v", err)
	}

	sb.Close()

	rc, err := syscall.WaitForSingleObject(syscall.Handle(proc.Handle), 5000)
	if err != nil {
		t.Fatalf("WaitForSingleObject failed: %v", err)
	}
	if rc != syscall.WAIT_OBJECT_0 {
		t.Fatal("process was not killed after sandbox close")
	}

	windows.CloseHandle(proc.Handle)
}

func TestMaxProcesses(t *testing.T) {
	sb, err := New(128, 1)
	if err != nil {
		t.Fatalf("New failed: %v", err)
	}
	defer sb.Close()

	proc1, err := sb.Launch(cmdExe, []string{"/c", "ping", "-n", "10", "127.0.0.1"}, "")
	if err != nil {
		t.Fatalf("First Launch failed: %v", err)
	}
	defer windows.CloseHandle(proc1.Handle)

	proc2, err := sb.Launch(cmdExe, []string{"/c", "echo", "should_fail"}, "")
	if err == nil {
		windows.CloseHandle(proc2.Handle)
		t.Fatal("expected second launch to fail due to max process limit")
	}

	t.Logf("Second launch correctly failed: %v", err)
}

func TestRestrictedToken(t *testing.T) {
	sb, err := New(128, 10)
	if err != nil {
		t.Fatalf("New failed: %v", err)
	}
	defer sb.Close()

	proc, err := sb.LaunchRestricted(
		cmdExe,
		[]string{"/c", "echo", "restricted_test"},
		"",
		WithLowIntegrity(),
	)
	if err != nil {
		t.Fatalf("LaunchRestricted failed: %v", err)
	}

	if proc.Handle == 0 {
		t.Fatal("process handle is zero")
	}

	syscall.WaitForSingleObject(syscall.Handle(proc.Handle), syscall.INFINITE)
	windows.CloseHandle(proc.Handle)

	t.Logf("Restricted process ran successfully with PID %d", proc.Pid)
}

func TestMemoryLimit(t *testing.T) {
	sb, err := New(1, 10)
	if err != nil {
		t.Fatalf("New failed: %v", err)
	}
	defer sb.Close()

	cmdLine, _ := windows.UTF16PtrFromString(cmdExe + " /c echo memory_test")
	appName, _ := windows.UTF16PtrFromString(cmdExe)
	si := &windows.StartupInfo{
		Cb: uint32(unsafe.Sizeof(windows.StartupInfo{})),
	}
	pi := &windows.ProcessInformation{}

	err = windows.CreateProcess(
		appName,
		cmdLine,
		nil,
		nil,
		false,
		windows.CREATE_SUSPENDED|windows.CREATE_NEW_CONSOLE|windows.CREATE_UNICODE_ENVIRONMENT,
		nil,
		nil,
		si,
		pi,
	)
	if err != nil {
		t.Fatalf("CreateProcess: %v", err)
	}
	defer windows.CloseHandle(pi.Process)
	defer windows.CloseHandle(pi.Thread)

	err = windows.AssignProcessToJobObject(sb.job, pi.Process)
	if err != nil {
		t.Fatalf("AssignProcessToJobObject: %v", err)
	}

	windows.ResumeThread(pi.Thread)

	syscall.WaitForSingleObject(syscall.Handle(pi.Process), 5000)

	var exitCode uint32
	err = windows.GetExitCodeProcess(pi.Process, &exitCode)
	if err != nil {
		t.Fatalf("GetExitCodeProcess: %v", err)
	}
	t.Logf("Memory-limited process exited with code %d", exitCode)
}
