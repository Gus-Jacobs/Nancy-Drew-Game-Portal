# Nancy Drew Game Portal

A Windows desktop launcher (Electron) for the Nancy Drew PC games. It shows every game in the series, downloads and extracts the ones that are available, launches them with the registry/compatibility fixes the old games need, shows a cheatsheet for each game, tracks play time, and tells users when a new portal version is out.

**The key idea:** the game list, download links, icons, cheatsheets and the "update available" version all live in this GitHub repo. The installed portal reads them from GitHub every time it starts, so almost everything can be changed **without rebuilding the .exe**.

---

## Contents

- [How it works](#how-it-works)
- [Adding or enabling a game](#adding-or-enabling-a-game)
- [Adding or editing a cheatsheet](#adding-or-editing-a-cheatsheet)
- [Releasing a new portal version](#releasing-a-new-portal-version)
- [What needs a rebuild and what doesn't](#what-needs-a-rebuild-and-what-doesnt)
- [Troubleshooting: is it me or the app?](#troubleshooting-is-it-me-or-the-app)
- [Development](#development)
- [History](#history)

---

## How it works

### On startup
1. The portal downloads `games.json` from
   `https://raw.githubusercontent.com/Gus-Jacobs/Nancy-Drew-Game-Portal/main/games.json`.
2. If that works, it saves a copy to `%APPDATA%\gameportal\games-cache.json`.
3. If GitHub can't be reached (offline, or `games.json` is broken), it uses that saved copy. If there is no saved copy either, it uses the `games.json` that was built into the .exe.
4. If `appVersion` in `games.json` is **newer** than the installed portal version, it shows the "System Update Available" popup.

### Where things go on the user's PC

| What | Location |
|---|---|
| Installed games | `C:\ND\<Game Title>\` (e.g. `C:\ND\Ghost Dogs of Moon Lake\`) |
| Treasure in the Royal Tower (only exception) | `C:\ND\TRT\` |
| Cheatsheets (offline copies) | `C:\ND\cheatsheets\<Game Title>\guide.md` |
| Saved game list | `%APPDATA%\gameportal\games-cache.json` |
| Play time stats | `%APPDATA%\gameportal\metrics.json` |
| Log file | `%APPDATA%\gameportal\logs\main.log` |

### Downloading a game
1. Downloads `downloadUrl` to `C:\ND\`.
2. `.7z` files are extracted into `C:\ND\<Game Title>\`. `.exe` files are just moved there.
3. If the archive contains **one single folder** at its top level, its contents are moved up a level, so both archive layouts work.
4. If the extracted game has a `cheats` folder, it's moved to `C:\ND\cheatsheets\<Game Title>\`.
5. A game counts as "installed" if a folder named after its title exists in `C:\ND\`.

### Playing a game
The portal runs `C:\ND\<Game Title>\<executablePath>` with that folder as the working directory. First it sets the Her Interactive registry keys and compatibility flags, and unblocks the files.

---

## Adding or enabling a game

All games are listed in [`games.json`](games.json). A game with an empty `downloadUrl` shows as not available. A game with a URL shows as downloadable.

### Step 1: Prepare the archive
- Make a **`.7z`** of the game folder (a single `.exe` also works).
- Either put the game files at the root of the archive, or put them in one folder. Both work.
- *(Optional)* Include a `cheats\guide.md` inside the game folder to ship a cheatsheet with the download. Hosting it in the repo is usually better, see [cheatsheets](#adding-or-editing-a-cheatsheet).
- Note the **exact file name of the game's executable** as it will be after extraction (e.g. `Game.exe`, `Waverly.exe`, `setup.exe`). Copy it exactly.

### Step 2: Upload it to the game release
- Go to **Releases → `2.0.0` ("Portal v2") → Edit** and drag the archive into the assets area. Save.
- GitHub release assets have a **2 GB per file** limit.
- GitHub replaces spaces in file names with dots (`Ghost Dogs of Moon Lake.7z` → `Ghost.Dogs.of.Moon.Lake.7z`). **Copy the link from the release page** instead of typing it.
- Check the link: pasting it into a browser should start a download.

### Step 3: Edit `games.json`
For an **existing entry**, fill in `downloadUrl` and check `executablePath`:

```json
{
  "id": "ghost-dogs-of-moon-lake",
  "title": "Ghost Dogs of Moon Lake",
  "icon": "assets/game_icons/Ghost_Dogs_of_Moon_Lake.jpeg",
  "downloadUrl": "https://github.com/Gus-Jacobs/Nancy-Drew-Game-Portal/releases/download/2.0.0/Ghost.Dogs.of.Moon.Lake.7z",
  "executablePath": "game.exe",
  "cheatsheetPath": "cheatsheets/Ghost Dogs of Moon Lake",
  "installed": false
}
```

For a **brand-new game**, add a new entry (mind the commas between entries!):

| Field | What to put | Notes |
|---|---|---|
| `id` | lowercase-with-dashes, unique | Used for the "new games" popup. **Never change it** once released. |
| `title` | The game's display name | Also the install folder name. **Never rename** an existing game's title, or users' installed copies won't be found. |
| `icon` | `assets/game_icons/<File>.png` | Commit the image to that folder. It loads from GitHub if it isn't built into the .exe. A full `https://` image URL also works. |
| `downloadUrl` | The release asset link, or `""` | Must end in `.7z` or `.exe`. |
| `executablePath` | The game's exe file name | Relative to the game folder, e.g. `Game.exe`. Use `Subfolder/Game.exe` if it's nested deeper. |
| `cheatsheetPath` | `cheatsheets/<Game Title>` | Folder in this repo where `guide.md` lives. |
| `installed` | `false` | Not used by the app, keep it for consistency. |

### Step 4: Commit to `main`
You can edit `games.json` directly on github.com. **Before committing, make sure the JSON is valid.** Paste it into https://jsonlint.com if unsure. A trailing comma or missing quote makes the whole file invalid, and users will be stuck on their saved copy until it's fixed.

### Step 5: Check it
- Open `https://raw.githubusercontent.com/Gus-Jacobs/Nancy-Drew-Game-Portal/main/games.json` and confirm your change is there. **GitHub can take up to ~5 minutes** to serve the new version.
- **Fully close and reopen the portal.** It only reads `games.json` at startup.

---

## Adding or editing a cheatsheet

Cheatsheets are plain Markdown/text files. **No rebuild and no re-uploading the game needed.**

1. Create the file at **`cheatsheets/<Game Title>/guide.md`** in this repo. The folder must match the game's `cheatsheetPath` in `games.json` **exactly** (capitals, spaces, apostrophes).
   - e.g. `cheatsheets/Ghost Dogs of Moon Lake/guide.md`
   - Careful: *Lights, Camera, Curses* uses `cheatsheets/LightsCameraCurses`.
2. The file must be named exactly `guide.md` (lowercase).
3. Commit and push to `main`.

When a user opens the game's info page, the portal loads `guide.md` from GitHub and saves an offline copy. If GitHub can't be reached or the file doesn't exist, it shows the offline copy (from an earlier view, or from a `cheats` folder in the game archive).

> `.gitignore` ignores everything in `cheatsheets/` **except** files named `guide.md`, so other files (images, notes) placed there won't be committed.

---

## Releasing a new portal version

Only needed when the **app code** changes (see the table below).

1. Bump `"version"` in [`package.json`](package.json) (e.g. `1.0.2` → `1.0.3`).
2. Commit and push.
3. Build: `npm run dist`. This runs webpack, then electron-builder.
   The installer is created at `dist_electron/GamePortal-Setup-<version>.exe`.
4. On GitHub, create a **new release** with tag **`v<version>`** (e.g. `v1.0.3`, **with the `v`**) and upload that installer **without renaming it**.
5. **Only after the release is published**, set `"appVersion": "<version>"` in `games.json` and push.

The portal builds the download link as:
```
https://github.com/Gus-Jacobs/Nancy-Drew-Game-Portal/releases/download/v<appVersion>/GamePortal-Setup-<appVersion>.exe
```
If the tag or file name doesn't match exactly, the update download fails and the portal opens that link in the browser instead. If you bump `appVersion` before uploading, users get a broken link.

> Installing an update doesn't touch installed games in `C:\ND`.

---

## What needs a rebuild and what doesn't

| Change | Rebuild .exe? | What to do |
|---|---|---|
| Make a game downloadable / change a download link | **No** | Edit `games.json` |
| Add a brand-new game | **No** | Edit `games.json` and commit its icon |
| Change a game's executable name | **No** | Edit `games.json` |
| Add or edit a cheatsheet | **No** | Commit `cheatsheets/<Title>/guide.md` |
| Change a game icon | **No** (new file name) | Commit the icon under a **new** file name and point `icon` at it. Icons already built into the .exe are used first. |
| Tell users an update exists | **No** | Bump `appVersion` in `games.json` (after the release exists) |
| Change anything in `index.js`, `src/`, styles, intro video, bundled assets | **Yes** | [Release a new portal version](#releasing-a-new-portal-version) |
| Change the TRT folder exception or `C:\ND` location | **Yes** | Code change in `index.js` |

---

## Troubleshooting: is it me or the app?

**First, always check the log:** `%APPDATA%\gameportal\logs\main.log` (paste into the Explorer address bar). Look for the lines right after the latest `Attempting to fetch remote games.json...`.

| Symptom | Likely cause | Fix |
|---|---|---|
| New game / URL doesn't show up | Portal wasn't fully restarted, or GitHub hasn't served the new file yet | Wait ~5 min, check the raw URL (Step 5 above), close and reopen the portal |
| Log says `Error fetching remote games.json` with a JSON/`does not contain a games list` message | `games.json` is invalid | Validate at jsonlint.com and fix the commit |
| Log says `loaded games.json fallback from ...games-cache.json` | Couldn't reach GitHub | Check the internet connection. The saved list is used meanwhile |
| Download fails / 404 | `downloadUrl` is wrong (usually spaces vs dots) | Copy the link from the release page, test it in a browser |
| "Game executable missing" when pressing Play | `executablePath` doesn't match the extracted file, or the exe is nested deeper | Look inside `C:\ND\<Game Title>\` and fix `executablePath` |
| Game shows installed but won't launch after a title rename | Install folder is named after the **old** title | Don't rename titles. Rename the folder in `C:\ND` if it already happened |
| Cheatsheet says "No cheatsheet available" | Folder name doesn't match `cheatsheetPath`, or file isn't named `guide.md` | Check the repo path matches exactly |
| Update popup never appears | `appVersion` isn't higher than installed version, or user is on **v1.0.1** | v1.0.1 has a bug that ignores remote data, so those users must install v1.0.2+ manually once |
| Update download fails and browser opens instead | Release tag or installer name doesn't match | Tag must be `v<version>`, file must be `GamePortal-Setup-<version>.exe` |

---

## Development

```bash
npm install        # install dependencies
npm start          # build the UI with webpack and run the portal
npm run dist       # build the Windows installer into dist_electron/
```

- `index.js`: Electron main process (fetching data, downloads, launching, updates)
- `src/preload.js`: bridge between main process and UI
- `src/renderer/`: React UI
- `games.json`: master game list (the copy on GitHub `main` is what users get)
- `assets/game_icons/`: cover art

> **Running from VS Code's terminal:** if the built app instantly exits, the `ELECTRON_RUN_AS_NODE` environment variable is set in that terminal. Run it from a normal Explorer double-click, or clear that variable first.

Where to find the games: the Nancy Drew PC collection is on the Internet Archive:
https://archive.org/download/nancy-drew-PC-Game-Collection

Some games have DirectX issues from that source; they are also available from SteamUnlocked:
https://steamunlocked.net/?s=nancy+drew

---

## History

**12/16/2024 – 12/24/2024: v1**
A very basic portal to organize the games in a user-friendly interface. It read game folders from a root `nd` directory (each with a `cover.jpg`) and ran a per-game `game_launcher.exe`, since each game's executable had a different name.

**08/13/2025**
Rebuilt on Electron and linked to all 34 Nancy Drew games, with cheatsheets and other new features.

**v1.0.1**
Fixed the 7-Zip path inside the packaged app, added registry virtualization fixes, and added play time tracking.

**v1.0.2**
Fixed remote `games.json` updates never reaching installed portals (the cache was being written into the read-only `app.asar`, which made the portal discard the fresh data). Added a saved offline copy of the game list, cheatsheets and icons hosted in the repo, a more reliable update check, and fixed the DirectX installer button.
