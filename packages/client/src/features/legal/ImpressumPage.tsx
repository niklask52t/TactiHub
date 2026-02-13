import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import { APP_VERSION } from '@tactihub/shared';

export default function ImpressumPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Impressum</h1>
        <Badge variant="outline" className="text-xs">v{APP_VERSION}</Badge>
      </div>

      <div className="space-y-8">
        {/* Developer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Developer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-medium">Niklas Kronig</p>
            <p className="text-muted-foreground">
              TactiHub is a personal project developed and maintained by Niklas Kronig.
            </p>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About TactiHub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              TactiHub is a modern, collaborative strategy planning tool for competitive games.
              It allows teams to draw tactics on game maps, share battle plans, and coordinate
              strategies in real-time.
            </p>
            <p className="text-muted-foreground">
              This project is built upon the ideas and work of two original open-source projects
              that are unfortunately no longer actively maintained. TactiHub merges their best
              features into a single, modern application with a new tech stack and additional functionality.
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* Original Projects */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Based On</h2>
          <p className="text-muted-foreground mb-6">
            TactiHub would not exist without these two projects. While both have been inactive for
            several years, they laid the groundwork for what TactiHub is today.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  r6-map-planner
                  <a
                    href="https://github.com/prayansh/r6-map-planner"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  by <span className="font-medium text-foreground">prayansh</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  A real-time collaborative map planning tool built with Node.js, Express and
                  Socket.IO. It provided the foundation for the real-time collaboration features,
                  live cursor tracking, and the multi-game canvas drawing system.
                </p>
                <a
                  href="https://github.com/prayansh/r6-map-planner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  github.com/prayansh/r6-map-planner
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  r6-maps
                  <a
                    href="https://github.com/jayfoe/r6-maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  by <span className="font-medium text-foreground">jayfoe</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  A battle plan management system built with Laravel and Vue.js. It provided
                  the blueprint for user authentication, database persistence, battle plan
                  management, voting system, and the admin panel.
                </p>
                <a
                  href="https://github.com/jayfoe/r6-maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  github.com/jayfoe/r6-maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Version History */}
        <Card>
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default">v1.5.2</Badge>
                <span className="text-xs text-muted-foreground">Current — 2026-02-12</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Magic Link (passwordless) login via email — enter email or username, receive a login link, click to log in</li>
                <li>Guests can now draw locally in rooms (full toolbar, icons, undo/redo — drawings not persisted or shared)</li>
                <li>PNG export (current floor) and PDF export (all floors as multi-page landscape) for all users including guests</li>
                <li>Icon sidebar with vertical &quot;Icons&quot; label and pulse animation for first-visit discoverability</li>
                <li>Improved map centering with ResizeObserver (fixes top-flush/bottom-gap issue)</li>
                <li>Icon image cache to prevent flicker on re-renders</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.5.1</Badge>
                <span className="text-xs text-muted-foreground">2026-02-12</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Account self-deletion with double confirmation, email verification, and 30-day grace period</li>
                <li>Google reCAPTCHA v2 on registration (optional, works without configuration)</li>
                <li>Account Settings page with account info and danger zone</li>
                <li>Admin: reactivate deactivated users, self-delete protection</li>
                <li>Admin: deactivated user status and days-left countdown in user table</li>
                <li>Fixed DELETE request Content-Type bug (Fastify empty body error)</li>
                <li>Removed redundant admin username bar in admin panel</li>
                <li>User menu moved to far right in navbar</li>
                <li>Complete production deployment guide in README (Nginx, SSL, systemd, ufw)</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.5.0</Badge>
                <span className="text-xs text-muted-foreground">2026-02-12</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Drawings now stay permanent after releasing the mouse button</li>
                <li>Laser Pointer tools: Laser Dot (pulsating point) and Laser Line (fading trail, 3s)</li>
                <li>Operator and gadget icon placement on canvas via Icon tool</li>
                <li>Map cover images for all 21 R6 maps (from Ubisoft)</li>
                <li>Fixed Settings link in Tokens page causing logout</li>
                <li>Removed grey loading bar at bottom of page</li>
                <li>Fixed infinite horizontal scroll bug</li>
                <li>Fixed black canvas on initial plan load</li>
                <li>README table of contents with anchor links</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.4.0</Badge>
                <span className="text-xs text-muted-foreground">2026-02-12</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Floor image variants: Blueprint, Darkprint, and Whiteprint per floor</li>
                <li>View mode switcher on canvas (top-left, only visible when floor has multiple variants)</li>
                <li>Batch image import script for floor images and gadget icons</li>
                <li>Added 3 new R6 maps: Fortress, Nighthaven Labs, Outback</li>
                <li>Correct floor names and counts per map (was generic 4-floor placeholder)</li>
                <li>Removed Bartlett map (no image data available)</li>
                <li>Admin floor upload now supports dark and white image variants</li>
                <li>Gadget icon import from source folder</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.3.0</Badge>
                <span className="text-xs text-muted-foreground">2026-02-12</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Admin manual user verification (with confirmation dialog and notification email)</li>
                <li>Floor layout management UI (upload, reorder, rename, delete per map)</li>
                <li>Fixed "Input Buffer is empty" crash when toggling game/map status without file upload</li>
                <li>Fixed gadget category dropdown visibility in dark mode</li>
                <li>Fixed Radix Switch form values not correctly sent as "true"/"false"</li>
                <li>Gaming-style design across all pages (HUD corners, particles, glow effects, grid background)</li>
                <li>Improved settings page layout clarity</li>
                <li>Admin username moved to top-right corner</li>
                <li>Styled HTML email templates with dark theme, logo, and branded buttons</li>
                <li>New APP_URL env variable for correct email link generation</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.2.2</Badge>
                <span className="text-xs text-muted-foreground">2026-02-12</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Forced credential change on first login with default admin account</li>
                <li>Login accepts username or email</li>
                <li>Token-gated registration flow (separate token entry step when public reg is off)</li>
                <li>Improved admin tables (proper HTML tables with aligned columns)</li>
                <li>Tokens page shows info banner when public registration is enabled</li>
                <li>SMTP SSL/TLS support (SMTP_SECURE env var)</li>
                <li>Back to Homepage links on auth pages</li>
                <li>Larger logo throughout the app</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.2.1</Badge>
                <span className="text-xs text-muted-foreground">2026-02-11</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Zoom + Pan (mouse wheel, pan tool, middle-click, zoom limits 25%-400%)</li>
                <li>Eraser tool (click to delete drawings)</li>
                <li>Undo/Redo (Ctrl+Z / Ctrl+Y, toolbar buttons)</li>
                <li>Share battle plans by link (public toggle, share button)</li>
                <li>Guest access (sandbox mode, room viewing)</li>
                <li>Compass overlay on canvas</li>
                <li>Improved room creation with game/map selection flow</li>
                <li>Help page, FAQ page, and versioned Impressum</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.1.0</Badge>
                <span className="text-xs text-muted-foreground">2026-02-11</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Branding update (TactiHub logo, orange/red color scheme)</li>
                <li>Impressum page with credits to original projects</li>
                <li>README and CLAUDE.md documentation</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1.0.0</Badge>
                <span className="text-xs text-muted-foreground">2026-02-11</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 ml-2">
                <li>Initial release</li>
                <li>Multi-game support (R6 Siege, Valorant)</li>
                <li>Real-time collaboration rooms with Socket.IO</li>
                <li>Canvas drawing (pen, line, rectangle, text, icons)</li>
                <li>Battle plan CRUD with voting system</li>
                <li>Admin panel for game/map/operator management</li>
                <li>JWT authentication with email verification</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              TactiHub is built as a modern TypeScript monorepo using:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>React + Vite (Frontend)</li>
              <li>Fastify (Backend API)</li>
              <li>Socket.IO (Real-time Communication)</li>
              <li>PostgreSQL + Drizzle ORM (Database)</li>
              <li>Redis (Caching & Session Management)</li>
              <li>Tailwind CSS + shadcn/ui (UI)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Source Code */}
        <Card>
          <CardHeader>
            <CardTitle>Source Code</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="https://github.com/niklask52t/TactiHub"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              github.com/niklask52t/TactiHub
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle>Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              TactiHub is a fan-made tool and is not affiliated with, endorsed by, or connected
              to Ubisoft, Riot Games, or any other game publisher. All game names, logos, and
              related assets are trademarks of their respective owners.
            </p>
            <p>
              Map images and operator/agent icons used in this application are property of their
              respective game publishers and are used for informational and educational purposes only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
