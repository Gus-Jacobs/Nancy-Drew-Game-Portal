# Nancy Drew Game Portal — Maintenance & Game Ingestion Guide

This document outlines the standard operating procedure for prepping, archiving, and registering new Nancy Drew games into the Portal, as well as fixing legacy engine exceptions and DirectX/display cr[...]

---

## Table of contents

- Part 1 — How to Add a New Game
  - Folder Structure & Path Rules
  - Preparing Game Files & Fixing `.ini` Paths
  - DirectX & dgVoodoo2 Standardization (Recommended)
  - Packaging Strategy
  - Updating `games.json`
- Part 2 — Common Legacy Engine Errors & Fixes
  - CIF / CAL tree file path issues
  - InitDirectDraw() display mode errors
  - Infinite download / extraction loop
  - Registry & VirtualStore path mismatches
  - SmartScreen / Untrusted execution blocks
  - Sound lag / missing audio / video stuttering

---

## Part 1: How to Add a New Game

### 1. Folder Structure & Path Rules

All games run out of the root directory:

`C:\ND\<FolderSignature>\`

- The default folder signature is the exact game title as listed in `games.json` (e.g., `C:\ND\Curse of Blackmoor Manor\`).
- Exception: *Treasure in the Royal Tower* uses the shorthand `C:\ND\TRT\`.
- Any other folder shorthand requires an explicit case inside `getGameFolderSignature()` in `index.js`.

---

### 2. Preparing Game Files & Fixing `.ini` Paths

Before archiving the game files, ensure the internal `.ini` configuration does not contain machine-specific or legacy setup paths (such as `C:\Nancy Drew\...` or `C:\Program Files\...`).

Steps:

1. Open the game's primary `.ini` file (e.g., `game.ini`, `Cavanaugh.ini`, or the game-specific abbreviation `.ini`) in a text editor.
2. Locate the `[Nancy Data]` section.
3. Update all path pointers to use root-relative paths targeting `\ND\<FolderSignature>\`.

Example `.ini` block:

```ini
[Nancy Data]
CDDrive1=C:
CDDrive2=c:
CDDrive3=c:
HDDrive=C:
IDPath=\ND\<FolderSignature>\
CifTreePath=\ND\<FolderSignature>\Ciftree\
HDVideoPath=\ND\<FolderSignature>\HDVideo\
CDVideoPath=\ND\<FolderSignature>\CDVideo\
HDSoundPath=\ND\<FolderSignature>\HDSound\
CDSoundPath=\ND\<FolderSignature>\CDSound\
LoadSavePath=\ND\<FolderSignature>\
```

Rules:
- Keep trailing backslashes `\` on every directory path.
- Use root-relative format (starting with `\ND\`) to avoid drive-letter parsing quirks and buffer length limits.

---

### 3. DirectX & dgVoodoo2 Standardization (Recommended)

To avoid display mode initialization crashes on modern GPUs (especially Windows 10/11 with Intel Iris Xe, modern AMD, or NVIDIA cards), bundle dgVoodoo2 files directly inside the game's root directory.

Local Template Directory: `Downloads\Projects\Nancy Drew`

Files to copy into `C:\ND\<FolderSignature>\`:
- `DDraw.dll` (from MS\x86)
- `D3DImm.dll` (from MS\x86)
- `dgVoodoo.conf` (configured to suppress the watermark)

Watermark removal: Ensure `dgVoodoo.conf` is included. Under `[DirectX]`, verify:

```ini
dgVoodooWatermark = false
```

so the bottom-right logo does not appear during gameplay.

---

### 4. Packaging Strategy

- Flat Packaging: Ensure game files sit at the root of the archive. Avoid creating double wrappers like `MyArchive.7z` -> `MyGameFolder` -> game files.
- Optional cheatsheet: Place a `guide.md` file inside a subfolder named `cheats/`:
  - `C:\ND\<FolderSignature>\cheats\guide.md`
  - The portal installer automatically extracts this to `C:\ND\cheatsheets\<FolderSignature>\` (or similar).
- Archive Creation: Compress the prepared folder into a `.7z` file using 7-Zip.
- Hosting: Upload the `.7z` file to a public hosting provider, GitHub Release asset, or cloud storage bucket.

---

### 5. Updating games.json

Open `games.json` on the remote repository (or edit locally and push to main). Example entry:

```json
{
  "id": "unique-game-id",
  "title": "Exact Name of Game",
  "executablePath": "game.exe",
  "icon": "assets/icons/game-icon.png",
  "downloadUrl": "https://path-to-your-hosted-archive/GameName.7z"
}
```

Notes:
- `id`: Unique kebab-case slug (e.g., `ghost-dogs-of-moon-lake`).
- `title`: Must match the folder signature if no custom signature exception is registered.
- `executablePath`: Filename of the primary game binary inside the folder (e.g., `Game.exe`, `Moon.exe`).
- `icon`: Path to the thumbnail icon relative to the portal root.
- `downloadUrl`: Direct download link. If left empty, the portal displays a Coming Soon badge.

---

## Part 2: Common Legacy Engine Errors & Fixes

### 1. "unable to open CIF / CAL TREE file ... check the path in your .ini file"
- Cause: The game engine cannot find its asset trees because the path in the `.ini` file does not match the actual folder on disk (e.g., still points to `C:\Nancy Drew\...` or has broken string buffers).
- Fix:
  1. Check `C:\ND\<FolderSignature>\` and locate the game's `.ini` file.
  2. Ensure `CifTreePath` and `IDPath` point to `\ND\<FolderSignature>\` and that subdirectories (`Ciftree`, `HDVideo`, etc.) actually exist at that location.
  3. Ensure trailing backslashes are present on all folder paths.

---

### 2. "InitDirectDraw() - We're sorry - your system cannot play the correct display mode for this game. Game shutting down."
- Cause: The legacy engine queries DirectDraw for a 16-bit color surface or 640x480 full-screen exclusive mode that modern GPU drivers reject.
- Fix:
  - Option A (dgVoodoo2 — Preferred): Drop `DDraw.dll`, `D3DImm.dll`, and `dgVoodoo.conf` from `Downloads\Projects\Nancy Drew` directly into the game's root directory. This wraps DirectDraw calls into modern DirectX.
  - Option B (Registry/Compatibility Flags): Ensure the `compatCmd` in `index.js` sets flags such as:
    - `DISABLEDXMAXIMIZEDWINDOWEDMODE`
    - `16BITCOLOR`
    - `640X480`
    - `RUNASADMIN`
  - Option C (Manual Test): Right-click the `.exe` → Properties → Compatibility → Enable Reduced color mode (16-bit) and Run in 640 x 480 screen resolution.

---

### 3. Infinite Download / Extraction Loop (Stuck at Decrypting/Extracting)
- Cause: In a packaged Electron build (`app.asar`), `7zip-bin` fails to execute `7za.exe` if it attempts to run directly from inside the compressed ASAR archive.
- Fix:
  - Ensure `package.json` contains:

```json
"asarUnpack": ["**/node_modules/7zip-bin/**"]
```

  - Ensure `index.js` checks if the application is packaged and redirects `sevenBin.path7za` to `app.asar.unpacked`:

```javascript
let pathTo7z = sevenBin.path7za;
if (app.isPackaged) {
    pathTo7z = pathTo7z.replace('app.asar', 'app.asar.unpacked');
}
```

---

### 4. Registry & VirtualStore Path Mismatches
- Cause: 32-bit legacy games on 64-bit Windows search `HKCU\Software\Classes\VirtualStore` or `HKCU\Software\WOW6432Node\Her Interactive` for installation paths. If missing, the game fails to boot or save game data.
- Fix: Handled dynamically by `launch-game` in `index.js`:
  - Sets `AppPath` under `VirtualStore\Machine\Software\WOW6432Node\Her Interactive\<GameName>`.
  - Sets `AppPath` under `HKCU\Software\Her Interactive\<GameName>`.
  - Injects compatibility flags under `HKCU\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers`.

---

### 5. SmartScreen / Untrusted Execution Blocks
- Cause: Executables downloaded via web clients receive an NTFS Alternate Data Stream (`Zone.Identifier`) marker, causing Windows SmartScreen to block background execution.
- Fix: Handled automatically in `index.js` prior to process spawn via PowerShell:

```powershell
powershell.exe -Command "Get-ChildItem -Path 'C:\ND\<FolderSignature>' -Recurse | Unblock-File"
```

---

### 6. Sound Lag / Missing Audio / Video Stuttering
- Cause: Legacy games attempt to query hardware DirectSound/DirectMusic acceleration, which Windows Vista and newer deprecated.
- Fix:
  - If background ambient music or character voices loop or stutter, drop `dsoal-aldrv.dll` and `dsound.dll` (DirectSound wrapper) into the game folder, or ensure the `.ini` uses root-relative paths for `HDSound` and `CDSound`.
  - Verify all sound files inside `HDSound\` and `CDSound\` were uncompressed properly during extraction.

---

### 7. "Insert Disc" Prompt & Hardcoded User Paths in `.ini`
* **Cause:** Legacy games check the paths defined in the `[Nancy Data]` section of their `.ini` file for disc media (`IDPath`, `CDVideoPath`, `CDSoundPath`). If an installer was run on your development machine, these paths often get hardcoded to your personal environment (e.g., `\Users\<username>\Downloads\...` or `D:\CDVideo\`). On your PC, the engine finds the folder and passes; on a client machine, that path fails, prompting an **"Insert Disc"** dialog.
* **Fix:**
  1. Open the game's `.ini` file (e.g., `game.ini` or the title's custom `.ini`).
  2. Ensure **all** media folders (`CDVideo`, `CDSound`, `DataFiles`, `HDVideo`, etc.) are moved directly inside `C:\ND\<FolderSignature>\`.
  3. Strip out any references to local user profiles, drive letters (like `D:` or `E:`), or source setup folders.
  4. Standardize the `[Nancy Data]` block to use root-relative paths exclusively within `\ND\<FolderSignature>\`:

```ini
[Nancy Data]
CDDrive1=C:
CDDrive2=C:
CDDrive3=C:
HDDrive=C:

IDPath=\ND\<FolderSignature>\
CifTreePath=\ND\<FolderSignature>\DataFiles\
HDVideoPath=\ND\<FolderSignature>\HDVideo\
CDVideoPath=\ND\<FolderSignature>\CDVideo\
HDSoundPath=\ND\<FolderSignature>\HDSound\
CDSoundPath=\ND\<FolderSignature>\CDSound\
LoadSavePath=\ND\<FolderSignature>\

RunEntirelyFromCDDrive=0
CifTreeAndFilesOnCD=0
TestingModeEnabled=0
ExternalCifFileChecking=1
DebugOutput=0
RunInWindowedMode=0
```
Note: If CDVideo and CDSound folders are identical to or merged into HDVideo and HDSound, point both keys to the corresponding HD directories:

`CDVideoPath=\ND\<FolderSignature>\HDVideo\`

`CDSoundPath=\ND\<FolderSignature>\HDSound\`
