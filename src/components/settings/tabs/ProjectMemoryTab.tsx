import { useState, useEffect, useCallback } from 'react';
import { getProjectMemory, setProjectMemory, deleteProjectMemory } from '@core/memory/projectMemory';
import type { ProjectMemoryEntry } from '@core/memory/projectMemory';
import { useProjectStore } from '@/stores/projectStore';

export function ProjectMemoryTab() {
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const [entries, setEntries] = useState<ProjectMemoryEntry[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);

  const reloadEntries = useCallback(() => {
    if (!currentProjectId) return;
    getProjectMemory(currentProjectId).then(data => {
      setEntries(data.sort((a, b) => b.updatedAt - a.updatedAt));
    }).catch(e => {
      console.error('Failed to load project memory:', e);
    }).finally(() => {
      setLoading(false);
    });
  }, [currentProjectId]);

  useEffect(() => {
    reloadEntries();
  }, [reloadEntries]);

  const handleEdit = async (key: string) => {
    if (!currentProjectId) return;
    try {
      await setProjectMemory(currentProjectId, key, editValue, 'manual');
      setEditingKey(null);
      setEditValue('');
      reloadEntries();
    } catch (e) {
      console.error('Failed to update memory entry:', e);
    }
  };

  const handleDelete = async (key: string) => {
    if (!currentProjectId) return;
    try {
      await deleteProjectMemory(currentProjectId, key);
      reloadEntries();
    } catch (e) {
      console.error('Failed to delete memory entry:', e);
    }
  };

  const startEdit = (entry: ProjectMemoryEntry) => {
    setEditingKey(entry.key);
    setEditValue(entry.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  if (!currentProjectId) {
    return (
      <div className="space-y-6">
        <div className="bg-muted p-4 rounded-xl border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-2">Project Memory</h4>
          <p className="text-xs text-muted-foreground">
            Open a project to view and manage its memory entries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-xl border border-border">
        <h4 className="text-sm font-semibold text-foreground mb-2">Project Memory</h4>
        <p className="text-xs text-muted-foreground">
          Facts the model has learned about this project. Auto-discovered entries must be reviewed before they appear in the system prompt.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No memory entries yet. Memory entries are created automatically when the model reads your project files.
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Key</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Value</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Source</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Updated</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.key} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs text-foreground">{entry.key}</td>
                  <td className="py-2.5 px-3">
                    {editingKey === entry.key ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEdit(entry.key)}
                          className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-mono ${entry.source === 'auto-discovered' ? 'text-yellow-500' : 'text-foreground'}`}>
                        {entry.value}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      entry.source === 'auto-discovered'
                        ? 'bg-yellow-900/20 text-yellow-400'
                        : entry.source === 'auto-summary'
                        ? 'bg-blue-900/20 text-blue-400'
                        : 'bg-green-900/20 text-green-400'
                    }`}>
                      {entry.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">
                    {new Date(entry.updatedAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {editingKey !== entry.key && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => startEdit(entry)}
                          className="px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.key)}
                          className="px-2 py-1 text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}