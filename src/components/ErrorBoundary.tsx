import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
export class ErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('StudyTrack could not render', error, info.componentStack); }
  downloadRecovery = () => {
    const saved: Record<string, unknown> = {};
    for (const [field, key] of Object.entries({sessions:'sessions',tasks:'tasks',journalEntries:'journal',badges:'badges',settings:'settings',events:'events'})) {
      try { saved[field] = JSON.parse(localStorage.getItem(`studytrack.${key}`) || 'null'); } catch { saved[field] = null; }
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'studytrack-recovery.json'; link.click(); URL.revokeObjectURL(url);
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="recovery-screen"><section className="panel"><AlertTriangle size={28} /><h1>Let’s get you back to studying.</h1><p>Something interrupted the app. Reload to try again. Your saved data has not been cleared.</p><div><button onClick={this.downloadRecovery}><Download size={16} /> Download saved data</button><button className="primary" onClick={() => location.reload()}><RefreshCw size={16} /> Reload workspace</button></div></section></main>;
  }
}
