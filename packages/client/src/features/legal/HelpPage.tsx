import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Keyboard, Mouse, Pencil, Move, ZoomIn, Eraser, Type, Minus, Square, Users, Share2, Shield } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Help</h1>
      <p className="text-muted-foreground mb-8">Learn how to use TactiHub's canvas, tools, and collaboration features.</p>

      <div className="space-y-8">
        {/* Drawing Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Drawing Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Pencil className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Pen</p>
                  <p className="text-sm text-muted-foreground">Freehand drawing. Click and drag to draw paths.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Minus className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Line</p>
                  <p className="text-sm text-muted-foreground">Click start point, drag to end point for straight lines.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Square className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Rectangle</p>
                  <p className="text-sm text-muted-foreground">Click and drag to draw rectangular shapes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Type className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Text</p>
                  <p className="text-sm text-muted-foreground">Click on the canvas, then type your text in the prompt.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eraser className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Eraser</p>
                  <p className="text-sm text-muted-foreground">Click on any drawing to delete it.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Move className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Pan</p>
                  <p className="text-sm text-muted-foreground">Click and drag to move around the map. Also works with middle mouse button.</p>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">
                Use the <strong>color picker</strong> to change the drawing color and the <strong>slider</strong> to adjust line width.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ZoomIn className="h-5 w-5" /> Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Mouse className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Zoom</p>
                <p className="text-sm text-muted-foreground">Scroll the mouse wheel to zoom in/out, centered on your cursor. Zoom range: 25% to 400%.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Move className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Pan</p>
                <p className="text-sm text-muted-foreground">Use the Pan tool or hold middle mouse button and drag to move around the map.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ZoomIn className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Zoom Controls</p>
                <p className="text-sm text-muted-foreground">Use the +/- buttons in the bottom-right corner, or click the reset button to return to 100%.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Keyboard className="h-5 w-5" /> Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Ctrl + Z', 'Undo last drawing'],
                ['Ctrl + Y', 'Redo drawing'],
                ['Ctrl + Shift + Z', 'Redo drawing (alternative)'],
                ['K', 'Go to floor above'],
                ['J', 'Go to floor below'],
                ['Middle Mouse', 'Pan (drag)'],
                ['Scroll Wheel', 'Zoom in/out'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
                  <kbd className="text-xs font-mono bg-background px-2 py-0.5 rounded border">{key}</kbd>
                  <span className="text-sm text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collaboration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create a room by choosing a game and map. Share the invite link with your teammates — they can join by clicking the link or entering the room code.</p>
            <p>Everyone in the room sees each other's drawings and cursor positions in real-time. Each user gets assigned a unique color.</p>
            <p>Guests can view rooms without logging in, but they need to be logged in to draw.</p>
          </CardContent>
        </Card>

        {/* Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Sharing Battle Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Battle plans are private by default. To share a plan:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open the plan in the viewer</li>
              <li>Toggle the <strong>Public</strong> switch to make it visible to everyone</li>
              <li>Click <strong>Share</strong> to copy the direct link</li>
            </ol>
            <p>Public plans appear in the community section where others can view, vote, and copy them.</p>
          </CardContent>
        </Card>

        {/* Sandbox */}
        <Card>
          <CardHeader>
            <CardTitle>Sandbox Mode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Want to try TactiHub without creating an account? Use the <strong>Sandbox</strong> to draw on any map locally.
              Sandbox drawings are not saved — log in and create a room or battle plan to persist your work.
            </p>
          </CardContent>
        </Card>

        {/* Admin Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Admins have access to the admin panel for managing the platform:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Games</strong> — Add/edit games with name, slug, icon, and active status</li>
              <li><strong>Maps</strong> — Add maps per game with thumbnail, competitive/active toggles</li>
              <li><strong>Floor Layouts</strong> — Upload and manage floor images for each map (reorder, rename, delete)</li>
              <li><strong>Operators &amp; Gadgets</strong> — Manage operators/agents and their gadgets/abilities with icons</li>
              <li><strong>Users</strong> — View all users, toggle roles (admin/user), manually verify emails, delete users</li>
              <li><strong>Tokens</strong> — Create single-use registration tokens when public registration is disabled</li>
              <li><strong>Settings</strong> — Toggle public registration on/off</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
