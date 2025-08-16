const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = electron;
const path = require('path');
const fs = require('fs-extra');
const fetch = require('electron-fetch').default;
const AdmZip = require('adm-zip');
const log = require('electron-log');
const { exec } = require('child_process');


let mainWindow;
let gamesData = [];

async function fetchGamesData() {
  const localPath = path.join(__dirname, 'games.json');
  try {
    // Try to read local games.json first
    log.info('Attempting to read local games.json...');
    const localData = await fs.readFile(localPath, 'utf-8');
    const localGames = JSON.parse(localData);
    log.info('Successfully loaded local games.json.');
    return localGames;
  } catch (localError) {
    log.warn('Local games.json not found or invalid, attempting remote fetch:', localError.message);
    try {
      log.info('Fetching remote games.json...');
      const response = await fetch('https://raw.githubusercontent.com/LottieVixen/GamePortal/main/games.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const remoteGames = await response.json();
      log.info('Successfully fetched remote games.json.');
      return remoteGames;
    } catch (remoteError) {
      log.error('Error fetching remote game data and local file not found/invalid:', remoteError);
      return []; // Return empty array if both fail
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    callback({ path: path.normalize(path.join(__dirname, url)) });
  });

  gamesData = await fetchGamesData();
  log.info('gamesData loaded:', gamesData.map(g => g.title));
  createWindow();

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

ipcMain.handle('get-games', async () => {
    return gamesData.map(game => ({...game, icon: `app://${game.icon}`}));
});

ipcMain.handle('get-intro-video', () => {
  return 'app://assets/intro.mp4';
});

ipcMain.handle('get-local-games', async () => {
    const gamesDir = path.join(__dirname, 'games');
    try {
        const entries = await fs.readdir(gamesDir, { withFileTypes: true });
        const dirs = entries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        return dirs;
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(gamesDir);
        }
        return [];
    }
});

ipcMain.handle('launch-game', async (event, gameName) => {
    const gamePath = path.join(__dirname, 'games', gameName, 'game.exe');
    try {
        await fs.access(gamePath);
        shell.openPath(gamePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Game executable not found.' };
    }
});

ipcMain.handle('delete-game', async (event, gameName) => {
    const gamePath = path.join(__dirname, 'games', gameName);
    const cheatsPath = path.join(__dirname, 'cheatsheets', gameName);
    try {
        await fs.remove(gamePath);
        await fs.remove(cheatsPath);
        return { success: true };
    } catch (error) {
        log.error(`Error deleting game ${gameName}:`, error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.filePaths[0];
});

ipcMain.handle('download-game', async (event, { game, installPath }) => {
    const zipPath = path.join(installPath, `${game.id}.zip`);
    const extractPath = path.join(__dirname, 'games', game.title);
    const cheatsPath = path.join(__dirname, 'cheatsheets', game.title);

    try {
        const response = await fetch(game.downloadUrl);
        const buffer = await response.buffer();
        await fs.writeFile(zipPath, buffer);

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(installPath, true);

        const gameDirName = game.title; 
        const sourceGameDir = path.join(installPath, gameDirName);

        await fs.rename(sourceGameDir, extractPath);

        const sourceCheatsDir = path.join(extractPath, 'cheats');
        if (await fs.pathExists(sourceCheatsDir)) {
            await fs.ensureDir(cheatsPath);
            await fs.copy(sourceCheatsDir, cheatsPath);
            await fs.remove(sourceCheatsDir);
        }

        await fs.unlink(zipPath);

        return { success: true };
    } catch (error) {
        log.error('Error during download/extraction:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-cheatsheet', async (event, gameName) => {
    const cheatsheetPath = path.join(__dirname, 'cheatsheets', gameName, 'guide.md');
    try {
        const content = await fs.readFile(cheatsheetPath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: 'Cheatsheet not found.' };
    }
});

ipcMain.handle('check-directx', async () => {
    const system32 = process.env.SystemRoot + '\\System32';
    const filesToCheck = ['d3d9.dll', 'd3d10.dll', 'd3d11.dll'];
    for (const file of filesToCheck) {
        try {
            await fs.access(path.join(system32, file));
            return true; // Found one of the files
        } catch (e) {
            // File not found, continue checking
        }
    }
    return false; // None of the files were found
});

ipcMain.handle('install-directx', async () => {
    const dxSetupPath = path.join(__dirname, 'assets', 'dxwebsetup.exe');
    try {
        // We need to run this as admin.
        shell.openPath(dxSetupPath);
        return true;
    } catch (error) {
        log.error('Failed to open DirectX installer:', error);
        return false;
    }
});


ipcMain.handle('get-disk-space', async () => {
    return new Promise((resolve, reject) => {
        if (process.platform !== 'win32') {
            return resolve({ free: 0, size: 0 });
        }
        exec('wmic logicaldisk get size,freespace /value', (error, stdout, stderr) => { // Use /value for easier parsing
            if (error) {
                log.error(`Error getting disk space: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                log.error(`Stderr getting disk space: ${stderr}`);
                return reject(new Error(stderr));
            }

            log.info('WMIC stdout (raw):', stdout);

            let totalFree = 0;
            let totalSize = 0;

            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('FreeSpace=')) {
                    totalFree += parseInt(trimmedLine.substring('FreeSpace='.length), 10);
                } else if (trimmedLine.startsWith('Size=')) {
                    totalSize += parseInt(trimmedLine.substring('Size='.length), 10);
                }
            }

            if (isNaN(totalFree) || isNaN(totalSize) || (totalFree === 0 && totalSize === 0)) {
                log.error('Failed to parse disk space data or data is zero.');
                return reject(new Error('Failed to parse disk space data.'));
            }

            log.info(`Parsed Disk Space: Free=${totalFree}, Size=${totalSize}`);
            resolve({ free: totalFree, size: totalSize });
        });
    });
});