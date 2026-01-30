/*
 * drive.js - Google Drive Integration
 * Handles Authentication and High Score Management via AppData folder
 */

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCORE_FILE_NAME = 'gravity_flip_scores.json';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let accessToken = null;
let currentUser = null; // { name: string, photo: string }

// Exposed state
window.driveState = {
    isAuthenticated: false,
    highScore: 0,
    playerName: 'Player 1'
};

// 1. Load APIs
function handleClientLoad() {
    gapi.load('client', initializeGapiClient);
    // GIS is loaded via script tag callback 'onGisLoaded' or manual check
}

async function initializeGapiClient() {
    // We don't initialize with API Key here usually if we just use Access Token, 
    // but for Discovery docs we might need it or just fetch them.
    // For simplicity, we rely on the user providing their CREDENTIALS via the UI or hardcoded for the demo context.
    // NOTE: In a real app, ClientID is safe to expose, API Key is safe for public data quotas.

    // We will wait for the user to click "Connect" to actually init with the keys they provide.
    gapiInited = true;
    checkAuthAvailable();
}

function handleGisLoad() {
    gisInited = true;
    checkAuthAvailable();
}

function checkAuthAvailable() {
    const btn = document.getElementById('google-login-btn');
    if (gapiInited && gisInited && btn) {
        btn.disabled = false;
        btn.textContent = 'Connect to Google Drive';
    }
}

// 2. Authorization Flow
async function connectGoogleDrive(clientId, apiKey) {
    if (!clientId || !apiKey) {
        alert("Please enter both Client ID and API Key in the settings.");
        return;
    }

    try {
        await gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: [DISCOVERY_DOC],
        });

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: async (resp) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                accessToken = resp.access_token;
                window.driveState.isAuthenticated = true;

                // Fetch User Info (from People API or just Drive 'about') -- Drive About is easier for name
                // Actually, let's just use the file logic. For the name, we can ask the user or try to get it.
                // Let's use a simple prompt for now or assume the user entered it manually if we don't include Profile scope.

                document.getElementById('google-login-btn').textContent = 'Connected';
                document.getElementById('google-login-btn').classList.add('success');
                document.getElementById('drive-status').textContent = 'Drive Sync Active';

                await loadHighScoreFromDrive();
            },
        });

        // Trigger the pop-up
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    } catch (err) {
        console.error("Auth Error", err);
        alert("Failed to connect: " + JSON.stringify(err));
    }
}

// 3. File Operations
async function loadHighScoreFromDrive() {
    try {
        // Search for file
        const res = await gapi.client.drive.files.list({
            q: `name = '${SCORE_FILE_NAME}' and 'appDataFolder' in parents`,
            fields: 'files(id, name)',
            spaces: 'appDataFolder'
        });

        const files = res.result.files;
        if (files && files.length > 0) {
            // File exists, read it
            const fileId = files[0].id;
            const content = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const data = content.result; // Should be JSON object already if valid
            if (data && data.highScore) {
                window.driveState.highScore = data.highScore;
                window.driveState.playerName = data.playerName || 'Player 1';
                updateHighScoreUI();
            }
        } else {
            console.log("No high score file found, starting fresh.");
        }
    } catch (err) {
        console.error("Load Error", err);
    }
}

async function saveHighScoreToDrive(score, playerName) {
    if (!window.driveState.isAuthenticated) return;

    // Only save if it's a new high score
    if (score <= window.driveState.highScore) return;

    window.driveState.highScore = score;
    window.driveState.playerName = playerName;
    updateHighScoreUI();

    const fileContent = {
        highScore: score,
        playerName: playerName,
        date: new Date().toISOString()
    };

    try {
        // Search first to get ID
        const res = await gapi.client.drive.files.list({
            q: `name = '${SCORE_FILE_NAME}' and 'appDataFolder' in parents`,
            fields: 'files(id)',
            spaces: 'appDataFolder'
        });

        const files = res.result.files;

        const blob = new Blob([JSON.stringify(fileContent)], { type: 'application/json' });

        if (files && files.length > 0) {
            // Update existing
            const fileId = files[0].id;
            // Using fetch because gapi client update dealing with multipart/media is verbose
            // But we can use the gapi generic request

            // Actually, simplified: just delete and recreate or use generic HTTP
            // Let's use basic multipart upload logic over pure REST if needed, 
            // OR use the gapi.client.request which is easier for simple updates

            await gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: JSON.stringify(fileContent)
            });
            console.log("Score updated on Drive.");

        } else {
            // Create new
            const metadata = {
                name: SCORE_FILE_NAME,
                parents: ['appDataFolder']
            };

            // Multipart body for creation (Metadata + Media)
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify(fileContent)], { type: 'application/json' }));

            // NOTE: gapi doesn't support FormData directly usually, we need to construct the multipart body manually string-wise
            // or use standard fetch with the token.

            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });
            console.log("New score file created on Drive.");
        }

    } catch (err) {
        console.error("Save Error", err);
    }
}

function updateHighScoreUI() {
    const els = document.querySelectorAll('.high-score-display');
    els.forEach(el => {
        el.textContent = `${window.driveState.playerName}: ${window.driveState.highScore}`;
    });
}
