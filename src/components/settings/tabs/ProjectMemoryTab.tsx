import { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserIcon, MagicWand01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { DatabaseService } from '@core/utils/DatabaseService';

const STORAGE_KEY = 'user_memory';

const PATTERNS: { label: string; patterns: RegExp[] }[] = [
  {
    label: 'Name',
    patterns: [
      /(?:my name is|i'm|i am|call me)\s+(\w+(?:\s+\w+)?)/i,
      /(?:you can call me|my friends call me)\s+(\w+(?:\s+\w+)?)/i,
    ],
  },
  {
    label: 'Location',
    patterns: [
      /i (?:live|moved|am based|am located|stay)\s+(?:in|at|near)\s+([\w\s]+?)(?:\.|!|\?|$)/i,
      /i'm from\s+([\w\s]+?)(?:\.|!|\?|$)/i,
    ],
  },
  {
    label: 'Job / Role',
    patterns: [
      /i (?:work as|am a|am an|work at)\s+([\w\s]+?)(?:\.|!|\?|$)/i,
      /i (?:am|'m)\s+(?:a\s+|an\s+)?([\w\s]*(?:developer|engineer|designer|manager|writer|consultant|freelancer|student)[\w\s]*?)(?:\.|!|\?|$)/i,
    ],
  },
  {
    label: 'Interests',
    patterns: [
      /i (?:like|love|enjoy|am into|am passionate about)\s+([\w\s]+?)(?:\.|!|\?|$)/i,
      /my (?:favorite|favourite)\s+[\w\s]+\s+is\s+([\w\s]+?)(?:\.|!|\?|$)/i,
    ],
  },
  {
    label: 'Tech / Tools',
    patterns: [
      /i (?:use|work with|code in|write|program in)\s+([\w\s+#.]+?)(?:\.|!|\?|$)/i,
      /i'm (?:using|building with|working with)\s+([\w\s+#.]+?)(?:\.|!|\?|$)/i,
    ],
  },
  {
    label: 'Goals',
    patterns: [
      /i (?:want|need|am trying|hope)\s+to\s+([\w\s]+?)(?:\.|!|\?|$)/i,
      /i (?:am|'m)\s+(?:trying to|looking to)\s+([\w\s]+?)(?:\.|!|\?|$)/i,
      /i'm building\s+([\w\s]+?)(?:\.|!|\?|$)/i,
    ],
  },
];

function extractFacts(text: string): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();
  for (const group of PATTERNS) {
    for (const re of group.patterns) {
      const match = text.match(re);
      if (match) {
        const val = match[1].trim();
        if (val.length > 1 && !seen.has(val)) {
          seen.add(val);
          facts.push(`- **${group.label}**: ${val}`);
        }
      }
    }
  }
  return facts;
}

export function ProjectMemoryTab() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const val = await DatabaseService.getConfig(STORAGE_KEY);
      setContent(val || '');
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await DatabaseService.setConfig(STORAGE_KEY, content);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const sessions = await DatabaseService.getSessions();
      const extracted: string[] = [];
      const seenKeys = new Set<string>();

      for (const session of sessions) {
        const msgs = await DatabaseService.getMessages(session.id);
        for (const m of msgs) {
          if (m.role === 'user' && m.content.trim()) {
            const facts = extractFacts(m.content);
            for (const f of facts) {
              const key = f.replace(/^- \*\*([^*]+)\*\*:/, '$1').trim();
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                extracted.push(f);
              }
            }
          }
        }
      }

      if (extracted.length > 0) {
        const existing = content ? content + '\n' : '';
        setContent(existing + extracted.join('\n') + '\n');
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={UserIcon} size={16} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">User Memory</p>
          <p className="text-xs text-muted-foreground">Facts about you stored as context for the AI</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This memory is saved to the database and injected into the AI's system prompt so it knows more about you.
          Edit manually or auto-extract facts from your recent messages.
        </p>
      </div>

      <textarea
        className="w-full h-64 bg-muted rounded-xl px-4 py-3 text-sm outline-none border border-border focus:border-ring transition-all resize-y font-mono leading-relaxed"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="# About Me

Fact about yourself here... The AI will read this as context."
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Save Memory'}
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-5 py-2 text-sm font-semibold bg-muted text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {generating ? (
            <div className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          ) : (
            <HugeiconsIcon icon={MagicWand01Icon} size={14} />
          )}
          Auto-Extract from Messages
        </button>
      </div>

      {content && (
        <div className="border-t border-border pt-4">
          <button
            onClick={async () => {
              setContent('');
              await DatabaseService.setConfig(STORAGE_KEY, '');
            }}
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
          >
            <HugeiconsIcon icon={RefreshIcon} size={12} />
            Clear memory
          </button>
        </div>
      )}
    </div>
  );
}
