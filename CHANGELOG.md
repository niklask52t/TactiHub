# Changelog

## v1.9.0 — 2026-02-14

- [removed] Valorant game data removed from seed — TactiHub now focuses exclusively on Rainbow Six Siege
- [feature] Screenshot slideshow on Homepage preview section — themed groups with auto-rotate and manual navigation
- [fix] Homepage hero viewport gap on Windows — changed to full-screen height
- [improvement] Updated all documentation to reflect R6 Siege-only focus

## v1.8.1 — 2026-02-13

- [feature] Visual operator lineup picker — clickable image grid replaces dropdown selectors
- [feature] Sandbox mode matches room layout — full-screen canvas with icon sidebar and toolbar
- [fix] Session persistence — sessions now survive page reload (was using GET instead of POST for refresh)
- [fix] Admin self-deletion protection — admin role users can no longer see or trigger account deletion
- [fix] Eraser tool now works immediately — optimistic draw tracking makes draws erasable before API response
- [fix] Select/Move tool works immediately — draws are selectable and movable right after creation
- [fix] Draws persist on floor switch — optimistic draws stay visible while awaiting server confirmation
- [improvement] Server-side admin deletion guard — request-deletion endpoint rejects admin-role users

## v1.8.0 — 2026-02-13

- [feature] Operator Lineup System — select 5 defenders per battleplan to filter the icon sidebar to only lineup operators and their gadgets
- [feature] Optional Attacker Lineup — add a second set of 5 attacker slots on demand, remove when not needed
- [feature] Lineup tab in Icon Sidebar — 3-tab layout (Lineup / Operators / Gadgets) with dropdown selectors for each slot
- [feature] Smart sidebar filtering — operators and gadgets tabs auto-filter to lineup members when operators are assigned
- [feature] "Show all" toggle — reveals all operators/gadgets with orange "Nicht im Lineup" warning on non-lineup items
- [feature] Lineup display on BattleplanViewer — read-only operator avatar circles with DEF/ATK labels and colored borders
- [feature] Real-time lineup sync — operator slot changes broadcast via Socket.IO to all room participants
- [improvement] Gadget filtering uses operator-gadget relationships — only gadgets belonging to lineup operators are shown
- [improvement] Duplicate prevention — already-assigned operators are hidden from lineup dropdowns

## v1.7.0 — 2026-02-13

- [feature] Resize & Rotate for selected drawings — 8 resize handles (corners + edges) and a rotate handle above the bounding box
- [feature] All R6 Siege operators added (~78 total) — complete roster through Year 10 including Skopos, Denari, Striker, Rauora
- [feature] All gadgets now visible in sidebar — text fallback for gadgets without icons, grouped by category (Unique/Secondary/General)
- [feature] Auto-switch to Select tool after drawing — immediately shows resize/rotate handles on the new drawing
- [fix] Fixed undo/redo system — corrected payload indexing, prevented redo from clearing undo stack, eliminated double-push to history
- [fix] Fixed z-index overlaps — chat panel no longer hidden behind compass, icon sidebar toggle, or operator icons
- [fix] Added missing draw:updated socket listener — peer draw updates now sync correctly across room participants
- [improvement] Sticky footer — footer stays at bottom of viewport even when page content is short

## v1.6.0 — 2026-02-13

- [feature] In-room text chat — ephemeral messaging between room participants with unread badge
- [feature] Select & Drag tool — click to select your own drawings, drag to reposition them
- [feature] Ownership-based draw interaction — eraser and select only affect your own drawings, others' draws are dimmed
- [feature] Adjustable font size for Text tool (12–64px selector in toolbar)
- [feature] Battleplan tagging — add tags like "Rush", "Default", "Retake" to organize and filter plans
- [feature] Battleplan description and notes — inline-editable fields for plan owners
- [feature] Tag filtering on public plans page
- [feature] Separate Changelog page
- [improvement] Server-side ownership checks on draw update and delete endpoints
- [improvement] Replaced dev-reset.sh with interactive update.sh (dev/prod mode selector)

## v1.5.2 — 2026-02-12

- [feature] Magic Link (passwordless) login via email — enter email or username, receive a login link, click to log in
- [feature] Guests can now draw locally in rooms (full toolbar, icons, undo/redo — drawings not persisted or shared)
- [feature] PNG export (current floor) and PDF export (all floors as multi-page landscape) for all users including guests
- [feature] Icon sidebar with vertical "Icons" label and pulse animation for first-visit discoverability
- [fix] Improved map centering with ResizeObserver (fixes top-flush/bottom-gap issue)
- [improvement] Icon image cache to prevent flicker on re-renders

## v1.5.1 — 2026-02-12

- [feature] Account self-deletion with double confirmation, email verification, and 30-day grace period
- [feature] Google reCAPTCHA v2 on registration (optional, works without configuration)
- [feature] Account Settings page with account info and danger zone
- [feature] Admin: reactivate deactivated users, self-delete protection
- [feature] Admin: deactivated user status and days-left countdown in user table
- [feature] Complete production deployment guide in README (Nginx, SSL, systemd, ufw)
- [fix] Fixed DELETE request Content-Type bug (Fastify empty body error)
- [improvement] Removed redundant admin username bar in admin panel
- [improvement] User menu moved to far right in navbar

## v1.5.0 — 2026-02-12

- [feature] Laser Pointer tools: Laser Dot (pulsating point) and Laser Line (fading trail, 3s)
- [feature] Operator and gadget icon placement on canvas via Icon tool
- [feature] Map cover images for all 21 R6 maps
- [improvement] Drawings now stay permanent after releasing the mouse button
- [fix] Fixed Settings link in Tokens page causing logout
- [fix] Removed grey loading bar at bottom of page
- [fix] Fixed infinite horizontal scroll bug
- [fix] Fixed black canvas on initial plan load
- [improvement] README table of contents with anchor links

## v1.4.0 — 2026-02-12

- [feature] Floor image variants: Blueprint, Darkprint, and Whiteprint per floor
- [feature] View mode switcher on canvas (top-left, only visible when floor has multiple variants)
- [feature] Batch image import script for floor images and gadget icons
- [feature] Added 3 new R6 maps: Fortress, Nighthaven Labs, Outback
- [improvement] Correct floor names and counts per map (was generic 4-floor placeholder)
- [improvement] Admin floor upload now supports dark and white image variants
- [improvement] Removed Bartlett map (no image data available)
- [feature] Gadget icon import from source folder

## v1.3.0 — 2026-02-12

- [feature] Admin manual user verification (with confirmation dialog and notification email)
- [feature] Floor layout management UI (upload, reorder, rename, delete per map)
- [feature] Gaming-style design across all pages (HUD corners, particles, glow effects)
- [feature] Styled HTML email templates with dark theme, logo, and branded buttons
- [feature] New APP_URL env variable for correct email link generation
- [fix] Fixed "Input Buffer is empty" crash when toggling game/map status without file upload
- [fix] Fixed gadget category dropdown visibility in dark mode
- [fix] Fixed Radix Switch form values not correctly sent as "true"/"false"
- [improvement] Improved settings page layout clarity
- [improvement] Admin username moved to top-right corner

## v1.2.2 — 2026-02-12

- [feature] Forced credential change on first login with default admin account
- [feature] Login accepts username or email
- [feature] Token-gated registration flow (separate token entry step when public reg is off)
- [feature] SMTP SSL/TLS support (SMTP_SECURE env var)
- [improvement] Improved admin tables (proper HTML tables with aligned columns)
- [improvement] Tokens page shows info banner when public registration is enabled
- [improvement] Back to Homepage links on auth pages
- [improvement] Larger logo throughout the app

## v1.2.1 — 2026-02-11

- [feature] Zoom + Pan (mouse wheel, pan tool, middle-click, zoom limits 25%-400%)
- [feature] Eraser tool (click to delete drawings)
- [feature] Undo/Redo (Ctrl+Z / Ctrl+Y, toolbar buttons)
- [feature] Share battle plans by link (public toggle, share button)
- [feature] Guest access (sandbox mode, room viewing)
- [feature] Compass overlay on canvas
- [feature] Help page, FAQ page, and versioned Impressum
- [improvement] Improved room creation with game/map selection flow

## v1.1.0 — 2026-02-11

- [feature] Branding update (TactiHub logo, orange/red color scheme)
- [feature] Impressum page with credits to original projects
- [feature] README and CLAUDE.md documentation

## v1.0.0 — 2026-02-11

- [feature] Initial release
- [feature] Multi-game support (R6 Siege, Valorant)
- [feature] Real-time collaboration rooms with Socket.IO
- [feature] Canvas drawing (pen, line, rectangle, text, icons)
- [feature] Battle plan CRUD with voting system
- [feature] Admin panel for game/map/operator management
- [feature] JWT authentication with email verification
