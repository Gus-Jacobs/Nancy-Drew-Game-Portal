import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

// --- Inline UI Modals & Micro-Components ---

// 1. Confetti Particle Simulation Component (Pure CSS/React, zero external dependencies)
const ConfettiBlast = () => {
    return (
        <div className="confetti-container">
            {[...Array(50)].map((_, i) => {
                const randomX = Math.random() * 100;
                const randomDelay = Math.random() * 2;
                const randomColor = ['#00e5ff', '#ff007f', '#00ff66', '#ffcc00', '#9933ff'][Math.floor(Math.random() * 5)];
                return (
                    <div 
                        key={i} 
                        className="confetti-piece" 
                        style={{
                            left: `${randomX}%`,
                            backgroundColor: randomColor,
                            animationDelay: `${randomDelay}s`
                        }}
                    />
                );
            })}
        </div>
    );
};

// 2. Application Auto-Updater Dialogue Modal
const UpdateModal = ({ data, onUpdate, onClose }) => {
    if (!data) return null;
    return (
        <div className="portal-modal-overlay">
            <div className="portal-card-modal update-animation">
                <h2 className="glow-text">System Update Available</h2>
                <p>A newer version of the Game Portal (v{data.remote}) is ready for installation.</p>
                <p className="subtle-text">Your local version: v{data.local}</p>
                <div className="modal-actions">
                    <button className="btn btn-primary" onClick={onUpdate}>Update Now</button>
                    <button className="btn btn-secondary" onClick={onClose}>Later</button>
                </div>
            </div>
        </div>
    );
};

// 3. Advanced Developer Contact & Error Crash Reporter UI
const CrashReportModal = ({ errorData, onSubmit, onClose }) => {
    const [userNote, setUserNote] = useState('');
    if (!errorData) return null;

    return (
        <div className="portal-modal-overlay">
            <div className="portal-card-modal error-border">
                <h2 className="error-text">An Error Has Occurred</h2>
                <p>The system encountered a boundary constraint while executing operations on <strong>{errorData.gameName}</strong>.</p>
                <div className="error-log-box">
                    <code>{errorData.error}</code>
                </div>
                <label className="input-label">Provide additional context or steps to reproduce (Optional):</label>
                <textarea 
                    className="report-textarea" 
                    value={userNote} 
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="E.g., It crashed immediately after the loading animation..."
                />
                <div className="modal-actions">
                    <button className="btn btn-danger" onClick={() => onSubmit(userNote)}>Send Details to Developer</button>
                    <button className="btn btn-secondary" onClick={onClose}>Dismiss</button>
                </div>
            </div>
        </div>
    );
};

// 4. "New Release" Onboarding Modal
const NewGamesModal = ({ newGamesList, onClose }) => {
    if (!newGamesList || newGamesList.length === 0) return null;
    return (
        <div className="portal-modal-overlay">
            <div className="portal-card-modal update-animation">
                <h2 className="glow-text">New Adventures Added!</h2>
                <p>Since your last visit, new case files have been uploaded to the registry:</p>
                <div className="new-games-grid">
                    {newGamesList.map(game => (
                        <div key={game.id} className="new-game-item">
                            <img src={game.icon} alt={game.title} className="new-game-thumb" />
                            <span>{game.title}</span>
                        </div>
                    ))}
                </div>
                <div className="modal-actions">
                    <button className="btn btn-primary" onClick={onClose}>Let's Solve It!</button>
                </div>
            </div>
        </div>
    );
};

// 5. Post-Download Intercept Option Modal
const CompleteModal = ({ game, onPlay, onGoToGames, onClose }) => {
    if (!game) return null;
    return (
        <div className="portal-modal-overlay">
            <ConfettiBlast />
            <div className="portal-card-modal completion-glow">
                <h2 className="glow-text">Case File Fully Synchronized!</h2>
                <p><strong>{game.title}</strong> has been completely extracted and verified.</p>
                <img src={game.icon} alt={game.title} className="completion-game-thumb" />
                <div className="modal-actions vertical-actions">
                    <button className="btn btn-primary" onClick={onPlay}>Play Immediately</button>
                    <button className="btn btn-secondary" onClick={onGoToGames}>View in My Games</button>
                    <button className="btn btn-danger" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// 6. Custom Clean React Replacement Modal for Unstyled Browser Deletions Confirm Boxes
const DeleteConfirmModal = ({ gameName, onConfirm, onClose }) => {
    if (!gameName) return null;
    return (
        <div className="portal-modal-overlay">
            <div className="portal-card-modal error-border">
                <h2 className="error-text">Uninstall Case File?</h2>
                <p>Are you sure you want to permanently delete <strong>{gameName}</strong> from local storage files? This action cannot be undone.</p>
                <div className="modal-actions">
                    <button className="btn btn-danger" onClick={onConfirm}>Delete Files</button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// 7. General Purpose Support Ticket & Feature Request Modal (Allows testing the Formspree line manually)
const SupportModal = ({ isOpen, onSubmit, onClose }) => {
    const [userMessage, setUserMessage] = useState('');
    if (!isOpen) return null;

    return (
        <div className="portal-modal-overlay">
            <div className="portal-card-modal">
                <h2 className="glow-text">Contact Support & Devs</h2>
                <p>Have a new feature request or encountered an unexpected game engine error? Send a direct message to Pegumax LLC.</p>
                <textarea 
                    className="report-textarea" 
                    value={userMessage} 
                    onChange={(e) => setUserMessage(e.target.value)}
                    placeholder="Type your feature ideas or game issue notes here..."
                    style={{ height: '120px', marginTop: '1rem' }}
                />
                <div className="modal-actions">
                    <button className="btn btn-primary" disabled={!userMessage.trim()} onClick={() => onSubmit(userMessage)}>Send Message</button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// 8. Nostalgic Immersive Graphic CD Spinner Installation Overlay
const ActiveDownloadOverlay = ({ progressInfo, gameObj }) => {
    if (!progressInfo || !gameObj) return null;
    const isExtracting = progressInfo.status === 'extracting';
    
    return (
        <div className="portal-modal-overlay download-backdrop-blur">
            <div className="disc-spinner-container">
                <div className={`nostalgic-cd-disc ${isExtracting ? 'fast-spin' : 'slow-spin'}`}>
                    <img src={gameObj.icon} alt="Disc Image Art Wrapper" className="cd-center-art" />
                    <div className="cd-inner-ring"></div>
                    <div className="cd-shiny-layer"></div>
                </div>
                <h2 className="glow-text progress-title-label">
                    {isExtracting ? 'Decrypting & Unpacking Files...' : `Downloading: ${gameObj.title}`}
                </h2>
                
                <div className="dual-progress-track">
                    <div 
                        className={`progress-fill ${isExtracting ? 'extracting-green-fill' : 'download-blue-fill'}`} 
                        style={{ width: `${progressInfo.progress || 0}%` }}
                    ></div>
                </div>
                <span className="percentage-numeric-label">{progressInfo.progress ? progressInfo.progress.toFixed(0) : 0}%</span>
                
                {progressInfo.status === 'downloading' && progressInfo.downloadSpeed && (
                    <div className="subtle-text stream-metrics-speed">
                        {((progressInfo.downloadedBytes || 0) / (1024**2)).toFixed(1)} MB / {((progressInfo.totalBytes || 0) / (1024**2)).toFixed(1)} MB ({((progressInfo.downloadSpeed || 0) / (1024**2)).toFixed(1)} MB/s)
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Standard Icons ---
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

// --- Main App Component Hierarchy ---
const App = () => {
    const [view, setView] = useState('intro'); 
    const [games, setGames] = useState([]);
    const [localGames, setLocalGames] = useState([]);
    const [introVideoSrc, setIntroVideoSrc] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [diskSpace, setDiskSpace] = useState({ free: 0, size: 0 });
    const [selectedGame, setSelectedGame] = useState(null);
    const [cheatsheet, setCheatsheet] = useState('');
    const [downloadProgress, setDownloadProgress] = useState({});
    const videoRef = useRef(null);

    // Advanced Beast Mode State Management
    const [updateData, setUpdateData] = useState(null);
    const [activeError, setActiveError] = useState(null);
    const [newGamesAlert, setNewGamesAlert] = useState([]);
    const [completionModalGame, setCompletionModalGame] = useState(null);
    const [gameMetrics, setGameMetrics] = useState({});
    
    // Core Additions: Dynamic tracking parameters for targeted active states
    const [pendingDeleteName, setPendingDeleteName] = useState(null);
    const [currentDownloadingGame, setCurrentDownloadingGame] = useState(null);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    // Isolated Initialization Mount Hook: Disables event trigger cascading memory leaks completely
    useEffect(() => {
        const initialize = async () => {
            console.log('Initializing system matrix architecture...');
            
            // 1. DirectX Driver Layer System Verification
            const dxInstalled = await window.electron.checkDirectX();
            if (!dxInstalled) {
                const confirmed = window.confirm('DirectX Runtime is not detected. This configuration is mandatory for legacy graphic wrappers. Build bridge now?');
                if (confirmed) await window.electron.installDirectX();
            }

            // 2. Fetch Assets & Sync Master Config Listings
            const src = await window.electron.getIntroVideo();
            setIntroVideoSrc(src);

            const allGamesData = await window.electron.getGames();
            const normalizedGamesList = Array.isArray(allGamesData) ? allGamesData : (allGamesData.games || []);
            setGames(normalizedGamesList);

            const installedGames = await window.electron.getLocalGames();
            setLocalGames(installedGames);

            const space = await window.electron.getDiskSpace();
            setDiskSpace(space);

            // Fetch session storage metrics metrics.json profile tracking data
            const metricsProfile = await window.electron.getGameMetrics();
            setGameMetrics(metricsProfile || {});

            // 3. New Releases Delta Parsing Engine
            try {
                const knownGameIds = JSON.parse(localStorage.getItem('portal_acknowledged_ids') || '[]');
                if (knownGameIds.length > 0 && normalizedGamesList.length > 0) {
                    const novelGames = normalizedGamesList.filter(game => !knownGameIds.includes(game.id));
                    if (novelGames.length > 0) {
                        setNewGamesAlert(novelGames);
                    }
                }
                const currentIds = normalizedGamesList.map(g => g.id);
                localStorage.setItem('portal_acknowledged_ids', JSON.stringify(currentIds));
            } catch (err) {
                console.warn('Could not complete known games history structural parse:', err);
            }
        };

        initialize();

        window.electron.onUpdateAvailable((data) => {
            console.log('Auto-update pipeline returned data array target matching version:', data.remote);
            setUpdateData(data);
        });

        window.electron.onUpdateLocalGames((updatedGames) => {
            setLocalGames(updatedGames);
        });

        return () => {
            window.electron.removeDownloadProgressListener();
            window.electron.removeUpdateLocalGamesListener();
        };
    }, []);

    // Secondary isolated context pipeline capturing downstream active progression packages cleanly
    useEffect(() => {
        const handleDownloadProgress = (progressData) => {
            setDownloadProgress(prev => ({ ...prev, [progressData.gameId]: progressData }));

            if (progressData.status === 'complete') {
                setCurrentDownloadingGame(null); // Wipe overlay visualization context frame target immediately
                const targetGameObj = games.find(g => g.id === progressData.gameId);
                if (targetGameObj) setCompletionModalGame(targetGameObj);
                
                setTimeout(() => {
                    setDownloadProgress(prev => {
                        const newProgress = { ...prev };
                        delete newProgress[progressData.gameId];
                        return newProgress;
                    });
                }, 2000);
            }
        };

        window.electron.onDownloadProgress(handleDownloadProgress);
        return () => {
            window.electron.removeDownloadProgressListener();
        };
    }, [games]);

    // --- Core Action Processing Routines (Wrapped with the Custom Reporter Interceptor) ---
    const handleLaunchGame = async (gameName) => {
        try {
            const result = await window.electron.launchGame(gameName);
            if (!result.success) {
                throw new Error(result.error || 'Executable environment execution fault.');
            }
        } catch (err) {
            setActiveError({ gameName, error: err.message });
        }
    };

    const handleDownloadGame = async (game) => {
        try {
            setCurrentDownloadingGame(game); // Fire overlay animation screen target context hook
            await window.electron.downloadGame({ game });
        } catch (err) {
            setActiveError({ gameName: game.title, error: err.message });
            setCurrentDownloadingGame(null);
        }
    };

    const submitCrashReportToDev = async (userNote) => {
        if (!activeError) return;
        await window.electron.submitCrashReport({
            gameName: activeError.gameName,
            error: activeError.error,
            userNote: userNote
        });
        setActiveError(null);
    };

    // Submits the manual sidebar feedback payload straight through your Formspree tunnel to test it safely
    const handleManualSupportSubmit = async (message) => {
        await window.electron.submitCrashReport({
            gameName: "General Support & Feature Request Ticket",
            error: "User Initiated Feedback",
            userNote: message
        });
        setIsSupportModalOpen(false);
        alert("Message dispatched successfully! Check your developer inbox to verify the sync.");
    };

    const executePendingDelete = async () => {
        if (!pendingDeleteName) return;
        await window.electron.deleteGame(pendingDeleteName);
        const installedGames = await window.electron.getLocalGames();
        setLocalGames(installedGames);
        setPendingDeleteName(null);
    };

    const handleVideoEnd = () => setView('menu');
    const skipIntro = () => {
        if(videoRef.current) videoRef.current.pause();
        setView('menu');
    };

    const handleViewGameInfo = async (game) => {
        const result = await window.electron.getCheatsheet(game.title);
        setCheatsheet(result.success ? result.content : 'No cheatsheet available for this specific title.');
        setSelectedGame(game);
        setView('game-info');
    };

    // --- Dynamic Sub-Render Rendering Subroutines ---
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
        const recordMetrics = gameMetrics[selectedGame.title] || { totalPlayTime: 0, sessionsCount: 0 };
        const isGameInstalled = selectedGame.title === "Treasure in the Royal Tower" ? localGames.includes("TRT") : localGames.includes(selectedGame.title);
        
        return (
            <div className="game-info-view">
                 <div className="header-bar">
                    <button className="back-button icon-button" onClick={() => setView(isGameInstalled ? 'play' : 'browse')}>
                        <BackArrowIcon />
                    </button>
                    <h1 className="page-title">{selectedGame.title}</h1>
                </div>
                <div className="info-content">
                    <div className="info-sidebar-layout">
                        <img src={selectedGame.icon} alt={selectedGame.title} className="game-info-image" />
                        <div className="metrics-box">
                            <h3>Case File Telemetry</h3>
                            <p>Total Playtime: <strong>{recordMetrics.totalPlayTime.toFixed(1)} mins</strong></p>
                            <p>Sessions Logged: <strong>{recordMetrics.sessionsCount} launches</strong></p>
                        </div>
                    </div>
                    <div className="cheatsheet-text-area">
                        <h2>Game Info & Tactical Cheatsheet</h2>
                        <pre>{cheatsheet}</pre>
                    </div>
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

        // --- SIDEBAR DATA AGGREGATION CALCULATORS ---
        const totalGlobalPlayTime = Object.values(gameMetrics).reduce((acc, curr) => acc + (curr.totalPlayTime || 0), 0);
        
        let highestPlayTime = 0;
        let dominantGameTitle = "No History Logged";
        Object.entries(gameMetrics).forEach(([name, data]) => {
            if (data.totalPlayTime > highestPlayTime) {
                highestPlayTime = data.totalPlayTime;
                dominantGameTitle = name;
            }
        });

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
                            const isInstalled = game.title === "Treasure in the Royal Tower" ? localGames.includes("TRT") : localGames.includes(game.title);
                            const isAvailable = !!game.downloadUrl;

                            return (
                                <div key={game.id} className={`game-card ${!isAvailable && !isInstalled ? 'coming-soon-grayscale' : ''}`}>
                                    <div className="game-card-image-container" onClick={() => handleViewGameInfo(game)}>
                                        <img src={game.icon} alt={game.title} className="game-card-image" />
                                        {!isInstalled && !isAvailable && (
                                            <div className="coming-soon-banner"><span>Coming Soon</span></div>
                                        )}
                                    </div>
                                    <div className="card-body">
                                        <h2 className="card-title">{game.title}</h2>
                                        <div className="card-buttons">
                                            {isInstalled ? (
                                                <>
                                                    <button className="btn btn-primary" onClick={() => handleLaunchGame(game.title)}>Play</button>
                                                    <button className="btn btn-danger" onClick={() => setPendingDeleteName(game.title)}>Delete</button>
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
                            placeholder="Search Cases..."
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
                                <span>{`${(diskSpace.free / (1024**3)).toFixed(1)} GB Free`}</span>
                                <span>{`${(diskSpace.size / (1024**3)).toFixed(0)} GB Total`}</span>
                            </div>
                            <div className="storage-progress-bar-container">
                                <div className="storage-progress-bar" style={{ width: `${usagePercent}%`, backgroundColor: progressBarColor }}></div>
                            </div>
                        </div>
                    </div>

                    {/* --- NEW SIDEBAR TELEMETRY SUITE LAYOUT PANELS --- */}
                    <div className="metrics-box sidebar-stats-panel" style={{ marginTop: '0' }}>
                        <h3>Global Portal Tracking</h3>
                        <p>Total Portal Playtime:<br /><strong>{totalGlobalPlayTime.toFixed(1)} minutes</strong></p>
                        <p>Most Played File:<br /><strong style={{ color: 'var(--primary-glow-color)', fontSize: '0.9rem' }}>{dominantGameTitle}</strong></p>
                    </div>

                    <div className="sidebar-footer-actions" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={() => setIsSupportModalOpen(true)}>
                            Contact Support / Request Feature
                        </button>
                        <button className="btn btn-danger" style={{ borderColor: '#555', color: '#aaa' }} onClick={() => window.electron.openExternalLink('https://www.pegumax.com')}>
                            Visit pegumax.com
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main State Flow Controller Render Bridge ---
    return (
        <>
            {/* Global Overlays and Flow Managers */}
            <UpdateModal 
                data={updateData} 
                onUpdate={() => window.electron.downloadAppUpdate({ url: updateData.url, fileName: `GamePortal-Setup-${updateData.remote}.exe` })}
                onClose={() => setUpdateData(null)}
            />

            <CrashReportModal 
                errorData={activeError}
                onSubmit={submitCrashReportToDev}
                onClose={() => setActiveError(null)}
            />

            <SupportModal 
                isOpen={isSupportModalOpen}
                onSubmit={handleManualSupportSubmit}
                onClose={() => setIsSupportModalOpen(false)}
            />

            <NewGamesModal 
                newGamesList={newGamesAlert}
                onClose={() => setNewGamesAlert([])}
            />

            <CompleteModal 
                game={completionModalGame}
                onPlay={() => {
                    handleLaunchGame(completionModalGame.title);
                    setCompletionModalGame(null);
                }}
                onGoToGames={() => {
                    setView('play');
                    setCompletionModalGame(null);
                }}
                onClose={() => setCompletionModalGame(null)}
            />

            <DeleteConfirmModal 
                gameName={pendingDeleteName}
                onConfirm={executePendingDelete}
                onClose={() => setPendingDeleteName(null)}
            />

            {currentDownloadingGame && (
                <ActiveDownloadOverlay 
                    progressInfo={downloadProgress[currentDownloadingGame.id]} 
                    gameObj={currentDownloadingGame} 
                />
            )}

            {/* Explicit inline filtering mapping conditions for play / browse toggle panels */}
            {view === 'intro' && renderIntro()}
            {view === 'menu' && renderMenu()}
            {view === 'play' && renderGameListView('My Games', games.filter(g => g.title === "Treasure in the Royal Tower" ? localGames.includes("TRT") : localGames.includes(g.title)))}
            {view === 'browse' && renderGameListView('Browse Games', games.filter(g => !(g.title === "Treasure in the Royal Tower" ? localGames.includes("TRT") : localGames.includes(g.title))))}
            {view === 'game-info' && renderGameInfo()}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);