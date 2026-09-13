# Nancy Drew Game Portal — Maintenance & Game Ingestion Guide

This document outlines the standard operating procedure for prepping, archiving, and registering new Nancy Drew games into the Portal, as well as debugging legacy engine exceptions.

---

## Part 1: How to Add a New Game

### 1. Folder Structure & Path Rules
All games run out of the root directory `C:\ND\<FolderSignature>\`.

* The default folder signature is the exact game title as listed in `games.json` (e.g., `C:\ND\Curse of Blackmoor Manor\`).
* **Exception:** *Treasure in the Royal Tower* uses shorthand `C:\ND\TRT\`.
* Any other folder shorthand requires an explicit case inside `getGameFolderSignature()` in `index.js`.

---

### 2. Preparing Game Files & Fixing `.ini` Paths

Before archiving the game files, you must ensure the internal `.ini` configuration does not contain machine-specific or legacy setup paths (such as `C:\Nancy Drew\...` or `C:\Program Files\...`).

1. Open the game's primary `.ini` file (e.g., `game.ini`, `Cavanaugh.ini`, or the game-specific abbreviation `.ini`) in a text editor.
2. Locate the `[Nancy Data]` section.
3. Update all path pointers to use root-relative paths targeting `\ND\<FolderSignature>\`:

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
