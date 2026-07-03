package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	port := os.Getenv("AGENT_PORT")
	if port == "" {
		port = "3002"
	}

	expressURL := os.Getenv("EXPRESS_URL")
	if expressURL == "" {
		expressURL = "http://localhost:3001"
	}

	apiKey := os.Getenv("AGENT_API_KEY")

	// Validate security configuration
	if apiKey == "" {
		listenAddr := ":" + port
		if !isLoopbackOnly(listenAddr) {
			log.Fatalf("AGENT_API_KEY is not set. For security, the server requires an API key when binding to non-loopback addresses. Set AGENT_API_KEY or bind to 127.0.0.1/localhost only.")
		}
		log.Println("WARNING: Running without AGENT_API_KEY on loopback interface. This is insecure for production use.")
	}

	hub := NewAgentHub(expressURL, apiKey)
	srv := hub.Listen(port)

	go func() {
		fmt.Printf("xz agent framework running on http://localhost:%s\n", port)
		fmt.Printf("Connected to Express backend at %s\n", expressURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

// isLoopbackOnly checks if the listen address is restricted to loopback interfaces
func isLoopbackOnly(addr string) bool {
	// Extract host from address
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		// If no port, treat the whole thing as host
		host = addr
	}

	// Empty host or "0.0.0.0" or "::" means bind to all interfaces (not loopback-only)
	if host == "" || host == "0.0.0.0" || host == "::" {
		return false
	}

	// Check if host is localhost or 127.x.x.x or ::1
	if host == "localhost" || strings.HasPrefix(host, "127.") || host == "::1" {
		return true
	}

	// Try to parse as IP and check if loopback
	ip := net.ParseIP(host)
	if ip != nil && ip.IsLoopback() {
		return true
	}

	return false
}
