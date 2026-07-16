import { useChatPage } from '../hooks/useChatPage';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { QuestionDialog } from '@/components/chat/QuestionDialog';
import { FilePanel } from '../components/file-panel/FilePanel';
import ResizeDivider from '../components/layout/ResizeDivider';
import { MessageList } from '../components/chat/MessageList';
import TitleBar from '../components/layout/TitleBar';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { RefreshIcon } from '@hugeicons/core-free-icons';

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
    modelSupportsThinking,
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
    streamingBanner,
    refreshMessages,
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
          {streamingBanner && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
              <span>
                {streamingBanner === 'loading'
                  ? 'Refreshing messages...'
                  : 'This thread was streaming when you left. The result may have completed in the background.'}
              </span>
              {streamingBanner === 'ready' && (
                <button
                  onClick={refreshMessages}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors text-xs font-medium"
                >
                  <HugeiconRenderer icon={RefreshIcon} size={12} />
                  Refresh
                </button>
              )}
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
            modelSupportsThinking={modelSupportsThinking}
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


      </div>


    </div>
  );
};
