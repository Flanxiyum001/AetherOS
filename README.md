# Aether OS

A **serverless, peer-to-peer operating system in your browser**. No accounts, no
backend, no hosting bills — everything flows directly between browsers over
WebRTC data channels.


## What it does

- 🖥️ **Desktop environment** — boot screen, draggable/resizable windows, dock,
  menu bar, all styled like a neon CRT from a cyberpunk basement.
- 🧑‍🤝‍🧑 **Room-based presence** — create a machine, share the 6-char room code,
  and friends "log in" to the same machine from anywhere.
- 💬 **Chat** — realtime peer-to-peer chat, no server relays involved.
- 💾 **Shared Drive** — drag & drop files into the OS; they're stored locally in
  IndexedDB, and stream **bit-by-bit directly** to peers who request them.
  No file ever touches a server.
- 🏓 **Pong** — multiplayer Pong synced over the same P2P data channel.
- ⌨️ **Terminal** — a fake shell (`help`, `peers`, `ls`, `df`, `fortune`...)
  wired into real OS state.
- 📡 **Monitor** — live network stats, peer list, and an ambient oscilloscope.

## How it works

1. **Signaling**: [Trystero](https://github.com/dmotz/trystero) handles WebRTC
   matchmaking over public Nostr relays — your app data never touches them.
2. **Data**: once connected, all chat, file payloads, and game state travel
   directly browser↔browser, end-to-end encrypted by WebRTC.
3. **Storage**: files live in IndexedDB per machine; metadata is synced across
   the room so peers see the same virtual drive.

## Run it

```bash
bun install
bun run dev
```

Then open the app, create a machine, and open a second browser tab (or send the
room code to a friend) and join.

## Build

```bash
bun run build
```

Static output lands in `dist/` — host it anywhere.

## Deploy to GitHub Pages (free, auto)

The repo ships with `.github/workflows/deploy.yml`. On every push to `main` it
installs with Bun, runs the full test suite (deploys are blocked if a spec
fails), builds, and publishes to Pages.

One-time enablement in the GitHub UI:

1. **Settings → Pages → Build and deployment → Source** → set to
   **GitHub Actions**.
2. Push to `main` (or use the *Run workflow* button on the Actions tab).

Live URL: `https://<username>.github.io/AetherOS/`

The build sets `VITE_BASE=/AetherOS/` (derived from the repo name in
`deploy.yml`) so asset paths match the Pages URL. If you rename the repo, the
workflow picks up the new name automatically.

## Architecture

```
src/
├── store.ts          # zustand OS state (windows, peers, files, transfers)
├── net.ts            # Trystero room + actions (chat, drive, pong)
├── drive.ts          # IndexedDB virtual filesystem
├── App.tsx           # boot → lobby → desktop router
└── components/
    ├── BootScreen.tsx
    ├── Lobby.tsx
    ├── Desktop.tsx
    ├── Window.tsx    # draggable/resizable window chrome
    ├── Dock.tsx
    ├── TransferHud.tsx
    ├── ChatApp.tsx
    ├── DriveApp.tsx
    ├── PongApp.tsx
    ├── TerminalApp.tsx
    └── MonitorApp.tsx
```

## Notes

- Some strict NATs may need TURN; Trystero lets you pass `turnConfig` to
  `joinRoom` if you want to plug one in.
- Files persist locally per browser until deleted from the Drive app.
