import { useChatPage } from '../hooks/useChatPage';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { QuestionDialog } from '@/components/chat/QuestionDialog';
import { FilePanel } from '../components/file-panel/FilePanel';
import { AgentWorkspace } from '../components/agent-workspace/AgentWorkspace';
import ResizeDivider from '../components/layout/ResizeDivider';
import { MessageList } from '../components/chat/MessageList';
import TitleBar from '../components/layout/TitleBar';

export const ChatPage = () => {
  const {
    uuid,
    isMobile,
    panelWidth,
    panelRef,
    startResize,
    handleTouchStart,
    handleDividerKeyDown,
    PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH,
    isThinkingEnabled,
    isWebSearchEnabled,
    currentModel,
    currentMode,
    toggleThinking,
    toggleWebSearch,
    handleModeChange,
    files,
    activeFileId,
    isPanelOpen,
    closePanel,
    messages,
    isLoading,
    lastAssistantIndex,
    completionDurations,
    handleNewThread,
    handleCopyMessage,
    handleSend,
    stop,
    handleOpenFile,
    pendingConfirm,
    pendingQuestion,
    setPendingQuestion,
    handleQuestionAnswer,
    handleConfirmApprove,
    handleConfirmDeny,
    retryInfo,
    agentAgents,
    activeAgent,
    isAgentPanelOpen,
    selectAgent,
    closeAgentPanel,
    agentPanelWidth,
    startAgentResize,
    handleAgentTouchStart,
    handleAgentDividerKeyDown,
    AGENT_PANEL_MIN_WIDTH,
    AGENT_PANEL_MAX_WIDTH,
  } = useChatPage();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background relative">
      {uuid !== 'new' && messages.length > 0 && (
        <TitleBar
          onNewThread={handleNewThread}
        />
      )}
      <div className="flex flex-1 min-h-0 relative z-10">
        <div
          className={`flex flex-col min-w-0 overflow-hidden bg-background relative ${
            isMobile && isPanelOpen
              ? 'hidden'
              : 'flex-1'
          }`}
        >
          {retryInfo && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-sm text-blue-600 dark:text-blue-400">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="9" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                </svg>
                Retrying request
              </span>
              <span className="font-mono tabular-nums text-base font-semibold">
                {retryInfo.remainingSec}s
              </span>
              <span className="text-xs opacity-70">· attempt {retryInfo.attempt} · auto-resending until a response arrives</span>
            </div>
          )}
          <MessageList
            messages={messages}
            currentModel={currentModel}
            isLoading={isLoading}
            lastAssistantIndex={lastAssistantIndex}
            completionDurations={completionDurations}
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={toggleThinking}
            isWebSearchEnabled={isWebSearchEnabled}
            onToggleWebSearch={toggleWebSearch}
            onOpenFile={handleOpenFile}
            onCopy={handleCopyMessage}
            onSend={handleSend}
            onStop={stop}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            bottomSlot={pendingQuestion ? (
              <QuestionDialog
                question={pendingQuestion.question}
                options={pendingQuestion.options}
                allowCustom={pendingQuestion.allowCustom}
                onAnswer={handleQuestionAnswer}
                onDismiss={() => setPendingQuestion(null)}
              />
            ) : pendingConfirm ? (
              <ConfirmDialog
                open
                mode="inline"
                title="Confirm Action"
                message={pendingConfirm.description}
                confirmLabel="Approve"
                cancelLabel="Deny"
                variant="default"
                onConfirm={handleConfirmApprove}
                onCancel={handleConfirmDeny}
              />
            ) : undefined}
          />
        </div>

        {isPanelOpen && files.length > 0 && (
          <div
            ref={panelRef}
            className="flex overflow-hidden min-w-0 max-w-[70%]"
            style={{ width: panelWidth, flex: 'none' }}
          >
            <ResizeDivider
              onMouseDown={startResize}
              onTouchStart={handleTouchStart}
              onKeyDown={handleDividerKeyDown}
              ariaValueNow={panelWidth}
              ariaValueMin={PANEL_MIN_WIDTH}
              ariaValueMax={PANEL_MAX_WIDTH}
            />
            {isMobile && (
              <div className="absolute inset-0 z-50 bg-black/30" onClick={closePanel} />
            )}
            <FilePanel
              files={files}
              activeFileId={activeFileId}
              onClose={closePanel}
            />
          </div>
        )}

        {isAgentPanelOpen && agentAgents.length > 0 && (
          <div
            className="flex overflow-hidden min-w-0"
            style={{ width: agentPanelWidth, flex: 'none', maxWidth: '50%' }}
          >
            <ResizeDivider
              onMouseDown={startAgentResize}
              onTouchStart={handleAgentTouchStart}
              onKeyDown={handleAgentDividerKeyDown}
              ariaValueNow={agentPanelWidth}
              ariaValueMin={AGENT_PANEL_MIN_WIDTH}
              ariaValueMax={AGENT_PANEL_MAX_WIDTH}
            />
            <AgentWorkspace
              agents={agentAgents}
              activeAgent={activeAgent}
              onClose={closeAgentPanel}
              onSelectAgent={selectAgent}
            />
          </div>
        )}


      </div>


    </div>
  );
};
