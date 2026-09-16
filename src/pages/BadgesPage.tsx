import { Select } from "../components/Select";
import { useMemo, useState } from "react";
import { Award, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Flame, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { PageHeader } from "../components/Layout";
import { CountUp } from "../components/CountUp";
import { useAppStore } from "../store/AppStore";
import { badgeProgress } from "../utils/stats";

const icons = { Sparkles, Flame, Trophy, CheckCircle2, RotateCcw, BookOpen, ShieldCheck };

export function BadgesPage() {
  const { state } = useAppStore();
  const [status, setStatus] = useState<"all" | "earned" | "locked">("all");
  const [category, setCategory] = useState("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const today = new Date().toDateString();
  const categories = Array.from(new Set(state.badges.map((b) => b.category)));
  const earnedCount = state.badges.filter((b) => b.dateEarned).length;
  const overallProgress = Math.round(state.badges.reduce((sum, b) => sum + badgeProgress(state, b), 0) / Math.max(1, state.badges.length));

  const visibleBadges = useMemo(() =>
    state.badges
      .filter((b) => status === "all" || (status === "earned" ? b.dateEarned : !b.dateEarned))
      .filter((b) => category === "all" || b.category === category)
      .sort((a, b) => Number(Boolean(b.dateEarned)) - Number(Boolean(a.dateEarned))),
    [category, state.badges, status]);

  const groups = visibleBadges.reduce<Record<string, typeof state.badges>>((map, badge) => {
    map[badge.category] = [...(map[badge.category] ?? []), badge];
    return map;
  }, {});

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <div className="badges-page page-transition">
      <PageHeader eyebrow="Insights" title="Your achievements" description="Small milestones that celebrate the work you put in." />

      {/* Overview stats */}
      <section className="badge-overview stat-grid">
        <article className="glass-card stat-card accent-1">
          <div className="icon-wrap">
            <Award size={24} />
          </div>
          <div>
            <strong><CountUp value={earnedCount} />/{state.badges.length}</strong>
            <span>badges earned</span>
          </div>
        </article>
        
        <article className="glass-card stat-card accent-2">
          <div className="icon-wrap">
            <Target size={24} />
          </div>
          <div>
            <strong><CountUp value={overallProgress} />%</strong>
            <span>overall progress</span>
          </div>
        </article>
        
        <article className="glass-card stat-card muted">
          <div className="icon-wrap">
            <LockKeyhole size={24} />
          </div>
          <div>
            <strong><CountUp value={state.badges.length - earnedCount} /></strong>
            <span>still locked</span>
          </div>
        </article>
        
        <article className="glass-card stat-card good">
          <div className="icon-wrap"><Trophy size={24} /></div>
          <div>
            <strong><CountUp value={Math.round((earnedCount / Math.max(1, state.badges.length)) * 100)} />%</strong>
            <span>collection complete</span>
          </div>
        </article>
      </section>

      {/* Filters */}
      <section className="badge-toolbar glass-card">
        <div className="range-tabs" aria-label="Badge status filter">
          {(["all", "earned", "locked"] as const).map((item) => (
            <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <label className="badge-category-filter">
          Category
          <Select aria-label="Badge category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </label>
      </section>

      {Object.keys(groups).length === 0 && (
        <div className="empty-state glass-card"><strong>No badges in this view</strong><p>Change the filters to see the rest of your collection.</p></div>
      )}

      {Object.entries(groups).map(([group, badges]) => {
        const isCollapsed = collapsedGroups[group];
        return (
          <section className="section-band category-group" key={group}>
            <h2 
              className="collapsible-header glass-card premium-accordion-header" 
              onClick={() => toggleGroup(group)} role="button" tabIndex={0} aria-expanded={!isCollapsed} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(group); } }} 
            >
              <div>
                <span className={`chevron ${isCollapsed ? 'collapsed' : ''}`}><ChevronDown size={20} /></span>
                <span>{group}</span> 
                <span className="pill accent-pill">
                  {badges.filter((b) => b.dateEarned).length}/{badges.length} earned
                </span>
              </div>
            </h2>
            
            {!isCollapsed && (
              <div className="badge-grid">
                {badges.map((badge) => {
                  const Icon = icons[badge.icon as keyof typeof icons] ?? Sparkles;
                  const progress = badgeProgress(state, badge);
                  const freshlyEarned = Boolean(badge.dateEarned && new Date(badge.dateEarned).toDateString() === today);
                  return (
                    <article
                      className={`badge-card glass-card tier-${badge.tier} ${badge.dateEarned ? "earned prominent shimmer" : "locked grayscale"}`}
                      key={badge.id}
                    >
                      <div className="badge-icon">
                        <Icon size={24} />
                      </div>
                      <span className={`pill glow tier-badge ${badge.tier === "gold" ? "medium" : badge.tier === "silver" ? "low" : "low"}`}>
                        {badge.tier}
                      </span>
                      <h3>
                        {badge.name} {badge.dateEarned && <span title="Earned">✨</span>}
                      </h3>
                      <p>{badge.description}</p>
                      <small>{badge.criteria.label}</small>
                      <div className="bar badge-progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <strong>
                        {badge.dateEarned ? "✓ Earned" : `${progress}%`}
                      </strong>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
