package worker

import (
	"context"
	"log"
	"sync"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/executor"
)

type Pool struct {
	size    int
	tasks   chan *task.Task
	manager *task.Manager
	exec    *executor.Executor
	wg      sync.WaitGroup
	ctx     context.Context
	cancel  context.CancelFunc
}

func NewPool(size int, manager *task.Manager, exec *executor.Executor) *Pool {
	ctx, cancel := context.WithCancel(context.Background())
	return &Pool{
		size:    size,
		tasks:   make(chan *task.Task, 100),
		manager: manager,
		exec:    exec,
		ctx:     ctx,
		cancel:  cancel,
	}
}

func (p *Pool) Start() {
	for i := 0; i < p.size; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
	log.Printf("worker pool started with %d workers", p.size)
}

func (p *Pool) Stop() {
	p.cancel()
	close(p.tasks)
	p.wg.Wait()
	log.Println("worker pool stopped")
}

func (p *Pool) Submit(t *task.Task) {
	select {
	case p.tasks <- t:
	default:
		log.Printf("worker pool queue full, task %s dropped", t.ID)
	}
}

func (p *Pool) worker(id int) {
	defer p.wg.Done()

	for {
		select {
		case <-p.ctx.Done():
			return
		case t, ok := <-p.tasks:
			if !ok {
				return
			}

			log.Printf("[worker %d] processing task %s (%s)", id, t.ID, t.Type)
			p.processTask(t)
		}
	}
}

func (p *Pool) processTask(t *task.Task) {
	if t.Type == "delegate" {
		// Sub-agent tasks are handled by the orchestrator
		return
	}

	// For simple tool execution tasks, iterate through the tool calls
	for i, call := range t.Tools {
		result := p.exec.Execute(p.ctx, call)
		t.Tools[i] = result

		if result.Error != "" {
			p.manager.Fail(t.ID, result.Error)
			return
		}
	}

	p.manager.Complete(t.ID, "All tools executed", len(t.Tools))
}
