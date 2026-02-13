# Changelog

## v1.6.0 — 2026-02-13

- In-room text chat — ephemeral messaging between room participants with unread badge
- Select & Drag tool — click to select your own drawings, drag to reposition them
- Ownership-based draw interaction — eraser and select only affect your own drawings, others' draws are dimmed
- Adjustable font size for Text tool (12–64px selector in toolbar)
- Battleplan tagging — add tags like "Rush", "Default", "Retake" to organize and filter plans
- Battleplan description and notes — inline-editable fields for plan owners
- Tag filtering on public plans page
- Server-side ownership checks on draw update and delete endpoints
- Separate Changelog page (moved from Impressum)
- Replaced dev-reset.sh with interactive update.sh (dev/prod mode selector)

## v1.5.2 — 2026-02-12

- Magic Link (passwordless) login via email — enter email or username, receive a login link, click to log in
- Guests can now draw locally in rooms (full toolbar, icons, undo/redo — drawings not persisted or shared)
- PNG export (current floor) and PDF export (all floors as multi-page landscape) for all users including guests
- Icon sidebar with vertical "Icons" label and pulse animation for first-visit discoverability
- Improved map centering with ResizeObserver (fixes top-flush/bottom-gap issue)
- Icon image cache to prevent flicker on re-renders

## v1.5.1 — 2026-02-12

- Account self-deletion with double confirmation, email verification, and 30-day grace period
- Google reCAPTCHA v2 on registration (optional, works without configuration)
- Account Settings page with account info and danger zone
- Admin: reactivate deactivated users, self-delete protection
- Admin: deactivated user status and days-left countdown in user table
- Fixed DELETE request Content-Type bug (Fastify empty body error)
- Removed redundant admin username bar in admin panel
- User menu moved to far right in navbar
- Complete production deployment guide in README (Nginx, SSL, systemd, ufw)

## v1.5.0 — 2026-02-12

- Drawings now stay permanent after releasing the mouse button
- Laser Pointer tools: Laser Dot (pulsating point) and Laser Line (fading trail, 3s)
- Operator and gadget icon placement on canvas via Icon tool
- Map cover images for all 21 R6 maps (from Ubisoft)
- Fixed Settings link in Tokens page causing logout
- Removed grey loading bar at bottom of page
- Fixed infinite horizontal scroll bug
- Fixed black canvas on initial plan load
- README table of contents with anchor links

## v1.4.0 — 2026-02-12

- Floor image variants: Blueprint, Darkprint, and Whiteprint per floor
- View mode switcher on canvas (top-left, only visible when floor has multiple variants)
- Batch image import script for floor images and gadget icons
- Added 3 new R6 maps: Fortress, Nighthaven Labs, Outback
- Correct floor names and counts per map (was generic 4-floor placeholder)
- Removed Bartlett map (no image data available)
- Admin floor upload now supports dark and white image variants
- Gadget icon import from source folder

## v1.3.0 — 2026-02-12

- Admin manual user verification (with confirmation dialog and notification email)
- Floor layout management UI (upload, reorder, rename, delete per map)
- Fixed "Input Buffer is empty" crash when toggling game/map status without file upload
- Fixed gadget category dropdown visibility in dark mode
- Fixed Radix Switch form values not correctly sent as "true"/"false"
- Gaming-style design across all pages (HUD corners, particles, glow effects, grid background)
- Improved settings page layout clarity
- Admin username moved to top-right corner
- Styled HTML email templates with dark theme, logo, and branded buttons
- New APP_URL env variable for correct email link generation

## v1.2.2 — 2026-02-12

- Forced credential change on first login with default admin account
- Login accepts username or email
- Token-gated registration flow (separate token entry step when public reg is off)
- Improved admin tables (proper HTML tables with aligned columns)
- Tokens page shows info banner when public registration is enabled
- SMTP SSL/TLS support (SMTP_SECURE env var)
- Back to Homepage links on auth pages
- Larger logo throughout the app

## v1.2.1 — 2026-02-11

- Zoom + Pan (mouse wheel, pan tool, middle-click, zoom limits 25%-400%)
- Eraser tool (click to delete drawings)
- Undo/Redo (Ctrl+Z / Ctrl+Y, toolbar buttons)
- Share battle plans by link (public toggle, share button)
- Guest access (sandbox mode, room viewing)
- Compass overlay on canvas
- Improved room creation with game/map selection flow
- Help page, FAQ page, and versioned Impressum

## v1.1.0 — 2026-02-11

- Branding update (TactiHub logo, orange/red color scheme)
- Impressum page with credits to original projects
- README and CLAUDE.md documentation

## v1.0.0 — 2026-02-11

- Initial release
- Multi-game support (R6 Siege, Valorant)
- Real-time collaboration rooms with Socket.IO
- Canvas drawing (pen, line, rectangle, text, icons)
- Battle plan CRUD with voting system
- Admin panel for game/map/operator management
- JWT authentication with email verification
