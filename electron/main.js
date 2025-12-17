
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn, fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;
let mongoProcess;

const isDev = !app.isPackaged;
const platform = process.platform;
const mongoExec = platform === 'win32' ? 'mongod.exe' : 'mongod';

// PATH CONFIGURATION
// In production, 'resources' folder is at process.resourcesPath
// In dev, we look relative to this file
const mongoBinPath = isDev 
    ? path.join(__dirname, '../resources/mongodb/bin', mongoExec)
    : path.join(process.resourcesPath, 'mongodb/bin', mongoExec);

// In production, we copied 'backend' to resources/backend via electron-builder
const serverPath = isDev
    ? path.join(__dirname, '../backend/server.js')
    : path.join(process.resourcesPath, 'backend/server.js');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'data');

if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

function startMongoDB() {
    if (fs.existsSync(mongoBinPath)) {
        console.log("Starting MongoDB from:", mongoBinPath);
        // Bind to localhost only for security
        mongoProcess = spawn(mongoBinPath, ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1']);
        
        mongoProcess.stdout.on('data', (data) => console.log(`[Mongo]: ${data}`));
        mongoProcess.stderr.on('data', (data) => console.error(`[Mongo Err]: ${data}`));
    } else {
        console.error(`MongoDB binary not found at: ${mongoBinPath}`);
        if (!isDev) {
            dialog.showErrorBox("Database Error", "MongoDB binary missing. Please reinstall the application.");
        }
    }
}

function startExpressServer() {
    if (!fs.existsSync(serverPath)) {
        console.error("Backend server file not found at:", serverPath);
        dialog.showErrorBox("Missing Backend File", `Could not find server.js at: ${serverPath}`);
        return;
    }

    const env = Object.assign({}, process.env, {
        MONGO_URI: 'mongodb://127.0.0.1:27017/imani_shop',
        PORT: 5000,
        NODE_ENV: isDev ? 'development' : 'production'
    });

    console.log("Starting Express Backend...");
    
    // CRITICAL CHANGE: Use 'fork' instead of 'spawn'.
    // 'fork' uses the Electron app's internal Node.js runtime to execute the script.
    // This allows the app to run on computers that do NOT have Node.js installed.
    serverProcess = fork(serverPath, [], { 
        env, 
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'] 
    });

    let errorBuffer = '';

    serverProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
    
    serverProcess.stderr.on('data', (data) => {
        console.error(`[Backend Err]: ${data}`);
        errorBuffer += data.toString();
    });
    
    serverProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
            console.error(`Backend process exited with code ${code}`);
            // Only show error dialog if it's not a standard close
            if (!mainWindow || !mainWindow.isDestroyed()) {
                 // dialog.showErrorBox("Backend Stopped", `Server stopped. Code: ${code}\n${errorBuffer.slice(0, 300)}`);
            }
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Imani Shop System",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/favicon.ico')
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    startMongoDB();
    // Give Mongo 2 seconds to warm up
    setTimeout(() => {
        startExpressServer();
        // Give Backend 1 second to bind port
        setTimeout(createWindow, 1000);
    }, 2000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (serverProcess) serverProcess.kill();
    if (mongoProcess) mongoProcess.kill();
});
