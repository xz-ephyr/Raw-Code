package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
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

	hub := NewAgentHub(expressURL, apiKey)
	srv := hub.Server(port)

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
