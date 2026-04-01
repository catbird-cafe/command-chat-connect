import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Book, FileText, Network, Key, Code, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getAppOrigin, getRegistrationPageUrl } from "@/lib/utils";
import { toast } from "sonner";

/** Inline docs with the deployed app URL (same origin as the dashboard). */
function buildDocs(registerUrl: string, appOrigin: string) {
  return [
  {
    id: "architecture",
    title: "Architecture",
    icon: Network,
    content: `## System Diagram

\`\`\`
┌─────────────────────────────────────────────────┐
│                  Web Dashboard                  │
│  (React SPA — Login, Dashboard, Settings, Docs) │
│                                                 │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Sidebar     │  │ ChatView │  │ Settings   │ │
│  │ (presence)  │  │ (msgs)   │  │ (tokens)   │ │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘ │
│         │              │              │         │
│         ▼              ▼              ▼         │
│    Realtime            Realtime       Registration│
│    (Presence)          (Broadcast)    Endpoint    │
└─────────────────────────────────────────────────┘
           ▲                        ▲
           │  WebSocket             │  HTTPS
           │                        │
┌──────────┴────────────────────────┴──────────────┐
│                  CLI Client                       │
│  1. POST /register → gets creds                   │
│  2. Joins lobby (presence)                         │
│  3. Joins chat channel (broadcast)                 │
│  4. stdin → send, stdout ← receive                 │
└───────────────────────────────────────────────────┘
\`\`\`

## Components

| Component | Purpose |
|-----------|---------|
| Web Dashboard | Host UI for managing clients and chatting |
| CLI Client | Terminal-based chat participant |
| Realtime Presence | Tracks online CLI clients |
| Realtime Broadcast | Per-client chat messages |
| Registration Endpoint | Token exchange for client credentials |

## Data Flow

1. Host logs in with a display name
2. Host generates a registration token in Settings
3. CLI client calls the registration endpoint with the token
4. CLI receives connection credentials + a client_id
5. CLI connects to Realtime → appears in sidebar
6. Host clicks client → opens broadcast channel
7. Both sides exchange messages

**No persistence** — messages exist only while both parties are connected.`,
  },
  {
    id: "registration",
    title: "Registration Flow",
    icon: Key,
    content: `## Token Types

| Type | Behavior |
|------|----------|
| \`one_time\` | Used exactly once, then marked spent |
| \`expiry\` | Reusable until the \`expires_at\` date passes |

## Steps

### 1. Generate Token (Web UI)

Go to **Settings** → fill in label, type, and expiry → **Generate Token**. Copy the token.

### 2. Register CLI Client

Go to **${registerUrl}** and paste your token, or install the CLI and register from the shell.

#### Install CLI from this server (curl)

While the app is served (local dev or production), you can install the CLI **without cloning the repo**. Assets are loaded from the same origin (\`${appOrigin}\`):

\`\`\`bash
curl -fsSL ${appOrigin}/install-cli.sh | bash -s -- ${appOrigin}
\`\`\`

This creates a \`client/\` directory **in whatever folder you run the command from**, downloads \`/cli-client/*\` into it, and runs \`npm install\` there. Override the path with \`INSTALL_DIR\`. Requires **curl**, **Node.js 18+**, and **npm**.

Then register:

\`\`\`bash
cd client
REGISTER_URL="${registerUrl}" node cli-client.js <token>
\`\`\`

The client POSTs:

\`\`\`json
{ "token": "<64-char-hex-string>" }
\`\`\`

### 3. Success Response

\`\`\`json
{
  "client_id": "a1b2c3d4",
  "url": "...",
  "key": "..."
}
\`\`\`

Credentials are saved to \`~/.chat-client-creds.json\`. The client uses these automatically on subsequent runs.

### 4. Subsequent Runs

\`\`\`bash
cd client
node cli-client.js
\`\`\`

No token or env vars needed (credentials in \`~/.chat-client-creds.json\`).

## Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Token is required | Missing field |
| 401 | Invalid token | Not in database |
| 401 | Token already used | One-time, already redeemed |
| 401 | Token expired | Past \`expires_at\` |

## Token Table: \`client_tokens\`

| Column | Type | Description |
|--------|------|-------------|
| token | TEXT | 64-char hex (auto-generated) |
| label | TEXT | Optional friendly name |
| token_type | TEXT | \`one_time\` or \`expiry\` |
| expires_at | TIMESTAMPTZ | Expiry date (if applicable) |
| used | BOOLEAN | Redeemed? |
| client_id | TEXT | Assigned on registration |`,
  },
  {
    id: "chat-protocol",
    title: "Chat Protocol",
    icon: FileText,
    content: `## Channels

### 1. Lobby: \`chat-lobby\` (Presence)

Tracks which CLI clients are online.

**Presence payload** (set by CLI):

\`\`\`json
{
  "name": "<client_id>",
  "type": "cli",
  "joinedAt": "2025-01-15T10:30:00.000Z"
}
\`\`\`

**Presence key**: \`cli:<client_id>\` (CLI) / \`lobby\` (web)

**Events**: \`sync\`, \`join\`, \`leave\`

The web dashboard filters by \`type === "cli"\` and deduplicates by \`name\`.

---

### 2. Chat: \`chat:<client_id>\` (Broadcast)

Per-client messaging channel.

**Event name**: \`message\`

**Payload**:

\`\`\`json
{
  "id": "uuid",
  "sender": "display-name",
  "text": "Hello!",
  "timestamp": "2025-01-15T10:31:00Z"
}
\`\`\`

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| sender | string | Who sent it |
| text | string | Content |
| timestamp | string/number | ISO or epoch ms |

## Connection Lifecycle

\`\`\`
CLI Client                         Web Dashboard
    │                                     │
    ├─ Join "chat-lobby" ────────────────►│ presence sync
    ├─ Track presence ───────────────────►│ appears in sidebar
    ├─ Join "chat:<id>" ──────────────────┤
    │                                     │
    │        (host clicks client)         │
    │                                     ├─ Join "chat:<id>"
    │◄──────── message ───────────────────┤ host types
    ├──────── message ────────────────────►│ client types
    │                                     │
    ├─ Disconnect ───────────────────────►│ leaves sidebar
\`\`\``,
  },
  {
    id: "api-reference",
    title: "API Reference",
    icon: Code,
    content: `## Registration Endpoint

### POST \`/register\`

Exchange a token for connection credentials.

**Request**: \`{ "token": "string" }\`

**200**: \`{ "client_id", "url", "key" }\`

**Errors**: 400 (missing token), 401 (invalid/used/expired)

The registration page is at \`${registerUrl}\`.

---

## Realtime Channels

### \`chat-lobby\`

| Feature | Detail |
|---------|--------|
| Type | Presence |
| Presence key (CLI) | \`cli:<client_id>\` |
| Tracked fields | name, type, joinedAt |

### \`chat:<client_id>\`

| Feature | Detail |
|---------|--------|
| Type | Broadcast |
| Event | \`message\` |
| Payload | \`{ id, sender, text, timestamp }\` |

---

## CLI Client

**Install**: \`curl -fsSL ${appOrigin}/install-cli.sh | bash -s -- ${appOrigin}\` (creates \`./client\` in the current directory)

**First run**: \`cd client\` then \`REGISTER_URL=${registerUrl} node cli-client.js <token>\`

**After**: \`node cli-client.js\`

**Deps**: \`@supabase/supabase-js\`, \`ws\` (installed by the script above)

**Requires**: Node.js 18+

**Creds file**: \`~/.chat-client-creds.json\``,
  },
];
}


// Simple markdown-to-JSX renderer (handles code blocks, tables, headers, bold, inline code)
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={elements.length} className="bg-sidebar text-sidebar-foreground rounded-lg p-4 overflow-x-auto text-sm font-mono my-3 border border-sidebar-border">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const bodyRows = tableLines.slice(2); // skip separator
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {headerCells.map((cell, ci) => (
                    <th key={ci} className="text-left p-2 border-b border-border font-semibold text-foreground">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => {
                  const cells = row.split("|").filter(c => c.trim()).map(c => c.trim());
                  return (
                    <tr key={ri}>
                      {cells.map((cell, ci) => (
                        <td key={ci} className="p-2 border-b border-border/50 text-muted-foreground">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headers
    if (line.startsWith("## ")) {
      elements.push(<h2 key={elements.length} className="text-xl font-bold text-foreground mt-8 mb-3">{line.slice(3)}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={elements.length} className="text-lg font-semibold text-foreground mt-6 mb-2">{line.slice(4)}</h3>);
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      elements.push(<hr key={elements.length} className="border-border my-6" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={elements.length} className="border-l-2 border-primary pl-4 text-muted-foreground italic my-3 text-sm">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<p key={elements.length} className="text-muted-foreground leading-relaxed my-2">{renderInline(line)}</p>);
    i++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Handle inline code, bold, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Bold
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

    let firstMatch: { index: number; length: number; node: React.ReactNode } | null = null;

    if (codeMatch && codeMatch.index !== undefined) {
      const candidate = { index: codeMatch.index, length: codeMatch[0].length, node: <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{codeMatch[1]}</code> };
      if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
    }

    if (boldMatch && boldMatch.index !== undefined) {
      const candidate = { index: boldMatch.index, length: boldMatch[0].length, node: <strong key={key++} className="font-semibold text-foreground">{boldMatch[1]}</strong> };
      if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(remaining.slice(0, firstMatch.index));
      }
      parts.push(firstMatch.node);
      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

const Docs = () => {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const hostName = localStorage.getItem("chat-host-name");
  const registerUrl = useMemo(() => getRegistrationPageUrl(), []);
  const appOrigin = useMemo(() => getAppOrigin(), []);
  const docs = useMemo(() => buildDocs(registerUrl, appOrigin), [registerUrl, appOrigin]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) setShowBackToTop(el.scrollTop > 300);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset scroll on doc change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setShowBackToTop(false);
  }, [activeDoc]);

  const currentDoc = activeDoc ? docs.find(d => d.id === activeDoc) : null;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Docs sidebar — fixed */}
      <div className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col h-full">
        <div className="h-12 flex items-center px-4 border-b border-sidebar-border gap-2 cursor-pointer hover:bg-sidebar-accent/30 transition-colors" onClick={() => setActiveDoc(null)}>
          <Book className="h-4 w-4 text-sidebar-primary" />
          <span className="font-semibold text-sm">Documentation</span>
        </div>
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  activeDoc === doc.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <doc.icon className="h-4 w-4 shrink-0" />
                {doc.title}
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70"
            onClick={() => navigate(hostName ? "/dashboard" : "/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {hostName ? "Back to Dashboard" : "Back to Login"}
          </Button>
        </div>
      </div>

      {/* Docs content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <header className="h-12 flex items-center px-6 border-b">
          <div className="flex items-center gap-2">
            {currentDoc ? (
              <>
                <currentDoc.icon className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold text-foreground">{currentDoc.title}</h1>
              </>
            ) : (
              <>
                <Terminal className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold text-foreground">Building a Client</h1>
              </>
            )}
          </div>
        </header>
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl p-6">
            {currentDoc ? (
              renderMarkdown(currentDoc.content)
            ) : (
              <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  Use this documentation to understand the system and build a compatible client. Browse the sections in the sidebar.
                </p>

                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Available Sections</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDoc(doc.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                      >
                        <doc.icon className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-foreground">{doc.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Quick Start</h2>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
                    <li>Generate a registration token in <strong className="text-foreground">Settings</strong></li>
                    <li>
                      Go to{" "}
                      <a href={registerUrl} className="text-primary underline font-medium break-all">
                        {registerUrl}
                      </a>{" "}
                      and paste the token, or use the CLI
                    </li>
                    <li>
                      Install the CLI:{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono break-all block mt-1">
                        {`curl -fsSL ${appOrigin}/install-cli.sh | bash -s -- ${appOrigin}`}
                      </code>
                      <span className="block text-xs text-muted-foreground mt-1">
                        Creates <code className="bg-muted px-1 rounded">./client</code> in your current directory.
                      </span>
                    </li>
                    <li>
                      Register:{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono break-all">
                        {`REGISTER_URL="${registerUrl}" node cli-client.js <token>`}
                      </code>
                      <span className="block text-xs text-muted-foreground mt-1">
                        Run inside <code className="bg-muted px-1 rounded">./client</code> (after <code className="bg-muted px-1 rounded">cd client</code>).
                      </span>
                    </li>
                    <li>
                      Next time:{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">node cli-client.js</code>
                    </li>
                    <li>Start chatting!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-opacity animate-in fade-in zoom-in-50 duration-200"
            title="Back to top"
          >
            <ArrowLeft className="h-4 w-4 rotate-90" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Docs;
