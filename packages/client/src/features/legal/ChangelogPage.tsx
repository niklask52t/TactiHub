import { Badge } from '@/components/ui/badge';
import { APP_VERSION } from '@tactihub/shared';

type ChangeType = 'feature' | 'improvement' | 'fix' | 'removed';

interface Change {
  type: ChangeType;
  text: string;
}

interface Release {
  version: string;
  date: string;
  tag?: string;
  changes: Change[];
}

const releases: Release[] = [
  {
    version: '1.9.0',
    date: '2026-02-14',
    tag: 'Latest',
    changes: [
      { type: 'removed', text: 'Valorant game data removed from seed \u2014 TactiHub now focuses exclusively on Rainbow Six Siege' },
      { type: 'feature', text: 'Screenshot slideshow on Homepage preview section \u2014 themed groups with auto-rotate and navigation' },
      { type: 'fix', text: 'Homepage hero viewport gap on Windows \u2014 changed to full-screen height' },
      { type: 'improvement', text: 'Updated all documentation to reflect R6 Siege-only focus' },
    ],
  },
  {
    version: '1.8.1',
    date: '2026-02-13',
    changes: [
      { type: 'feature', text: 'Visual operator lineup picker \u2014 clickable image grid replaces dropdown selectors' },
      { type: 'feature', text: 'Sandbox mode matches room layout \u2014 full-screen canvas with icon sidebar and toolbar' },
      { type: 'fix', text: 'Session persistence \u2014 sessions now survive page reload' },
      { type: 'fix', text: 'Admin self-deletion protection \u2014 admin role users can no longer see or trigger account deletion' },
      { type: 'fix', text: 'Eraser tool now works immediately \u2014 optimistic draw tracking makes draws erasable before API response' },
      { type: 'fix', text: 'Select/Move tool works immediately \u2014 draws are selectable and movable right after creation' },
      { type: 'fix', text: 'Draws persist on floor switch \u2014 optimistic draws stay visible while awaiting server confirmation' },
      { type: 'improvement', text: 'Server-side admin deletion guard \u2014 request-deletion endpoint rejects admin-role users' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-02-13',
    changes: [
      { type: 'feature', text: 'Operator Lineup System \u2014 select 5 defenders per battleplan to filter the icon sidebar' },
      { type: 'feature', text: 'Optional Attacker Lineup \u2014 add 5 attacker slots on demand, remove when not needed' },
      { type: 'feature', text: 'Lineup tab in Icon Sidebar \u2014 3-tab layout (Lineup / Operators / Gadgets) with dropdown selectors' },
      { type: 'feature', text: 'Smart sidebar filtering \u2014 operators and gadgets auto-filter to lineup members' },
      { type: 'feature', text: '"Show all" toggle \u2014 reveals all operators/gadgets with "Nicht im Lineup" warning' },
      { type: 'feature', text: 'Lineup display on BattleplanViewer \u2014 read-only operator avatars with DEF/ATK labels' },
      { type: 'feature', text: 'Real-time lineup sync \u2014 slot changes broadcast via Socket.IO to all room participants' },
      { type: 'improvement', text: 'Gadget filtering uses operator-gadget relationships for precise results' },
      { type: 'improvement', text: 'Duplicate prevention \u2014 already-assigned operators hidden from lineup dropdowns' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-02-13',
    changes: [
      { type: 'feature', text: 'Resize & Rotate for selected drawings \u2014 8 resize handles (corners + edges) and a rotate handle above the bounding box' },
      { type: 'feature', text: 'All R6 Siege operators added (~78 total) \u2014 complete roster through Year 10' },
      { type: 'feature', text: 'All gadgets now visible in sidebar \u2014 text fallback for gadgets without icons, grouped by category' },
      { type: 'feature', text: 'Auto-switch to Select tool after drawing \u2014 immediately shows resize/rotate handles' },
      { type: 'fix', text: 'Fixed undo/redo system \u2014 corrected payload indexing, prevented redo from clearing undo stack' },
      { type: 'fix', text: 'Fixed z-index overlaps \u2014 chat panel no longer hidden behind compass or icon sidebar' },
      { type: 'fix', text: 'Added missing draw:updated socket listener \u2014 peer draw updates now sync correctly' },
      { type: 'improvement', text: 'Sticky footer \u2014 footer stays at bottom of viewport even when page content is short' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-02-13',
    changes: [
      { type: 'feature', text: 'In-room text chat — ephemeral messaging between room participants with unread badge' },
      { type: 'feature', text: 'Select & Drag tool — click to select your own drawings, drag to reposition them' },
      { type: 'feature', text: 'Ownership-based draw interaction — eraser and select only affect your own drawings, others\u2019 draws are dimmed' },
      { type: 'feature', text: 'Adjustable font size for Text tool (12\u201364px selector in toolbar)' },
      { type: 'feature', text: 'Battleplan tagging — add tags like "Rush", "Default", "Retake" to organize and filter plans' },
      { type: 'feature', text: 'Battleplan description and notes — inline-editable fields for plan owners' },
      { type: 'feature', text: 'Tag filtering on public plans page' },
      { type: 'feature', text: 'Separate Changelog page' },
      { type: 'improvement', text: 'Server-side ownership checks on draw update and delete endpoints' },
      { type: 'improvement', text: 'Replaced dev-reset.sh with interactive update.sh (dev/prod mode selector)' },
    ],
  },
  {
    version: '1.5.2',
    date: '2026-02-12',
    changes: [
      { type: 'feature', text: 'Magic Link (passwordless) login via email — enter email or username, receive a login link, click to log in' },
      { type: 'feature', text: 'Guests can now draw locally in rooms (full toolbar, icons, undo/redo — drawings not persisted or shared)' },
      { type: 'feature', text: 'PNG export (current floor) and PDF export (all floors as multi-page landscape) for all users including guests' },
      { type: 'feature', text: 'Icon sidebar with vertical "Icons" label and pulse animation for first-visit discoverability' },
      { type: 'fix', text: 'Improved map centering with ResizeObserver (fixes top-flush/bottom-gap issue)' },
      { type: 'improvement', text: 'Icon image cache to prevent flicker on re-renders' },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-02-12',
    changes: [
      { type: 'feature', text: 'Account self-deletion with double confirmation, email verification, and 30-day grace period' },
      { type: 'feature', text: 'Google reCAPTCHA v2 on registration (optional, works without configuration)' },
      { type: 'feature', text: 'Account Settings page with account info and danger zone' },
      { type: 'feature', text: 'Admin: reactivate deactivated users, self-delete protection' },
      { type: 'feature', text: 'Admin: deactivated user status and days-left countdown in user table' },
      { type: 'feature', text: 'Complete production deployment guide in README (Nginx, SSL, systemd, ufw)' },
      { type: 'fix', text: 'Fixed DELETE request Content-Type bug (Fastify empty body error)' },
      { type: 'improvement', text: 'Removed redundant admin username bar in admin panel' },
      { type: 'improvement', text: 'User menu moved to far right in navbar' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-02-12',
    changes: [
      { type: 'feature', text: 'Laser Pointer tools: Laser Dot (pulsating point) and Laser Line (fading trail, 3s)' },
      { type: 'feature', text: 'Operator and gadget icon placement on canvas via Icon tool' },
      { type: 'feature', text: 'Map cover images for all 21 R6 maps' },
      { type: 'improvement', text: 'Drawings now stay permanent after releasing the mouse button' },
      { type: 'fix', text: 'Fixed Settings link in Tokens page causing logout' },
      { type: 'fix', text: 'Removed grey loading bar at bottom of page' },
      { type: 'fix', text: 'Fixed infinite horizontal scroll bug' },
      { type: 'fix', text: 'Fixed black canvas on initial plan load' },
      { type: 'improvement', text: 'README table of contents with anchor links' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-02-12',
    changes: [
      { type: 'feature', text: 'Floor image variants: Blueprint, Darkprint, and Whiteprint per floor' },
      { type: 'feature', text: 'View mode switcher on canvas (top-left, only visible when floor has multiple variants)' },
      { type: 'feature', text: 'Batch image import script for floor images and gadget icons' },
      { type: 'feature', text: 'Added 3 new R6 maps: Fortress, Nighthaven Labs, Outback' },
      { type: 'improvement', text: 'Correct floor names and counts per map (was generic 4-floor placeholder)' },
      { type: 'improvement', text: 'Admin floor upload now supports dark and white image variants' },
      { type: 'improvement', text: 'Removed Bartlett map (no image data available)' },
      { type: 'feature', text: 'Gadget icon import from source folder' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-02-12',
    changes: [
      { type: 'feature', text: 'Admin manual user verification (with confirmation dialog and notification email)' },
      { type: 'feature', text: 'Floor layout management UI (upload, reorder, rename, delete per map)' },
      { type: 'feature', text: 'Gaming-style design across all pages (HUD corners, particles, glow effects)' },
      { type: 'feature', text: 'Styled HTML email templates with dark theme, logo, and branded buttons' },
      { type: 'feature', text: 'New APP_URL env variable for correct email link generation' },
      { type: 'fix', text: 'Fixed "Input Buffer is empty" crash when toggling game/map status without file upload' },
      { type: 'fix', text: 'Fixed gadget category dropdown visibility in dark mode' },
      { type: 'fix', text: 'Fixed Radix Switch form values not correctly sent as "true"/"false"' },
      { type: 'improvement', text: 'Improved settings page layout clarity' },
      { type: 'improvement', text: 'Admin username moved to top-right corner' },
    ],
  },
  {
    version: '1.2.2',
    date: '2026-02-12',
    changes: [
      { type: 'feature', text: 'Forced credential change on first login with default admin account' },
      { type: 'feature', text: 'Login accepts username or email' },
      { type: 'feature', text: 'Token-gated registration flow (separate token entry step when public reg is off)' },
      { type: 'feature', text: 'SMTP SSL/TLS support (SMTP_SECURE env var)' },
      { type: 'improvement', text: 'Improved admin tables (proper HTML tables with aligned columns)' },
      { type: 'improvement', text: 'Tokens page shows info banner when public registration is enabled' },
      { type: 'improvement', text: 'Back to Homepage links on auth pages' },
      { type: 'improvement', text: 'Larger logo throughout the app' },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-02-11',
    changes: [
      { type: 'feature', text: 'Zoom + Pan (mouse wheel, pan tool, middle-click, zoom limits 25%-400%)' },
      { type: 'feature', text: 'Eraser tool (click to delete drawings)' },
      { type: 'feature', text: 'Undo/Redo (Ctrl+Z / Ctrl+Y, toolbar buttons)' },
      { type: 'feature', text: 'Share battle plans by link (public toggle, share button)' },
      { type: 'feature', text: 'Guest access (sandbox mode, room viewing)' },
      { type: 'feature', text: 'Compass overlay on canvas' },
      { type: 'feature', text: 'Help page, FAQ page, and versioned Impressum' },
      { type: 'improvement', text: 'Improved room creation with game/map selection flow' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-11',
    changes: [
      { type: 'feature', text: 'Branding update (TactiHub logo, orange/red color scheme)' },
      { type: 'feature', text: 'Impressum page with credits to original projects' },
      { type: 'feature', text: 'README and CLAUDE.md documentation' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-11',
    changes: [
      { type: 'feature', text: 'Initial release' },
      { type: 'feature', text: 'Rainbow Six Siege support with full map and operator data' },
      { type: 'feature', text: 'Real-time collaboration rooms with Socket.IO' },
      { type: 'feature', text: 'Canvas drawing (pen, line, rectangle, text, icons)' },
      { type: 'feature', text: 'Battle plan CRUD with voting system' },
      { type: 'feature', text: 'Admin panel for game/map/operator management' },
      { type: 'feature', text: 'JWT authentication with email verification' },
    ],
  },
];

function getTypeBadge(type: ChangeType) {
  switch (type) {
    case 'feature': return { label: 'New', cls: 'bg-primary/20 text-primary border-primary/30' };
    case 'improvement': return { label: 'Improved', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'fix': return { label: 'Fix', cls: 'bg-green-500/20 text-green-400 border-green-500/30' };
    case 'removed': return { label: 'Removed', cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
}

function countByType(changes: Change[]) {
  const counts = { feature: 0, improvement: 0, fix: 0, removed: 0 };
  for (const c of changes) counts[c.type]++;
  return counts;
}

function summaryParts(counts: { feature: number; improvement: number; fix: number; removed: number }) {
  const parts: { text: string; cls: string }[] = [];
  if (counts.feature > 0) parts.push({ text: `${counts.feature} new`, cls: 'bg-primary/15 text-primary border-primary/30' });
  if (counts.improvement > 0) parts.push({ text: `${counts.improvement} improved`, cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' });
  if (counts.fix > 0) parts.push({ text: `${counts.fix} fixed`, cls: 'bg-green-500/15 text-green-400 border-green-500/30' });
  if (counts.removed > 0) parts.push({ text: `${counts.removed} removed`, cls: 'bg-red-500/15 text-red-400 border-red-500/30' });
  return parts;
}

export default function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Changelog</h1>
        <Badge variant="outline" className="text-xs">v{APP_VERSION}</Badge>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-2 bottom-0 w-px bg-gradient-to-b from-primary via-border to-transparent" />

        <div className="space-y-8">
          {releases.map((release, i) => {
            const counts = countByType(release.changes);
            const parts = summaryParts(counts);
            return (
              <div key={release.version} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />

                <details className="group" open={i === 0}>
                  <summary className="cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
                    {/* Version header */}
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-xl font-bold">v{release.version}</h2>
                      {release.tag && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                          {release.tag}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">{release.date}</span>
                      <svg
                        className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {/* Summary badges (visible when collapsed) */}
                    <div className="flex items-center gap-2 flex-wrap group-open:hidden">
                      {parts.map((part) => (
                        <span key={part.text} className={`px-2 py-0.5 rounded text-xs font-medium border ${part.cls}`}>
                          {part.text}
                        </span>
                      ))}
                    </div>
                  </summary>

                  {/* Changes (expanded) */}
                  <div className="mt-3 rounded-lg border bg-card p-4 space-y-2.5">
                    {release.changes.map((change, j) => {
                      const badge = getTypeBadge(change.type);
                      return (
                        <div key={j} className="flex items-start gap-3">
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="text-sm">{change.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
