//go:build windows

package sandbox

import (
	"fmt"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

const tokenIntegrityLevel = 25

type sidAndAttributes struct {
	Sid        *windows.SID
	Attributes uint32
}

type tokenMandatoryLabel struct {
	Label sidAndAttributes
}

func setLowIntegrity(token windows.Token) error {
	labelSid, err := windows.CreateWellKnownSid(windows.WinLowLabelSid)
	if err != nil {
		return fmt.Errorf("CreateWellKnownSid LowLabel: %w", err)
	}

	label := tokenMandatoryLabel{
		Label: sidAndAttributes{
			Sid:        labelSid,
			Attributes: 0x20,
		},
	}

	err = windows.SetTokenInformation(
		token,
		tokenIntegrityLevel,
		(*byte)(unsafe.Pointer(&label)),
		uint32(unsafe.Sizeof(label)),
	)
	if err != nil {
		return fmt.Errorf("SetTokenInformation LowIntegrity: %w", err)
	}

	return nil
}

type Option func(*config)

type config struct {
	lowIntegrity bool
}

func WithLowIntegrity() Option {
	return func(c *config) {
		c.lowIntegrity = true
	}
}

func (sb *Sandbox) LaunchRestricted(name string, args []string, workdir string, opts ...Option) (*Process, error) {
	cfg := &config{}
	for _, opt := range opts {
		opt(cfg)
	}

	var token windows.Token
	if cfg.lowIntegrity {
		var currentToken windows.Token
		curProc, _ := syscall.GetCurrentProcess()
		err := windows.OpenProcessToken(
			windows.Handle(curProc),
			windows.TOKEN_DUPLICATE|windows.TOKEN_ASSIGN_PRIMARY|windows.TOKEN_ADJUST_DEFAULT|windows.TOKEN_QUERY,
			&currentToken,
		)
		if err != nil {
			return nil, fmt.Errorf("OpenProcessToken: %w", err)
		}
		defer currentToken.Close()

		var dupe windows.Token
		err = windows.DuplicateTokenEx(
			currentToken,
			windows.TOKEN_ALL_ACCESS,
			nil,
			2, // SecurityImpersonation
			1, // TokenPrimary
			&dupe,
		)
		if err != nil {
			return nil, fmt.Errorf("DuplicateTokenEx: %w", err)
		}
		defer dupe.Close()

		if err := setLowIntegrity(dupe); err != nil {
			return nil, err
		}

		token = dupe
	}

	return sb.createProcess(name, args, workdir, token)
}
