const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getGames: () => ipcRenderer.invoke('get-games'),
  getLocalGames: () => ipcRenderer.invoke('get-local-games'),
  launchGame: (gameName) => ipcRenderer.invoke('launch-game', gameName),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  downloadGame: (args) => ipcRenderer.invoke('download-game', args),
  getCheatsheet: (gameName) => ipcRenderer.invoke('get-cheatsheet', gameName),
  checkAndInstallDirectX: () => ipcRenderer.invoke('check-and-install-directx'),
  getDiskSpace: (drive) => ipcRenderer.invoke('get-disk-space', drive),
  getIntroVideo: () => ipcRenderer.invoke('get-intro-video')
});