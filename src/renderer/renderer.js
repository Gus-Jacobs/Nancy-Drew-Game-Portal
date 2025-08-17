
import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

// --- Helper Components ---

const StorageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20H20.5C20.5 20 22 19 22 17V7C22 5 20.5 4 20.5 4H3.5C3.5 4 2 5 2 7V17C2 19 3.5 20 3.5 20H12Z"></path>
        <path d="M2 10H22"></path>
    </svg>
);

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5"></path>
        <path d="M12 19l-7-7 7-7"></path>
    </svg>
);


// --- Main App Component ---

const App = () => {
    const [view, setView] = useState('intro'); // 'intro', 'menu', 'play', 'browse', 'game-info'
    const [games, setGames] = useState([]);
    const [localGames, setLocalGames] = useState([]);
    const [introVideoSrc, setIntroVideoSrc] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [diskSpace, setDiskSpace] = useState({ free: 0, size: 0 });
    const [selectedGame, setSelectedGame] = useState(null);
    const [cheatsheet, setCheatsheet] = useState('');
    const videoRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        const initialize = async () => {
            const dxInstalled = await window.electron.checkDirectX();
            if (!dxInstalled) {
                const confirmed = window.confirm('DirectX Runtime is not detected. Would you like to install it now?');
                if (confirmed) {
                    await window.electron.installDirectX();
                }
            }

            const src = await window.electron.getIntroVideo();
            setIntroVideoSrc(src);

            const allGames = await window.electron.getGames();
            setGames(allGames);

            const installedGames = await window.electron.getLocalGames();
            setLocalGames(installedGames);

            const space = await window.electron.getDiskSpace();
            setDiskSpace(space);
        };

        initialize();
    }, []);

    // --- Handlers ---
    const handleVideoEnd = () => setView('menu');
    const skipIntro = () => {
        if(videoRef.current) {
            videoRef.current.pause();
        }
        setView('menu');
    }
    const handleLaunchGame = (gameName) => window.electron.launchGame(gameName);
    const handleViewGameInfo = async (game) => {
        const result = await window.electron.getCheatsheet(game.title);
        if(result.success) {
            setCheatsheet(result.content);
        } else {
            setCheatsheet('No cheatsheet available for this game.');
        }
        setSelectedGame(game);
        setView('game-info');
    };
    const handleDeleteGame = async (gameName) => {
        const confirmed = window.confirm(`Are you sure you want to delete ${gameName}? This will remove all game files.`);
        if (confirmed) {
            await window.electron.deleteGame(gameName);
            const installedGames = await window.electron.getLocalGames();
            setLocalGames(installedGames);
        }
    };
    const handleDownloadGame = async (game) => {
        const installPath = await window.electron.selectDirectory();
        if (installPath) {
            await window.electron.downloadGame({ game, installPath });
            const installedGames = await window.electron.getLocalGames();
            setLocalGames(installedGames);
        }
    };

    // --- Render Methods ---

    const renderIntro = () => (
        <div id="intro-container">
            <video ref={videoRef} src={introVideoSrc} onEnded={handleVideoEnd} autoPlay playsInline />
            <button id="skip-intro" onClick={skipIntro}>Skip Intro</button>
        </div>
    );

    const renderMenu = () => (
        <div className="menu-container">
            <div className="menu-content">
                <h1 className="portal-title">Game Portal</h1>
                <p className="welcome-message">Your gateway to adventure</p>
                <div className="menu-buttons">
                    <button className="menu-button" onClick={() => setView('play')}>My Games</button>
                    <button className="menu-button" onClick={() => setView('browse')}>Browse Games</button>
                </div>
            </div>
        </div>
    );

    const renderGameInfo = () => {
        if (!selectedGame) return null;
        return (
            <div className="game-info-view">
                 <div className="header-bar">
                    <button className="back-button icon-button" onClick={() => setView(localGames.includes(selectedGame.title) ? 'play' : 'browse')}>
                        <BackArrowIcon />
                    </button>
                    <h1 className="page-title">{selectedGame.title}</h1>
                </div>
                <div className="info-content">
                    <h2>Game Info & Cheats</h2>
                    <pre>{cheatsheet}</pre>
                </div>
            </div>
        );
    };

    const renderGameListView = (title, gamesToRender) => {
        const usage = diskSpace.size > 0 ? (diskSpace.size - diskSpace.free) / diskSpace.size : 0;
        const usagePercent = (usage * 100).toFixed(1);
        let progressBarColor = '#28a745';
        if (usage > 0.8) progressBarColor = '#dc3545';
        else if (usage > 0.6) progressBarColor = '#ffc107';

        const filteredGames = gamesToRender.filter(game =>
            game.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        console.log('Games to render:', gamesToRender.length, gamesToRender.map(g => g.title));
        console.log('Filtered games:', filteredGames.length, filteredGames.map(g => g.title));

        return (
            <div className="main-view">
                <div className="content-area">
                    <div className="header-bar">
                        <button className="back-button icon-button" onClick={() => setView('menu')}>
                            <BackArrowIcon />
                        </button>
                        <h1 className="page-title">{title}</h1>
                    </div>
                    <div className="game-grid">
                        {filteredGames.map(game => {
                            const isInstalled = localGames.includes(game.title);
                            const isAvailable = !!game.downloadUrl;
                            return (
                                <div key={game.id} className={`game-card ${!isAvailable && !isInstalled ? 'unavailable' : ''}`}>
                                    <div className="game-card-image-container" onClick={() => handleViewGameInfo(game)}>
                                        <img src={game.icon} alt={game.title} className="game-card-image" />
                                        {!isInstalled && !isAvailable && <div className="coming-soon-banner"><span>Coming Soon</span></div>}
                                    </div>
                                    <div className="card-body">
                                        <h2 className="card-title">{game.title}</h2>
                                        <div className="card-buttons">
                                            {isInstalled ? (
                                                <>
                                                    <button className="btn btn-primary" onClick={() => handleLaunchGame(game.title)}>Play</button>
                                                    <button className="btn btn-danger" onClick={() => handleDeleteGame(game.title)}>Delete</button>
                                                </>
                                            ) : (
                                                <button className="btn btn-secondary" disabled={!isAvailable} onClick={() => handleDownloadGame(game)}>Download</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="sidebar">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="storage-bar">
                        <div className="storage-icon">
                            <StorageIcon />
                        </div>
                        <div className="storage-details">
                             <div className="storage-text">
                                <span>{`${(diskSpace.free / (1024**3)).toFixed(2)} GB`}</span>
                                <span>{`${(diskSpace.size / (1024**3)).toFixed(2)} GB`}</span>
                            </div>
                            <div className="storage-progress-bar-container">
                                <div className="storage-progress-bar" style={{ width: `${usagePercent}%`, backgroundColor: progressBarColor }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    // --- Main Render Switch ---
    switch (view) {
        case 'intro':
            return renderIntro();
        case 'menu':
            return renderMenu();
        case 'play':
            const installedGames = games.filter(g => localGames.includes(g.title));
            return renderGameListView('My Games', installedGames);
        case 'browse':
            const uninstalledGames = games.filter(g => !localGames.includes(g.title));
            return renderGameListView('Browse Games', uninstalledGames);
        case 'game-info':
            return renderGameInfo();
        default:
            return renderIntro();
    }
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
