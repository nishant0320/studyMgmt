import { Select } from "../components/Select";
import { confirmAction } from "../utils/confirm";
import { ChangeEvent, useEffect, useState } from "react";
import type React from "react";
import {
  BellRing,
  Clock3,
  Database,
  Download,
  Keyboard,
  RotateCcw,
  ShieldCheck,
  Upload,
  Timer,
  Palette,
  HardDrive,
  User,
  Music,
  Tags,
  Trash2,
  Plus
} from "lucide-react";
import { PageHeader } from "../components/Layout";
import { useAppStore } from "../store/AppStore";
import { AppState } from "../types";
import { isValidBackup } from "../utils/backup";
import { useActiveTimer } from "../components/ActiveTimerProvider";
import { showToast } from "../utils/toast";

const swatches = [{ name: "Sage", color: "#a7c993" }, { name: "Blue", color: "#91b2d6" }, { name: "Lavender", color: "#b5a2cc" }, { name: "Sand", color: "#d7b07e" }, { name: "Rose", color: "#dc9494" }];

function resolveCssColor(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function colorInputValue(value: string) {
  const hash = String.fromCharCode(35);
  if (value?.startsWith("rgb")) {
    const [r, g, b] = value.match(/\d+/g)?.map(Number) ?? [124, 92, 252];
    return `${hash}${[r, g, b].map((p) => p.toString(16).padStart(2, "0")).join("")}`;
  }
  return value?.startsWith(hash) ? value : `${hash}7c5cfc`;
}

const POMODORO_PRESETS = [
  { id: "classic", label: "Classic 25-5", focus: 25, short: 5, long: 15, sessions: 4 },
  { id: "52-17", label: "52-17 Rule", focus: 52, short: 17, long: 30, sessions: 4 },
  { id: "90-20", label: "90-20 Deep Work", focus: 90, short: 20, long: 45, sessions: 2 },
  { id: "custom", label: "Custom" }
];

export function SettingsPage() {
  const { state, dispatch } = useAppStore();
  const settings = state.settings;
  const activeTimer = useActiveTimer();

  const updateNumber = (key: keyof typeof settings, value: string) => {
    const maximum = key === "weeklyGoalMinutes" ? 10080 : key === "dailyGoalMinutes" ? 1440 : key === "sessionsBeforeLongBreak" ? 12 : 180;
    dispatch({ type: "update-settings", settings: { [key]: Math.min(maximum, Math.max(1, Number(value) || 1)) } as Partial<typeof settings> });
  };
  const updateBool = (key: keyof typeof settings, value: boolean) =>
    dispatch({ type: "update-settings", settings: { [key]: value } as Partial<typeof settings> });
  const updateString = (key: keyof typeof settings, value: string) =>
    dispatch({ type: "update-settings", settings: { [key]: value } as Partial<typeof settings> });

  const storageSize = Math.max(1, Math.round(new Blob([JSON.stringify(state)]).size / 1024));

  const sizeOf = (obj: any) => new Blob([JSON.stringify(obj)]).size;
  const totalBytes = sizeOf(state);
  const tasksBytes = sizeOf(state.tasks);
  const sessionsBytes = sizeOf(state.sessions);
  const journalBytes = sizeOf(state.journalEntries);
  
  const pct = (bytes: number) => `${Math.max(1, Math.round((bytes / totalBytes) * 100))}%`;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "studytrack-backup.json"; link.click();
    URL.revokeObjectURL(url);
    showToast("Data exported", "success");
  };

  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(async (text) => {
      const parsed = JSON.parse(text) as unknown;
      if (!isValidBackup(parsed)) throw new Error("Invalid StudyTrack backup structure");
      if (!await confirmAction("Replace your current workspace with this backup?")) return;
      activeTimer.reset();
      dispatch({ type: "import-data", state: parsed });
      showToast("Data imported successfully!", "success");
    }).catch(() => showToast("Import failed: choose a valid StudyTrack backup", "warning"));
    event.target.value = "";
  };

  const updateNotifications = async (enabled: boolean) => {
    if (!enabled) { updateBool("notificationsEnabled", false); return; }
    if (!("Notification" in window)) { showToast("Browser notifications are not supported", "warning"); return; }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted") { showToast("Notification permission denied", "warning"); return; }
    updateBool("notificationsEnabled", true);
    showToast("Timer notifications enabled", "success");
  };

  const handlePresetChange = (presetId: string) => {
    updateString("pomodoroPreset", presetId);
    const preset = POMODORO_PRESETS.find(p => p.id === presetId);
    if (preset && preset.id !== "custom") {
      dispatch({
        type: "update-settings",
        settings: {
          focusDuration: preset.focus,
          shortBreakDuration: preset.short,
          longBreakDuration: preset.long,
          sessionsBeforeLongBreak: preset.sessions,
        }
      });
    }
  };

  const initials = (settings.profileName || "User").substring(0, 2).toUpperCase();
  const earliestDate = state.sessions.length 
    ? new Date(Math.min(...state.sessions.map(s => new Date(s.startTime).getTime()))).toLocaleDateString()
    : new Date().toLocaleDateString();

  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("studytrack.customTimerCategories");
      if (stored) setCategories(JSON.parse(stored));
    } catch {}
  }, []);

  const saveCategories = (cats: string[]) => {
    setCategories(cats);
    localStorage.setItem("studytrack.customTimerCategories", JSON.stringify(cats));
  };

  const addCategory = () => {
    if (newCat.trim() && !categories.includes(newCat.trim())) {
      saveCategories([...categories, newCat.trim()]);
      setNewCat("");
    }
  };

  const removeCategory = (cat: string) => {
    saveCategories(categories.filter(c => c !== cat));
  };

  return (
    <div className="settings-page page-transition">
      <PageHeader eyebrow="Preferences" title="Make it yours" description="Your routines, your goals, your workspace. Changes save automatically." />

      <section className="settings-data-strip glass-card stat-grid">
        <article><Database size={17} className="text-accent" /><div><strong>{storageSize} KB</strong><span>local data</span></div></article>
        <article><Clock3 size={17} className="text-accent-3" /><div><strong>{state.sessions.length}</strong><span>sessions</span></div></article>
        <article><ShieldCheck size={17} className="text-good" /><div><strong>{state.tasks.length}</strong><span>tasks</span></div></article>
        <article><BellRing size={17} className="text-accent-2" /><div><strong>{settings.notificationsEnabled ? "On" : "Off"}</strong><span>notifications</span></div></article>
      </section>

      <section className="settings-grid">
        
        {/* Profile Section */}
        <div className="panel glass-card">
          <div className="settings-section-header">
            <h2><User size={18} /> Profile</h2>
          </div>
          <div className="profile-header glass-card">
            <div className="avatar">
              {initials}
            </div>
            <div>
              <div className="profile-name">{settings.profileName || "StudyTrack User"}</div>
              <div className="profile-joined">Personal workspace · Stored on this device</div>
            </div>
          </div>
          <label>
            Display Name
            <input type="text" value={settings.profileName || ""} onChange={(e) => updateString("profileName", e.target.value)} placeholder="Enter your name" />
          </label>
        </div>

        {/* Timer & Pomodoro */}
        <div className="panel glass-card">
          <div className="settings-section-header">
            <h2><Timer size={18} /> Timer & Pomodoro</h2>
          </div>
          <label>
            Pomodoro Preset
            <Select aria-label="Pomodoro Preset" value={settings.pomodoroPreset || "custom"} onChange={(e) => handlePresetChange(e.target.value)}>
              {POMODORO_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </label>
          <hr className="section-separator" />
          <label>Focus duration (min)<input type="number" min={1} value={settings.focusDuration} onChange={(e) => { updateNumber("focusDuration", e.target.value); updateString("pomodoroPreset", "custom"); }} /></label>
          <label>Short break (min)<input type="number" min={1} value={settings.shortBreakDuration} onChange={(e) => { updateNumber("shortBreakDuration", e.target.value); updateString("pomodoroPreset", "custom"); }} /></label>
          <label>Long break (min)<input type="number" min={1} value={settings.longBreakDuration} onChange={(e) => { updateNumber("longBreakDuration", e.target.value); updateString("pomodoroPreset", "custom"); }} /></label>
          <label>Sessions before long break<input type="number" min={1} value={settings.sessionsBeforeLongBreak} onChange={(e) => { updateNumber("sessionsBeforeLongBreak", e.target.value); updateString("pomodoroPreset", "custom"); }} /></label>
        </div>

        {/* Goals & Appearance */}
        <div className="panel glass-card">
          <div className="settings-section-header">
            <h2><Palette size={18} /> Goals & Appearance</h2>
          </div>
          <label>Daily goal (min)<input type="number" min={1} value={settings.dailyGoalMinutes} onChange={(e) => updateNumber("dailyGoalMinutes", e.target.value)} /></label>
          <label>Weekly goal (min)<input type="number" min={1} value={settings.weeklyGoalMinutes} onChange={(e) => updateNumber("weeklyGoalMinutes", e.target.value)} /></label>
          
          <hr className="section-separator" />
          
          <label>Accent color<input type="color" value={colorInputValue(settings.accentColor)} onChange={(e) => dispatch({ type: "update-settings", settings: { accentColor: e.target.value } })} /></label>
          <div className="swatch-row">
            {swatches.map((s) => (
              <button key={s.name} className="swatch" style={{ background: s.color }} onClick={() => dispatch({ type: "update-settings", settings: { accentColor: s.color } })} title={s.name} aria-label={`Use ${s.name} accent`} aria-pressed={settings.accentColor === s.color} />
            ))}
          </div>
        </div>

        {/* Sound & Notifications */}
        <div className="panel glass-card">
          <div className="settings-section-header">
            <h2><Music size={18} /> Sound & Notifications</h2>
          </div>
          
          <label className="check-row">
            <div className={`toggle-switch ${settings.soundEnabled ? "active" : ""}`}>
              <input type="checkbox" checked={settings.soundEnabled} onChange={(e) => updateBool("soundEnabled", e.target.checked)} className="sr-only" style={{ opacity: 0, position: 'absolute' }} />
            </div>
            End-of-session chime
          </label>
          <label className="check-row">
            <div className={`toggle-switch ${settings.autoStartNextSession ? "active" : ""}`}>
              <input type="checkbox" checked={settings.autoStartNextSession} onChange={(e) => updateBool("autoStartNextSession", e.target.checked)} className="sr-only" style={{ opacity: 0, position: 'absolute' }} />
            </div>
            Auto-start next session
          </label>
          <label className="check-row">
            <div className={`toggle-switch ${settings.notificationsEnabled ? "active" : ""}`}>
              <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => void updateNotifications(e.target.checked)} className="sr-only" style={{ opacity: 0, position: 'absolute' }} />
            </div>
            System Notifications
          </label>

          <hr className="section-separator" />

          <label className="check-row">
            <div className={`toggle-switch ${settings.focusSoundEnabled ? "active" : ""}`}>
              <input type="checkbox" checked={settings.focusSoundEnabled} onChange={(e) => updateBool("focusSoundEnabled", e.target.checked)} className="sr-only" style={{ opacity: 0, position: 'absolute' }} />
            </div>
            Play Focus Sounds
          </label>

          <label>
            Focus Sound
            <Select aria-label="Focus Sound" value={settings.focusSoundType || "silence"} onChange={(e) => updateString("focusSoundType", e.target.value)} disabled={!settings.focusSoundEnabled}>
              <option value="silence">Silence</option>
              <option value="rain">Soft rain noise</option>
              <option value="lofi">Warm noise</option>
              <option value="whitenoise">White Noise</option>
              <option value="forest">Deep noise</option>
            </Select>
          </label>
        </div>

        {/* Category Manager */}
        <div className="panel glass-card">
          <div className="settings-section-header">
            <h2><Tags size={18} /> Timer Categories</h2>
          </div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              aria-label="New category" placeholder="New category…" 
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button className="btn styled-action-btn" onClick={addCategory} disabled={!newCat.trim()} aria-label="Add category"><Plus size={16} /></button>
          </div>
          <div className="category-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No custom categories yet.</span>}
            {categories.map(c => (
              <div key={c} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem' }}>
                <span>{c}</span>
                <button className="btn icon-btn danger" onClick={() => removeCategory(c)} aria-label="Delete category" style={{ background: 'transparent', padding: '4px' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data & Danger Zone */}
        <div className="panel glass-card">
          <div className="settings-section-header">
            <h2><HardDrive size={18} /> Data management</h2>
          </div>
          
          <div className="storage-breakdown glass-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Storage usage</span>
              <strong>{storageSize} KB total</strong>
            </div>
            <div className="preview-bar-container" style={{ display: 'flex', height: '8px', overflow: 'hidden', borderRadius: '4px', background: 'var(--line)' }}>
              <span style={{ width: pct(tasksBytes), background: 'var(--good)' }} title={`Tasks: ${pct(tasksBytes)}`} />
              <span style={{ width: pct(sessionsBytes), background: 'var(--accent)' }} title={`Sessions: ${pct(sessionsBytes)}`} />
              <span style={{ width: pct(journalBytes), background: 'var(--accent-3)' }} title={`Journal: ${pct(journalBytes)}`} />
              <span style={{ width: pct(totalBytes - tasksBytes - sessionsBytes - journalBytes), background: 'var(--text-dim)' }} title="Other data" />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--good)' }} /> Tasks</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} /> Sessions</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-3)' }} /> Journal</span>
            </div>
          </div>

          <p className="backup-explainer">Your data stays in this browser. Export a backup to keep a copy or move your workspace to another browser or your deployed site.</p>
          <div className="data-management-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary styled-action-btn" style={{ flex: 1 }} onClick={exportJson}><Download size={15} /> Export</button>
              <label className="btn btn-secondary styled-action-btn file-button" style={{ flex: 1, margin: 0 }} tabIndex={0} role="button" aria-label="Import backup" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.querySelector("input")?.click(); } }}>
                <Upload size={15} /> Import
                <input type="file" accept="application/json" onChange={importJson} className="sr-only" style={{ display: 'none' }} />
              </label>
            </div>
            <button className="btn styled-action-btn" onClick={async () => { if (!await confirmAction("Replace your workspace with demo data? Export a backup first to keep your current data.")) return; activeTimer.reset(); dispatch({ type: "load-demo" }); showToast("Demo workspace loaded!", "success"); }}>Load demo data</button>
          </div>

          <div className="danger-zone glass-card" style={{ marginTop: '1.5rem', border: '1px solid var(--red)', background: 'rgba(255,0,0,0.05)', padding: '1rem' }}>
            <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '1rem' }}>Danger Zone</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn styled-action-btn danger" style={{ background: 'rgba(255,0,0,0.1)' }} onClick={async () => {
                if (await confirmAction("Clear all sessions? This cannot be undone.")) {
                  dispatch({ type: "clear-sessions" }); showToast("Sessions cleared", "warning");
                }
              }}>Clear Sessions Only</button>
              <button className="btn styled-action-btn danger" style={{ background: 'rgba(255,0,0,0.1)' }} onClick={async () => {
                if (await confirmAction("Clear all tasks? This cannot be undone.")) {
                  dispatch({ type: "clear-tasks" }); showToast("Tasks cleared", "warning");
                }
              }}>Clear Tasks Only</button>
              <button className="btn styled-action-btn danger" onClick={async () => {
                if (await confirmAction("Clear all StudyTrack data? This cannot be undone unless you exported a backup.")) {
                  activeTimer.reset(); localStorage.removeItem("studytrack.customTimerCategories"); setCategories([]); dispatch({ type: "clear-data" }); showToast("StudyTrack data reset", "warning");
                }
              }}>
                <RotateCcw size={15} /> Reset all data
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts - Moved Outside Danger Zone */}
        <div className="panel glass-card full-width">
          <div className="shortcut-reference glass-card">
            <strong className="shortcut-title"><Keyboard size={18} /> Keyboard shortcuts</strong>
            <div className="shortcut-list">
              <span className="shortcut-item"><div className="kbd-group"><kbd className="kbd-styled">Ctrl</kbd> + <kbd className="kbd-styled">K</kbd></div> Open command center</span>
              <span className="shortcut-item"><div className="kbd-group"><kbd className="kbd-styled">Esc</kbd></div> Close menus and dialogs</span>
              <span className="shortcut-item"><div className="kbd-group"><kbd className="kbd-styled">Ctrl</kbd> + <kbd className="kbd-styled">S</kbd></div> Save journal entry</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
