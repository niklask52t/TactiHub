import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const faqs = [
  {
    q: 'What is TactiHub?',
    a: 'TactiHub is a collaborative strategy planning tool for Rainbow Six Siege. It lets teams draw tactics on game maps, save and share battle plans, and coordinate strategies in real-time.',
  },
  {
    q: 'Which games are supported?',
    a: 'TactiHub currently focuses on Rainbow Six Siege with full map, operator, and gadget data. The platform supports adding additional games through the admin panel — any game with top-down maps can be added.',
  },
  {
    q: 'Do I need an account to use TactiHub?',
    a: 'You can browse public plans, try the Sandbox mode, and draw in rooms as a guest without an account. Guest drawings are local only and not saved. To create rooms and save battle plans, you need to register and log in.',
  },
  {
    q: 'How does registration work?',
    a: 'If public registration is enabled, you can register directly with username, email, and password. If disabled, you need a registration token from an admin first. Each token can only be used once. After registering, you must verify your email before you can log in. If no SMTP server is configured, an admin must manually verify your account in the admin panel.',
  },
  {
    q: 'How do I log in?',
    a: 'You can log in with either your username or email address. After initial setup, the default admin account must change its credentials on first login.',
  },
  {
    q: 'How do I draw on the map?',
    a: 'Select a drawing tool from the toolbar (Pen, Line, Rectangle, or Text), choose your color and line width, then click and drag on the canvas. When using the Text tool, you can adjust the font size with the dropdown in the toolbar. Use the Eraser tool to remove your own drawings.',
  },
  {
    q: 'How do I zoom and pan?',
    a: 'Scroll the mouse wheel to zoom in/out centered on your cursor. Use the Pan tool or hold the middle mouse button and drag to move around the map. The +/- buttons in the bottom-right corner also control zoom.',
  },
  {
    q: 'Can I undo my drawings?',
    a: 'Yes. Press Ctrl+Z to undo and Ctrl+Y (or Ctrl+Shift+Z) to redo. You can also use the undo/redo buttons in the toolbar.',
  },
  {
    q: 'How do I use the laser pointer?',
    a: 'Select the Laser Dot tool (crosshair icon) to show a glowing pointer at your cursor position, visible to all room members. Select the Laser Line tool (presentation icon) to draw temporary lines that fade out over 3 seconds after you release the mouse button. Laser pointer tools are not saved — they are purely for live communication.',
  },
  {
    q: 'How do I place operators or gadgets on the map?',
    a: 'Select the Icon tool (sticker icon) in the toolbar. A picker will appear showing available operators and gadgets for the current game. Select an icon, then click anywhere on the canvas to place it. Placed icons are saved like regular drawings and can be removed with the eraser.',
  },
  {
    q: 'How do rooms work?',
    a: 'Create a room by selecting a game and map. Share the room link or code with teammates. Everyone in the room can draw together in real-time and see each other\'s cursors.',
  },
  {
    q: 'Can guests view my room?',
    a: 'Yes. Anyone with the room link can join the room as a guest. Guests can see drawings, cursors, and draw on the map locally. Their drawings appear only on their screen and are not shared with other room members. Log in to persist and share drawings.',
  },
  {
    q: 'How do I share a battle plan?',
    a: 'Open your plan, toggle the Public switch to make it visible, then click Share to copy the link. Anyone with the link can view public plans without logging in.',
  },
  {
    q: 'What is Sandbox mode?',
    a: 'Sandbox lets you draw on any map without logging in. Drawings are local to your browser and are not saved. It\'s great for trying out TactiHub before creating an account.',
  },
  {
    q: 'How do I switch between floors?',
    a: 'Use the floor switcher in the top-right corner of the canvas, or press K to go up and J to go down.',
  },
  {
    q: 'What are Blueprint, Darkprint, and Whiteprint?',
    a: 'These are different visual styles for the same floor layout. Blueprint is the default colored version, Darkprint is a dark/black version, and Whiteprint is a white/clean version. Use the view mode buttons in the top-left corner of the canvas to switch between them (only visible when a floor has multiple variants).',
  },
  {
    q: 'Can I self-host TactiHub?',
    a: 'Yes. TactiHub is open source. You need Node.js 20+, pnpm, Docker (for PostgreSQL and Redis), and optionally an SMTP server for email verification. See the README for setup instructions.',
  },
  {
    q: 'I\'m not receiving verification emails. What should I check?',
    a: 'Make sure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM are correctly set in your .env file. For SSL (port 465), set SMTP_SECURE=true. For STARTTLS (port 587), leave SMTP_SECURE=false. Also check that APP_URL points to your frontend (not the API server). Check your server logs for SMTP errors.',
  },
  {
    q: 'Can admins verify users manually?',
    a: 'Yes. In the admin panel under Users, click the checkmark icon on any unverified user. A confirmation dialog will appear. Once confirmed, the user is verified and receives a notification email.',
  },
  {
    q: 'How do I upload map floor layouts?',
    a: 'In the admin panel, go to Games > Maps > select a map > Floors. You can upload, reorder, rename, and delete floor layout images for each map.',
  },
  {
    q: 'What is Magic Link Login?',
    a: 'Magic Link is a passwordless login option. On the login page, click "Login with Magic Link", enter your email or username, and you\'ll receive an email with a login link. Click the link to log in instantly — no password needed. The link expires after 15 minutes and can only be used once.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Account Settings (click your username in the top-right menu). In the Danger Zone section, click "Delete Account". You\'ll need to confirm twice and then click a confirmation link sent to your email. After confirming, your account is deactivated for 30 days. During this period, an admin can reactivate it. After 30 days, your account and all associated data are permanently deleted.',
  },
  {
    q: 'What is reCAPTCHA?',
    a: 'reCAPTCHA is a Google service that helps protect the registration form from bots and spam. TactiHub uses reCAPTCHA v2 with the "I\'m not a robot" checkbox. If the server admin has configured it, you\'ll see this checkbox during registration. Simply check the box to verify you\'re human. If reCAPTCHA is not configured, registration works without it.',
  },
  {
    q: 'How do I export my drawings?',
    a: 'Use the export buttons in the bottom-right corner of the canvas (next to the zoom controls). Click the camera icon to download the current floor as a PNG image, or click the file icon to export all floors as a multi-page PDF. The export includes the map background and all visible drawings. Available to everyone, including guests.',
  },
  {
    q: 'Can I move, resize, or rotate drawings after placing them?',
    a: 'Yes. Select the Select tool (arrow icon) in the toolbar, then click on one of your own drawings. You\'ll see an orange highlight with 8 resize handles (small squares at corners and edges) and a rotate handle (circle above). Drag the drawing to reposition, drag a resize handle to scale, or drag the rotate handle to rotate. After drawing something, the tool automatically switches to Select mode so you can adjust immediately. You can only interact with your own drawings \u2014 others\' draws appear dimmed.',
  },
  {
    q: 'Why can\'t I erase someone else\'s drawing?',
    a: 'The eraser and select tools only work on your own drawings. Other users\' drawings appear slightly dimmed on the canvas. This prevents accidental deletion of teammates\' work during collaboration.',
  },
  {
    q: 'How does the in-room chat work?',
    a: 'Click the "Chat" button in the bottom-left corner of the room to open the chat panel. Type a message and press Enter or click Send. Messages are visible to all room members and each user\'s name appears in their assigned color. Chat messages are ephemeral — they are not saved and disappear when you leave the room. Guests can read messages but must log in to send.',
  },
  {
    q: 'How do I tag my battle plans?',
    a: 'When creating a battle plan, you can add tags like "Rush", "Default", "Retake", etc. You can also add or remove tags later in the plan viewer (click the edit icon next to the tags section). Tags help organize your plans and allow filtering on the public plans page. You can use suggested tags or type your own (up to 10 tags, max 30 characters each).',
  },
  {
    q: 'Can I add a description or notes to my battle plan?',
    a: 'Yes. In the battle plan viewer, plan owners can add and edit a description and notes. Click the pencil icon next to each section to edit. The description appears on plan cards in lists, while notes are visible in the full plan viewer.',
  },
  {
    q: 'Why does the tool switch to Select after I draw something?',
    a: 'After completing a drawing (pen, line, rectangle, text), the tool automatically switches to Select mode and highlights the new drawing. This lets you immediately reposition, resize, or rotate what you just drew. The Icon tool stays active so you can place multiple icons in a row.',
  },
  {
    q: 'What is the Operator Lineup?',
    a: 'Each battleplan has 5 defender operator slots (the Lineup). Open the icon sidebar and go to the Lineup tab to assign operators using the dropdown selectors. Once operators are assigned, the Operators and Gadgets tabs automatically filter to show only lineup members and their gadgets. Use the "Show all" checkbox to see everything, with non-lineup items marked in orange.',
  },
  {
    q: 'Can I add attackers to the lineup?',
    a: 'Yes. In the Lineup tab, click "Add Attacker Lineup" to create 5 attacker slots. Attackers only appear in the sidebar when an attacker lineup exists. You can remove the attacker lineup anytime by clicking the trash icon next to the Attackers header.',
  },
  {
    q: 'Why are some operators/gadgets hidden in the sidebar?',
    a: 'When you assign operators to your lineup, the Operators and Gadgets tabs filter to show only lineup members and their associated gadgets. This helps you focus on the relevant items for your strategy. Check the "Show all" box to reveal everything — non-lineup items will show an orange "Nicht im Lineup" warning.',
  },
  {
    q: 'How do I report a bug or suggest a feature?',
    a: 'Open an issue on the GitHub repository at github.com/niklask52t/TactiHub.',
  },
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">FAQ</h1>
      <p className="text-muted-foreground mb-8">Frequently asked questions about TactiHub.</p>

      <div className="space-y-4">
        {faqs.map(({ q, a }, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{q}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
