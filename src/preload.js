const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getGames: () => ipcRenderer.invoke('get-games'),
  getLocalGames: () => ipcRenderer.invoke('get-local-games'),
  launchGame: (gameName) => ipcRenderer.invoke('launch-game', gameName),
  downloadGame: (args) => ipcRenderer.invoke('download-game', args),
  getCheatsheet: (gameName) => ipcRenderer.invoke('get-cheatsheet', gameName),
  checkDirectX: () => ipcRenderer.invoke('check-directx'),
  installDirectX: () => ipcRenderer.invoke('install-directx'),
  getDiskSpace: (drive) => ipcRenderer.invoke('get-disk-space', drive),
  getIntroVideo: () => ipcRenderer.invoke('get-intro-video'),
  deleteGame: (gameName) => ipcRenderer.invoke('delete-game', gameName),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, ...args) => callback(...args)),
  removeDownloadProgressListener: (callback) => ipcRenderer.removeListener('download-progress', callback),
  onUpdateLocalGames: (callback) => ipcRenderer.on('update-local-games', (event, ...args) => callback(...args)),
  removeUpdateLocalGamesListener: (callback) => ipcRenderer.removeListener('update-local-games', callback)
});