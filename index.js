const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const log = require('electron-log');
const { exec } = require('child_process');
const sevenBin = require('7zip-bin');


let mainWindow;
let gamesData = [];

async function fetchGamesData() {
  const localPath = path.join(__dirname, 'games.json');
  try {
    // 1. Attempt to fetch remote games.json first
    log.info('Attempting to fetch remote games.json...');
    const response = await axios.get('https://raw.githubusercontent.com/Gus-Jacobs/Nancy-Drew-Game-Portal/main/games.json', { responseType: 'json' });
    const remoteGames = response.data;
    log.info('Successfully fetched remote games.json.');

    // 2. Save the fetched remote games.json locally as a cache
    await fs.writeFile(localPath, JSON.stringify(remoteGames, null, 2), 'utf-8');
    log.info('Successfully cached remote games.json locally.');

    return remoteGames;
  } catch (remoteError) {
    log.warn('Error fetching remote games.json, attempting to load local fallback:', remoteError.message);
    try {
      // 3. If remote fetch fails, try to read local games.json as fallback
      log.info('Attempting to read local games.json as fallback...');
      const localData = await fs.readFile(localPath, 'utf-8');
      const localGames = JSON.parse(localData);
      log.info('Successfully loaded local games.json fallback.');
      return localGames;
    } catch (localError) {
      log.error('Error loading local games.json fallback:', localError.message);
      log.error('Failed to load game data from both remote and local sources.');
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

async function getLocalGames() {
    const gamesDir = path.join(app.getPath('userData'), 'games');
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
}

ipcMain.handle('get-local-games', getLocalGames);

ipcMain.handle('launch-game', async (event, gameName) => {
    const game = gamesData.find(g => g.title === gameName);
    if (!game) {
        return { success: false, error: 'Game not found in games data.' };
    }

    const gamePath = path.join(app.getPath('userData'), 'games', gameName, game.executablePath);
    try {
        await fs.access(gamePath);
        shell.openPath(gamePath);
        return { success: true };
    } catch (error) {
        log.error(`Failed to launch game ${gameName} at ${gamePath}: ${error}`);
        // Try to find the executable in subdirectories
        try {
            const files = await fs.readdir(path.join(app.getPath('userData'), 'games', gameName));
            const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
            if (exeFile) {
                const newGamePath = path.join(app.getPath('userData'), 'games', gameName, exeFile);
                log.info(`Found executable at ${newGamePath}, attempting to launch.`);
                shell.openPath(newGamePath);
                return { success: true };
            }
        } catch (e) {
            log.error(`Error while searching for executable for ${gameName}: ${e}`);
        }

        return { success: false, error: `Game executable not found at ${gamePath}` };
    }
});

ipcMain.handle('delete-game', async (event, gameName) => {
    const gamePath = path.join(app.getPath('userData'), 'games', gameName);
    const cheatsPath = path.join(app.getPath('userData'), 'cheatsheets', gameName);
    try {
        await fs.remove(gamePath);
        await fs.remove(cheatsPath);
        return { success: true };
    } catch (error) {
        log.error(`Error deleting game ${gameName}:`, error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('download-game', async (event, { game }) => {
    const gamesDir = path.join(app.getPath('userData'), 'games');
    const downloadPath = path.join(gamesDir, `${game.id}.7z`);
    const extractPath = path.join(gamesDir, game.title);
    const cheatsPath = path.join(app.getPath('userData'), 'cheatsheets', game.title);

    log.info(`Attempting to download game: ${game.title}`);
    log.info(`Download URL: ${game.downloadUrl}`);
    log.info(`Download Path: ${downloadPath}`);
    log.info(`Extract Path: ${extractPath}`);
    log.info(`Cheats Path: ${cheatsPath}`);

    // Add these log statements
    log.info(`Debug: game.id = ${game.id}`);
    log.info(`Debug: gamesDir = ${gamesDir}`);
    log.info(`Debug: downloadPath (before stream) = ${downloadPath}`);

    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
        try {
            log.info(`Ensuring games directory exists: ${gamesDir}`);
            await fs.ensureDir(gamesDir);
            log.info(`Ensuring extract directory exists: ${extractPath}`);
            await fs.ensureDir(extractPath); // Ensure the specific game extraction path exists

            log.info(`Starting download for ${game.title}...`);
            const response = await axios({
                method: 'get',
                url: game.downloadUrl,
                responseType: 'stream',
            });

            const totalBytes = Number(response.headers['content-length']);
            log.info(`Total bytes to download: ${totalBytes}`);
            const fileStream = fs.createWriteStream(downloadPath);

            let receivedBytes = 0;
            let lastBytes = 0;
            let lastTime = Date.now();

            response.data.on('data', (chunk) => {
                receivedBytes += chunk.length;
                const now = Date.now();
                const timeDiff = now - lastTime;

                if (timeDiff >= 1000) { // Update speed every second
                    const bytesDiff = receivedBytes - lastBytes;
                    const downloadSpeed = bytesDiff / (timeDiff / 1000); // Bytes per second
                    lastBytes = receivedBytes;
                    lastTime = now;

                    mainWindow.webContents.send('download-progress', {
                        gameId: game.id,
                        progress: (receivedBytes / totalBytes) * 100,
                        status: 'downloading',
                        downloadedBytes: receivedBytes,
                        totalBytes: totalBytes,
                        downloadSpeed: downloadSpeed
                    });
                }
            });

            await new Promise((resolve, reject) => {
                response.data.pipe(fileStream);
                fileStream.on('finish', () => {
                    log.info(`Download finished for ${game.title}`);
                    resolve();
                });
                fileStream.on('error', (error) => {
                    log.error(`File stream error for ${game.title}: ${error.message}`);
                    reject(new Error(`File stream error: ${error.message}`));
                });
                response.data.on('error', (error) => {
                    log.error(`Response data error for ${game.title}: ${error.message}`);
                    reject(new Error(`Response data error: ${error.message}`));
                });
            });

            mainWindow.webContents.send('download-progress', { gameId: game.id, progress: 100, status: 'extracting' });
            log.info(`Starting extraction for ${game.title} from ${downloadPath} to ${extractPath}...`);

            await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');
                const pathTo7z = sevenBin.path7za;
                const seven = spawn(pathTo7z, ['x', downloadPath, `-o${extractPath}`, '-y']);

                seven.stdout.on('data', (data) => {
                    // 7zip doesn't provide a progress percentage, so we can't easily update the progress bar here.
                    // We can log the output for debugging purposes.
                    log.info(`7zip stdout: ${data}`);
                });

                seven.stderr.on('data', (data) => {
                    log.error(`7zip stderr: ${data}`);
                });

                seven.on('close', (code) => {
                    if (code === 0) {
                        log.info(`Extraction complete for ${game.title}`);
                        resolve();
                    } else {
                        log.error(`Extraction failed for ${game.title} with code ${code}`);
                        reject(new Error(`Extraction failed with code ${code}`));
                    }
                });

                seven.on('error', (err) => {
                    log.error(`Extraction failed for ${game.title}: ${err}`);
                    reject(new Error(`Extraction failed: ${err}`));
                });
            });

            // Handle archives with a single root directory
            try {
                const files = await fs.readdir(extractPath);
                if (files.length === 1) {
                    const nestedPath = path.join(extractPath, files[0]);
                    if ((await fs.stat(nestedPath)).isDirectory()) {
                        log.info(`Detected nested directory, moving contents from ${nestedPath} to ${extractPath}`);
                        await fs.copy(nestedPath, extractPath, { overwrite: true });
                        await fs.remove(nestedPath);
                    }
                }
            } catch(e) {
                log.error('Error handling nested directory', e);
            }

            const sourceCheatsDir = path.join(extractPath, 'cheats');
            log.info(`Checking for cheatsheet directory: ${sourceCheatsDir}`);
            if (await fs.pathExists(sourceCheatsDir)) {
                log.info(`Cheatsheet directory found. Copying cheats from ${sourceCheatsDir} to ${cheatsPath}`);
                await fs.copy(sourceCheatsDir, cheatsPath);
                log.info(`Removing source cheatsheet directory: ${sourceCheatsDir}`);
                await fs.remove(sourceCheatsDir);
            } else {
                log.info(`No cheatsheet directory found at ${sourceCheatsDir}`);
            }

            log.info(`Deleting downloaded 7z file: ${downloadPath}`);
            await fs.unlink(downloadPath);

            mainWindow.webContents.send('download-progress', { gameId: game.id, progress: 100, status: 'complete' });
            log.info(`Download and extraction complete for ${game.title}. Updating local games list.`);
            // Explicitly tell renderer to update local games
            const updatedLocalGames = await getLocalGames();
            mainWindow.webContents.send('update-local-games', updatedLocalGames);

            success = true;
            return { success: true };

        } catch (error) {
            log.error(`Error during download/extraction (attempt ${4 - retries}):`, error);
            retries--;
            if (retries === 0) {
                // Clean up failed download
                log.error(`All retries failed for ${game.title}. Cleaning up...`);
                if (await fs.pathExists(downloadPath)) {
                    log.info(`Deleting incomplete download file: ${downloadPath}`);
                    await fs.unlink(downloadPath);
                }
                if (await fs.pathExists(extractPath)) {
                    log.info(`Deleting incomplete extraction directory: ${extractPath}`);
                    await fs.remove(extractPath);
                }
                mainWindow.webContents.send('download-progress', { gameId: game.id, error: error.message, status: 'error' });
                return { success: false, error: error.message };
            }
            // Wait 2 seconds before retrying
            log.warn(`Retrying download/extraction for ${game.title} in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
});

ipcMain.handle('get-cheatsheet', async (event, gameName) => {
    const cheatsheetPath = path.join(app.getPath('userData'), 'cheatsheets', gameName, 'guide.md');
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
                log.info(`Found DirectX file: ${path.join(dir, file)}`);
                return true; // Found one of the files
            } catch (e) {
                // File not found, continue checking
            }
        }
    }
    log.warn('No DirectX files found.');
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
        const userDataPath = app.getPath('userData');
        const drive = path.parse(userDataPath).root.substring(0, 2);
        const command = `wmic logicaldisk where "DeviceID='${drive}'" get size,freespace /value`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                log.error(`Error getting disk space: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                log.error(`Stderr getting disk space: ${stderr}`);
                return reject(new Error(stderr));
            }

            log.info('WMIC stdout (raw):', stdout);

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

            if (isNaN(free) || isNaN(size)) {
                log.error('Failed to parse disk space data.');
                return reject(new Error('Failed to parse disk space data.'));
            }

            log.info(`Parsed Disk Space: Free=${free}, Size=${size}`);
            resolve({ free, size });
        });
    });
});
