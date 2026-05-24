# Content Management Audit Report

Source scan limited to live source files under `apps/*`, `packages/*`, and repo root. Generated from audit PDF instructions, repo inspection, and code mapping.

## Entry Points

- `Adnexus2/package.json:5` - root scripts: `build`, `dev`, `lint`, `format`.
- `Adnexus2/apps/web/package.json:6` - web scripts: `dev`, `build`, `start`, `lint`.
- `Adnexus2/start.sh:1` - launches `node server.js` and `pnpm --filter web dev`.
- `Adnexus2/server.js:1` - legacy Express + Socket.IO runtime serving `apps/player`.
- `Adnexus2/apps/web/app/player/page.tsx:1` - Next browser player route.
- `Adnexus2/apps/web/app/display/page.tsx:1` - duplicate Next browser player route.

## Socket / Realtime Matches

- `Adnexus2/server.js:63` - `io.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState)`.
- `Adnexus2/server.js:67` - `socket.on('CLOCK_PING', ...)`.
- `Adnexus2/server.js:68` - `socket.emit('CLOCK_PONG', ...)`.
- `Adnexus2/server.js:70` - `socket.on('ADMIN_FORCE_LOOP_RESET', ...)`.
- `Adnexus2/server.js:75` - `socket.emit('ORCHESTRATED_CAMPAIGN_SYNC', campaignState)`.
- `Adnexus2/apps/player/app.js:59` - `socket.emit('CLOCK_PING', Date.now())`.
- `Adnexus2/apps/player/syncEngine.js:35` - `this.socket.on("CLOCK_PONG", ...)`.
- `Adnexus2/apps/player/syncEngine.js:46` - `this.socket.on("ORCHESTRATED_CAMPAIGN_SYNC", ...)`.
- `Adnexus2/apps/player/syncEngine.js:68` - `this.socket.on('ADMIN_FORCE_LOOP_RESET', ...)`.
- `Adnexus2/apps/player/syncEngine.js:78` - `this.socket.emit('CLOCK_PING', Date.now())`.
- `Adnexus2/apps/display/index.html:93` - Pusher subscribe.
- `Adnexus2/apps/display/index.html:96` - `channel.bind('content-update', ...)`.
- `Adnexus2/apps/display/index.html:101` - `channel.bind('clear-content', ...)`.
- `Adnexus2/apps/web/components/device-player.tsx:123` - Pusher subscribe.
- `Adnexus2/apps/web/components/device-player.tsx:126` - `channel.bind("content-update", ...)`.
- `Adnexus2/apps/web/components/device-player.tsx:132` - `channel.bind("clear-content", ...)`.
- `Adnexus2/apps/web/app/api/admin/assignments/route.ts:46` - `pusher.trigger(... "content-update" ...)`.
- `Adnexus2/apps/web/app/api/admin/assignments/route.ts:78` - `pusher.trigger(... "content-update" ...)`.

## Upload / File Handler Matches

- `Adnexus2/apps/web/app/api/media/upload-url/route.ts:25` - upload metadata intake and signed URL/local upload selection.
- `Adnexus2/apps/web/app/api/media/local-upload/route.ts:20` - scoped local upload key validation.
- `Adnexus2/apps/web/app/api/media/local-upload/route.ts:41` - `Readable.fromWeb(...)`.
- `Adnexus2/apps/web/app/api/media/local-upload/route.ts:43` - `createWriteStream(...)`.
- `Adnexus2/apps/web/app/api/media/route.ts:13` - local upload URL registration path.
- `Adnexus2/apps/web/components/admin-media-studio.tsx:71` - POST `/api/media/upload-url`.
- `Adnexus2/apps/web/components/admin-media-studio.tsx:89` - `XMLHttpRequest` PUT upload.
- `Adnexus2/apps/web/components/admin-media-studio.tsx:112` - POST `/api/media` registration.

## Playback / Loop Logic Matches

- `Adnexus2/apps/web/components/device-player.tsx:29` - playlist state.
- `Adnexus2/apps/web/components/device-player.tsx:31` - primary index state.
- `Adnexus2/apps/web/components/device-player.tsx:95` - heartbeat interval.
- `Adnexus2/apps/web/components/device-player.tsx:148` - `advancePrimary()`.
- `Adnexus2/apps/web/components/device-player.tsx:327` - video `onEnded={advancePrimary}`.
- `Adnexus2/apps/web/components/device-player.tsx:346` - audio `onEnded={advancePrimary}`.
- `Adnexus2/apps/web/components/device-player.tsx:419` - image `setTimeout(...)`.
- `Adnexus2/apps/web/lib/campaign-playlist.ts:33` - `loopPlayback` projected into playlist.
- `Adnexus2/apps/web/app/api/campaigns/[id]/media/route.ts:14` - playback settings persisted.
- `Adnexus2/apps/display/index.html:111` - `loadPlaylist(items)`.
- `Adnexus2/apps/display/index.html:118` - `playNext()`.
- `Adnexus2/apps/display/index.html:223` - image `setTimeout(...)`.
- `Adnexus2/apps/player/syncEngine.js:78` - repeated socket ping interval.
- `Adnexus2/server.js:57` - loop reset interval.

## Dev / Debug Matches

- `Adnexus2/apps/player/developerPanel.js:1` - always-mounted developer panel web component.
- `Adnexus2/apps/player/app.js:5` - `window.socketInstance` exposed globally.
- `Adnexus2/apps/player/app.js:6` - fixed `window.SCREEN_ID`.
- `Adnexus2/start.sh:19` - launches legacy socket server beside web app.

## Findings

- Dual player stacks exist. `apps/web/components/device-player.tsx` uses Next + Pusher. `server.js` + `apps/player/*` uses Socket.IO + vanilla JS. This drift is stability risk.
- Web player looping and image timing lived inline in one component. Timer lifecycle needed central control.
- Vanilla player leaked intervals/listeners/object URLs across long runtime.
- Developer panel in vanilla player was public by default.
- Upload path already streamed, but capped at `500MB` and lacked stronger timeout/error cleanup for large files.
