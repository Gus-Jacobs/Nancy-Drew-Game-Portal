const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const log = require('electron-log');
const { exec, spawn } = require('child_process');
const { version } = require('./package.json'); // Tracks local app version for auto-updates
const sevenBin = require('7zip-bin');

let mainWindow;
let gamesData = [];
let pendingUpdate = null;

// Configure electron-log to capture everything neatly
log.transports.file.level = 'info';

// Standardized custom short root path destinations to eradicate legacy string truncation bugs completely
const PORTAL_ROOT_DIR = "C:\\ND";
const CHEATS_ROOT_DIR = "C:\\ND\\cheatsheets";

// --- THE SEAMLESS ROUTING DICTIONARY ---
// Defaults folders directly to their Game Titles, utilizing a single explicit shorthand exception for TRT
const getGameFolderSignature = (gameTitle) => {
    const cleanTitle = gameTitle.trim();
    if (cleanTitle === "Treasure in the Royal Tower") return "TRT";
    return cleanTitle; 
};

// Remote content lives in the GitHub repo; the installed .exe only ships a bundled fallback copy of games.json
const REPO_RAW_BASE = 'https://raw.githubusercontent.com/Gus-Jacobs/Nancy-Drew-Game-Portal/main';
const REMOTE_GAMES_URL = `${REPO_RAW_BASE}/games.json`;

// Builds a raw GitHub URL from a repo-relative path, encoding each segment (titles contain spaces/apostrophes)
const toRepoRawUrl = (relativePath) =>
    `${REPO_RAW_BASE}/${relativePath.split(/[\/]/).filter(Boolean).map(encodeURIComponent).join('/')}`;

// Accepts either the legacy bare array or the { appVersion, games } object format
const isValidGamesData = (data) =>
    Array.isArray(data) || (data && typeof data === 'object' && Array.isArray(data.games));

// Numeric dotted-version comparison so an older remote appVersion never prompts a downgrade
const isNewerVersion = (remote, local) => {
    const a = String(remote).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const b = String(local).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return false;
};

async function fetchGamesData() {
  // The app directory is inside the read-only app.asar once packaged, so the cache must live in userData
  const cachePath = path.join(app.getPath('userData'), 'games-cache.json');
  const bundledPath = path.join(__dirname, 'games.json');

  try {
    log.info('Attempting to fetch remote games.json...');
    const response = await axios.get(REMOTE_GAMES_URL, {
      responseType: 'json',
      timeout: 10000,
      headers: { 'Cache-Control': 'no-cache' }
    });
    // axios hands back a raw string if the JSON fails to parse, so validate the shape explicitly
    const remoteGames = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    if (!isValidGamesData(remoteGames)) {
      throw new Error('Remote games.json does not contain a games list.');
    }
    log.info('Successfully fetched remote games.json.');

    // Caching is best-effort: a failed write must never discard freshly fetched data
    try {
      await fs.outputJson(cachePath, remoteGames, { spaces: 2 });
      log.info('Successfully cached remote games.json locally.');
    } catch (cacheError) {
      log.warn('Could not cache remote games.json (continuing with remote data):', cacheError.message);
    }

    return remoteGames;
  } catch (remoteError) {
    log.warn('Error fetching remote games.json, attempting to load local fallback:', remoteError.message);
  }

  for (const fallbackPath of [cachePath, bundledPath]) {
    try {
      const localGames = await fs.readJson(fallbackPath);
      if (isValidGamesData(localGames)) {
        log.info(`Successfully loaded games.json fallback from ${fallbackPath}.`);
        return localGames;
      }
    } catch (localError) {
      log.warn(`Could not load games.json fallback from ${fallbackPath}:`, localError.message);
    }
  }

  log.error('Failed to load game data from both remote and local sources.');
  return [];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'build', 'icon.png'), // Title bar shortcut tracking hook
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Opens Chromium DevTools context window instantly at launch to monitor render execution cycles
  if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    callback({ path: path.normalize(path.join(__dirname, url)) });
  });

  gamesData = await fetchGamesData();
  
  // Extract and map list for safety verification logs
  const gameList = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
  log.info('gamesData loaded:', gameList.map(g => g.title));
  
  // Core Auto-Update Logic: Check remote version against local bundle version metadata
  const remoteVersion = gamesData.appVersion;
  if (remoteVersion && isNewerVersion(remoteVersion, version)) {
    log.info(`Update Available! Local version: ${version} -> Remote version: ${remoteVersion}`);
    pendingUpdate = {
      local: version,
      remote: remoteVersion,
      url: `https://github.com/Gus-Jacobs/Nancy-Drew-Game-Portal/releases/download/v${remoteVersion}/GamePortal-Setup-${remoteVersion}.exe`
    };
  }

  createWindow();

  if (pendingUpdate) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('update-available', pendingUpdate);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Fetching Games List normalized for the front-end architecture
ipcMain.handle('get-games', async () => {
    const list = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
    return list.map(game => ({...game, icon: resolveIconUrl(game.icon)}));
});

// Icons bundled in the .exe load locally; icons for games added after a build load from the repo instead
function resolveIconUrl(icon) {
    if (!icon) return '';
    if (/^https?:\/\//i.test(icon)) return icon;
    if (fs.existsSync(path.join(__dirname, icon))) return `app://${icon}`;
    return toRepoRawUrl(icon);
}

// Pull-based twin of the 'update-available' push, in case the renderer subscribes after the page load event
ipcMain.handle('get-update-info', () => pendingUpdate);

ipcMain.handle('get-intro-video', () => {
  return 'app://assets/intro.mp4';
});

async function getLocalGames() {
    try {
        if (!(await fs.pathExists(PORTAL_ROOT_DIR))) {
            await fs.mkdirp(PORTAL_ROOT_DIR);
            return [];
        }
        const entries = await fs.readdir(PORTAL_ROOT_DIR, { withFileTypes: true });
        const dirs = entries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        return dirs;
    } catch (error) {
        log.error('Error verifying directory logs mapping layout structure:', error);
        return [];
    }
}

ipcMain.handle('get-local-games', getLocalGames);

// IPC Handler: Tracking and saving gameplay metrics
ipcMain.handle('get-game-metrics', async () => {
    const metricsPath = path.join(app.getPath('userData'), 'metrics.json');
    try {
        if (await fs.pathExists(metricsPath)) {
            return await fs.readJson(metricsPath);
        }
        return {};
    } catch (error) {
        log.error('Failed to read metrics file:', error);
        return {};
    }
});

// IPC Handler: Launcher containing programmatic fixes for legacy path/registry issues
ipcMain.handle('launch-game', async (event, gameName) => {
    const list = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
    const game = list.find(g => g.title === gameName);
    if (!game) {
        return { success: false, error: 'Game not found in games data.' };
    }

    const folderSignature = getGameFolderSignature(gameName);
    const gameDir = path.join(PORTAL_ROOT_DIR, folderSignature);
    const exePath = path.join(gameDir, game.executablePath);

    try {
        await fs.access(exePath);

        // --- MODERN WINDOWS USER SPACE REGISTRY VIRTUALIZATION LAYERS ---
        // Dynamically configures runtime virtualization pathways so the engine tracks assets natively
        const virtualStoreKey = `HKCU\\Software\\Classes\\VirtualStore\\Machine\\Software\\WOW6432Node\\Her Interactive\\${gameName}`;
        const regCmd1 = `reg add "${virtualStoreKey}" /v "AppPath" /t REG_SZ /d "${gameDir}" /f`;
        exec(regCmd1);

        const regCmd2 = `reg add "HKCU\\Software\\Her Interactive\\${gameName}" /v "AppPath" /t REG_SZ /d "${gameDir}" /f`;
        exec(regCmd2);

        // Forces modern compatibility layers via user hive parameters
        const compatCmd = `reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers" /v "${exePath}" /t REG_SZ /d "~ DISABLEDXMAXIMIZEDWINDOWEDMODE" /f`;
        exec(compatCmd);

        const unblockCmd = `powershell.exe -Command "Get-ChildItem -Path '${gameDir}' -Recurse | Unblock-File"`;
        exec(unblockCmd, (err) => { if (err) log.error('SmartScreen bypass failure payload details:', err); });

        // --- GAMEPLAY SESSION TRACKING ENGINE ---
        const startTime = Date.now();
        const gameProcess = spawn(game.executablePath, [], { cwd: gameDir });

        gameProcess.on('exit', async (code) => {
            const sessionDuration = (Date.now() - startTime) / 1000 / 60; // Convert to minutes
            log.info(`Game session closed for ${gameName}. Active runtime: ${sessionDuration.toFixed(2)} minutes.`);
            
            const metricsPath = path.join(app.getPath('userData'), 'metrics.json');
            try {
                let metrics = await fs.pathExists(metricsPath) ? await fs.readJson(metricsPath) : {};
                if (!metrics[gameName]) metrics[gameName] = { totalPlayTime: 0, sessionsCount: 0 };
                metrics[gameName].totalPlayTime += sessionDuration;
                metrics[gameName].sessionsCount += 1;
                await fs.writeJson(metricsPath, metrics, { spaces: 2 });
            } catch (err) {
                log.error('Failed to commit gameplay runtime metrics updates:', err);
            }
        });

        return { success: true };
    } catch (error) {
        log.error(`Failed to launch game ${gameName} at absolute directory reference matching ${exePath}: ${error}`);
        return { success: false, error: `Game executable missing or registry paths are unmapped: ${error.message}` };
    }
});

ipcMain.handle('delete-game', async (event, gameName) => {
    const folderSignature = getGameFolderSignature(gameName);
    const gamePath = path.join(PORTAL_ROOT_DIR, folderSignature);
    const cheatsPath = path.join(CHEATS_ROOT_DIR, folderSignature);
    try {
        await fs.remove(gamePath);
        await fs.remove(cheatsPath);
        return { success: true };
    } catch (error) {
        log.error(`Error deleting game ${gameName}:`, error);
        return { success: false, error: error.message };
    }
});

// IPC Handler: Download manager supporting structural `.7z` extraction or direct raw `.exe` moving
ipcMain.handle('download-game', async (event, { game }) => {
    const folderSignature = getGameFolderSignature(game.title);
    const extension = game.downloadUrl.split('.').pop().toLowerCase();
    const downloadPath = path.join(PORTAL_ROOT_DIR, `${game.id}.${extension}`);
    const extractPath = path.join(PORTAL_ROOT_DIR, folderSignature);
    const cheatsPath = path.join(CHEATS_ROOT_DIR, folderSignature);

    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
        try {
            await fs.ensureDir(PORTAL_ROOT_DIR);
            await fs.ensureDir(extractPath);

            log.info(`Starting down-stream network sync payload initialization for: ${game.title}`);
            const response = await axios({
                method: 'get',
                url: game.downloadUrl,
                responseType: 'stream',
            });

            const totalBytes = Number(response.headers['content-length']);
            const fileStream = fs.createWriteStream(downloadPath);

            let receivedBytes = 0;
            let lastBytes = 0;
            let lastTime = Date.now();

            response.data.on('data', (chunk) => {
                receivedBytes += chunk.length;
                const now = Date.now();
                const timeDiff = now - lastTime;

                if (timeDiff >= 500) { 
                    const bytesDiff = receivedBytes - lastBytes;
                    const downloadSpeed = bytesDiff / (timeDiff / 1000); 
                    lastBytes = receivedBytes;
                    lastTime = now;

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-progress', {
                            gameId: game.id,
                            progress: (receivedBytes / totalBytes) * 100,
                            status: 'downloading',
                            downloadedBytes: receivedBytes,
                            totalBytes: totalBytes,
                            downloadSpeed: downloadSpeed
                        });
                    }
                }
            });

            await new Promise((resolve, reject) => {
                response.data.pipe(fileStream);
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
                response.data.on('error', reject);
            });

            // --- STRATEGY OVERRIDE: RAW NAKED .EXE ENGINES HANDLING ---
            if (extension === 'exe') {
                log.info(`Naked application executable identified. Bypassing extraction routines directly.`);
                const finalExePath = path.join(extractPath, game.executablePath || `${folderSignature}.exe`);
                
                await fs.move(downloadPath, finalExePath, { overwrite: true });
                mainWindow.webContents.send('download-progress', { gameId: game.id, progress: 100, status: 'complete' });
                
                const updatedLocalGames = await getLocalGames();
                mainWindow.webContents.send('update-local-games', updatedLocalGames);
                
                success = true;
                return { success: true };
            }

            // Normal Archival extraction pathways (.7z payloads)
            mainWindow.webContents.send('download-progress', { gameId: game.id, progress: 0, status: 'extracting' });
            
            await new Promise((resolve, reject) => {
                let pathTo7z = sevenBin.path7za;
                if (app.isPackaged) {
                    pathTo7z = pathTo7z.replace('app.asar', 'app.asar.unpacked');
                }
                const seven = spawn(pathTo7z, ['x', downloadPath, `-o${extractPath}`, '-y']);

                seven.stdout.on('data', (data) => {
                    const str = data.toString();
                    const match = str.match(/(\d+)%/);
                    if (match) {
                        mainWindow.webContents.send('download-progress', {
                            gameId: game.id,
                            progress: parseInt(match[1], 10),
                            status: 'extracting'
                        });
                    }
                });

                seven.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Extraction error termination signal caught: ${code}`));
                });
                seven.on('error', reject);
            });

            // Flatten out single-nested root parent compression artifact folders safely
            try {
                const files = await fs.readdir(extractPath);
                if (files.length === 1) {
                    const nestedPath = path.join(extractPath, files[0]);
                    if ((await fs.stat(nestedPath)).isDirectory()) {
                        log.info(`Flattening single-nested directory structure from ${nestedPath}`);
                        await fs.copy(nestedPath, extractPath, { overwrite: true });
                        await fs.remove(nestedPath);
                    }
                }
            } catch(e) { log.error('Directory leveling configuration warning:', e); }

            // Clean up and level markdown hints files out to separate directory configuration setups
            const sourceCheatsDir = path.join(extractPath, 'cheats');
            if (await fs.pathExists(sourceCheatsDir)) {
                await fs.copy(sourceCheatsDir, cheatsPath);
                await fs.remove(sourceCheatsDir);
            }

            await fs.unlink(downloadPath);

            mainWindow.webContents.send('download-progress', { gameId: game.id, progress: 100, status: 'complete' });
            const updatedLocalGames = await getLocalGames();
            mainWindow.webContents.send('update-local-games', updatedLocalGames);

            success = true;
            return { success: true };

        } catch (error) {
            log.error(`Sync iteration failed structural validation (Remaining Retries: ${retries - 1}):`, error);
            retries--;
            if (retries === 0) {
                if (await fs.pathExists(downloadPath)) await fs.unlink(downloadPath);
                mainWindow.webContents.send('download-progress', { gameId: game.id, error: error.message, status: 'error' });
                return { success: false, error: error.message };
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
});

// --- SILENT NATIVE NO-BACKEND DIAGNOSTICS DISPATCH TRANSCEIVER ---
ipcMain.handle('submit-crash-report', async (event, reportData) => {
    log.error('USER DIAGNOSTICS PAYLOAD ENGAGED:', JSON.stringify(reportData, null, 2));
    
    const formattedText = `Portal Error Log Summary\n---------------------\nGame Context: ${reportData.gameName}\nTimestamp: ${new Date().toISOString()}\nFeedback Note: ${reportData.userNote || "None Provided"}\n\nTrace String:\n${reportData.error}`;
    
    try {
        await axios.post('https://formspree.io/f/mqejzkey', {
            email: "pegumaxinc@gmail.com",
            subject: `Portal Engine Exception: ${reportData.gameName}`,
            message: formattedText
        });
        
        log.info('Diagnostics transceiver dispatched message successfully.');
        return { success: true };
    } catch (err) {
        log.error('Native cloud pipeline dispatch failure. Triggering system default fallback link handler loop...', err.message);
        
        const backupMailto = `mailto:pegumaxinc@gmail.com?subject=Portal Failure - ${encodeURIComponent(reportData.gameName)}&body=${encodeURIComponent(formattedText)}`;
        try {
            await shell.openExternal(backupMailto);
            return { success: true };
        } catch (fallbackErr) {
            return { success: false, error: fallbackErr.message };
        }
    }
});

ipcMain.handle('get-cheatsheet', async (event, gameName) => {
    const folderSignature = getGameFolderSignature(gameName);
    const cheatsheetPath = path.join(CHEATS_ROOT_DIR, folderSignature, 'guide.md');

    // Prefer the repo copy (<cheatsheetPath>/guide.md) so cheatsheets can be added or edited without re-uploading archives
    const list = Array.isArray(gamesData) ? gamesData : (gamesData.games || []);
    const game = list.find(g => g.title === gameName);
    if (game && game.cheatsheetPath) {
        try {
            const response = await axios.get(toRepoRawUrl(`${game.cheatsheetPath}/guide.md`), {
                responseType: 'text',
                timeout: 8000,
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (typeof response.data === 'string' && response.data.trim()) {
                // Cache for offline use; a failed write shouldn't block showing the fetched content
                fs.outputFile(cheatsheetPath, response.data, 'utf-8')
                    .catch(err => log.warn(`Could not cache cheatsheet for ${gameName}:`, err.message));
                return { success: true, content: response.data };
            }
        } catch (error) {
            if (!(error.response && error.response.status === 404)) {
                log.warn(`Remote cheatsheet fetch failed for ${gameName}, using local copy:`, error.message);
            }
        }
    }

    try {
        const content = await fs.readFile(cheatsheetPath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: 'Cheatsheet not found.' };
    }
});

ipcMain.handle('check-directx', async () => {
    const system32 = path.join(process.env.SystemRoot, 'System32');
    const sysWOW64 = path.join(process.env.SystemRoot, 'SysWOW64');
    const filesToCheck = ['d3d9.dll', 'd3d10.dll', 'd3d11.dll'];
    const pathsToCkeck = [system32, sysWOW64];

    for (const dir of pathsToCkeck) {
        for (const file of filesToCheck) {
            try {
                await fs.access(path.join(dir, file));
                return true; 
            } catch (e) {}
        }
    }
    return false; 
});

ipcMain.handle('install-directx', async () => {
    // Windows can't execute files inside app.asar, so the installer is unpacked alongside it (see asarUnpack)
    let dxSetupPath = path.join(__dirname, 'assets', 'dxwebsetup.exe');
    if (app.isPackaged) {
        dxSetupPath = dxSetupPath.replace('app.asar', 'app.asar.unpacked');
    }
    try {
        const openError = await shell.openPath(dxSetupPath);
        if (openError) throw new Error(openError);
        return true;
    } catch (error) {
        log.error('Failed to open DirectX installer:', error);
        return false;
    }
});

ipcMain.handle('download-app-update', async (event, { url, fileName }) => {
    const downloadFolder = app.getPath('downloads');
    const fullPath = path.join(downloadFolder, fileName);

    try {
        log.info(`Downloading application launcher delta binary update matching: ${fullPath}`);
        const response = await axios({ method: 'get', url, responseType: 'stream' });
        const writer = fs.createWriteStream(fullPath);

        await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });

        // Only quit once the installer has actually launched, otherwise the user is left with no portal at all
        log.info('App update build deployment fetched cleanly. Launching setup engine wizard.');
        const openError = await shell.openPath(fullPath);
        if (openError) throw new Error(`Could not launch installer: ${openError}`);

        app.quit();
        return { success: true };
    } catch (error) {
        log.error('Failed to download app update:', error);
        if (error.message && !error.message.startsWith('Could not launch installer')) {
            await fs.remove(fullPath).catch(() => {});
        }
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external-link', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-disk-space', async () => {
    return new Promise((resolve, reject) => {
        if (process.platform !== 'win32') {
            return resolve({ free: 0, size: 0 });
        }
        const drive = path.parse(PORTAL_ROOT_DIR).root.substring(0, 2);
        const command = `wmic logicaldisk where "DeviceID='${drive}'" get size,freespace /value`;

        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                return resolve({ free: 0, size: 0 }); 
            }

            let free = 0;
            let size = 0;
            const lines = stdout.trim().split(/\r?\n/);
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('FreeSpace=')) {
                    free = parseInt(trimmedLine.substring('FreeSpace='.length), 10);
                } else if (trimmedLine.startsWith('Size=')) {
                    size = parseInt(trimmedLine.substring('Size='.length), 10);
                }
            }
            resolve({ free, size });
        });
    });
});