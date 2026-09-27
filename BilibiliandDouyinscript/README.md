# Bilibili / Douyin Web Player Tweaks

Scope: Bilibili web player and Douyin web (`www.douyin.com`) in Edge. Any
Chromium-based browser works the same way.
Loader: Tampermonkey (userscript manager)
Repository contents: 4 script files (stored with a `.txt` extension) + this README

---

## 1. Overview

These scripts fix two separate problems. Each problem has one script per site,
which gives four scripts in total:

| File | Site | Problem it fixes |
| --- | --- | --- |
| `Bilibili - Remove Pause Icon.txt` | Bilibili | The large triangle shown in the middle of the video while paused |
| `Douyin - Remove Pause Icon.txt` | Douyin | The large triangle shown in the middle of the video while paused |
| `Bilibili - No Autoplay When Seeking.txt` | Bilibili | Seeking while paused resumes playback on its own |
| `Douyin - No Autoplay When Seeking.txt` | Douyin | Seeking while paused resumes playback on its own |

The four scripts neither overlap nor conflict and can be installed together. To
cover both behaviours on one site, install both scripts for that site.

---

## 2. Individual scripts

### 2.1 Remove the paused-state triangle -- Bilibili

File: `Bilibili - Remove Pause Icon.txt` (v22.0)

**Effect**: after pausing anywhere on Bilibili, the translucent play/pause
triangle in the centre of the player no longer appears and the picture stays clean.

**How it works**: a CSS rule is injected that hides Bilibili's player state layer
`.bpx-player-video-area .bpx-player-state-wrap` via `display: none`, `opacity: 0`
and disabled pointer events. The rule is re-injected every 1.5 seconds so the icon
cannot come back after Bilibili rebuilds its control bar.

**Trade-off**: the entire state layer is hidden, so anything else Bilibili renders
inside that wrapper (some status tooltips, for example) becomes invisible too. This
is a pure CSS suppression -- it does not touch playback logic, and pausing and
playing behave exactly as before.

### 2.2 Remove the paused-state triangle -- Douyin

File: `Douyin - Remove Pause Icon.txt` (v1.0)

**Effect**: after pausing a video on `www.douyin.com`, the centre play button is
removed from the DOM.

**How it works**: the script listens for the `pause` event on each `<video>` and,
the moment it fires, deletes the overlay nodes found inside the player wrapper. It
covers `.xgplayer-start`, `.xgplayer-controls-pause`,
`[data-e2e="video-pause-icon"]`, plus any class name containing `pause-icon`,
`play-btn` or `pause-btn`. If the video is already paused when the script first sees
it, the removal is repeated 100 ms later. The video element itself and any container
that holds it are explicitly skipped.

**Trade-off**: because nodes are deleted by class name, a Douyin frontend redesign
that renames these classes requires adding the new selectors to the `selectors` list.
Only the icon is affected; clicking to pause and play is untouched.

### 2.3 Keep it paused when seeking -- Bilibili

File: `Bilibili - No Autoplay When Seeking.txt` (v1.0)

**Effect**: pause first, then drag or click the progress bar to another position. On
release the picture holds on the target frame and stays paused instead of playing on
its own. Seeking while the video is already playing is unaffected.

**How it works**: the `seeking` event records whether the video was paused at that
moment; the `seeked` event checks that record and calls `pause()` again only when the
video had been paused before the drag.

**Notes**: newly created `<video>` elements are picked up through a
`MutationObserver` throttled with `requestAnimationFrame`. There is no polling and no
style modification, which makes this the lightest of the four scripts (its own
`@description` states "no highlighting, no polling").

### 2.4 Keep it paused when seeking -- Douyin

File: `Douyin - No Autoplay When Seeking.txt` (v1.1)

**Effect**: identical to 2.3 -- a seek performed while paused ends in the paused
state; a seek performed while playing keeps playing.

**How it works**: the same `seeking` / `seeked` pause-restoration logic (elements are
marked with `dyDragFixed`), with newly mounted players handled by a `MutationObserver`
plus a 3-second safety rescan for nodes reused without a DOM mutation.

**Changes in v1.1**: the previous version carried an unrelated `highlightTitles`
block that painted every video and article title on the page with a random background
colour and re-applied it every 3 seconds. That block has been deleted. This script now
contains only the seek logic and does not modify any visual styling on Douyin.

---

## 3. Installation

1. Install **Tampermonkey** from the Edge Add-ons store and enable it.
2. Open the matching `.txt` file from this folder in a text editor, then copy all of it.
3. Click the Tampermonkey toolbar icon and choose "Create a new script".
4. Clear the template in the editor and paste the copied code.
5. Press `Ctrl + S` to save. The script takes its name from the `@name` field.
6. Reload any Bilibili or Douyin tab that is already open.
7. Repeat steps 2-6 once per feature you want. All four can coexist.
8. To disable a feature temporarily, toggle that script off in the Tampermonkey
   dashboard instead of deleting it.

> `.txt` is only a storage extension. Tampermonkey does not detect it automatically and
> a `.txt` file cannot be dragged into the browser to install, so the copy-paste-save
> flow above is required.

---

## 4. Matching rules and permissions

- Bilibili scripts: `*://www.bilibili.com/*` and `*://bilibili.com/*`
- Douyin scripts: `*://www.douyin.com/*`; `Douyin - No Autoplay When Seeking.txt` also
  declares `*://douyin.com/*`, while `Douyin - Remove Pause Icon.txt` covers only the
  `www` host. Add a second `@match` line yourself if you need the bare domain.
- Every script uses `@grant none`, so no Tampermonkey API is requested and each script
  is confined to the page it runs on.

---

## 5. Known limitations

1. `Douyin - Remove Pause Icon.txt` depends on fixed class names and may break after a
   Douyin redesign.
2. The Bilibili icon blocker reinjects CSS on a 1.5-second timer, and it also hides any
   other tooltip rendered inside `.bpx-player-state-wrap`.
3. The Douyin seek script still polls on a 3-second interval, unlike the Bilibili seek
   script, which is observer-only.
4. The two icon-removal scripts use different strategies (CSS suppression versus node
   deletion), so their behaviour differs in edge cases such as page reloads while
   already paused.

---

## 6. Changelog

- Douyin seek script v1.0 -> v1.1: removed the unrelated random title-highlighting code;
  `@description` updated accordingly.
- All four scripts: English comments added throughout. Code behaviour is unchanged
  except for the removal described above.
- Bilibili icon script: an `@description` field was added, since the script had none.
