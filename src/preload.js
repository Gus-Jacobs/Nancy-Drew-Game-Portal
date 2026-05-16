const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Existing Core Functions
    getGames: () => ipcRenderer.invoke('get-games'),
    getIntroVideo: () => ipcRenderer.invoke('get-intro-video'),
    getLocalGames: () => ipcRenderer.invoke('get-local-games'),
    launchGame: (gameName) => ipcRenderer.invoke('launch-game', gameName),
    deleteGame: (gameName) => ipcRenderer.invoke('delete-game', gameName),
    downloadGame: (args) => ipcRenderer.invoke('download-game', args),
    getCheatsheet: (gameName) => ipcRenderer.invoke('get-cheatsheet', gameName),
    checkDirectX: () => ipcRenderer.invoke('check-directx'),
    installDirectX: () => ipcRenderer.invoke('install-directx'),
    getDiskSpace: () => ipcRenderer.invoke('get-disk-space'),

    // NEW: App Auto-Updater Hook
    downloadAppUpdate: (args) => ipcRenderer.invoke('download-app-update', args),
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (event, data) => callback(data));
    },

    // NEW: Metrics & Game Session Tracker
    getGameMetrics: () => ipcRenderer.invoke('get-game-metrics'),

    // NEW: Developer Contact & Crash Reporter
    submitCrashReport: (reportData) => ipcRenderer.invoke('submit-crash-report', reportData),

    // Clean up event listeners helper
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
    onUpdateLocalGames: (callback) => ipcRenderer.on('update-local-games', (event, data) => callback(data)),
    removeDownloadProgressListener: () => ipcRenderer.removeAllListeners('download-progress'),
    removeUpdateLocalGamesListener: () => ipcRenderer.removeAllListeners('update-local-games'),
    openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
});