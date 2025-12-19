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
const mongoBinPath = isDev 
    ? path.join(__dirname, '../resources/mongodb/bin', mongoExec)
    : path.join(process.resourcesPath, 'mongodb/bin', mongoExec);

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
        return;
    }

    const env = Object.assign({}, process.env, {
        MONGO_URI: 'mongodb://127.0.0.1:27017/imani_shop',
        PORT: 5000,
        NODE_ENV: isDev ? 'development' : 'production'
    });

    console.log("Starting Express Backend...");
    
    serverProcess = fork(serverPath, [], { 
        env, 
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'] 
    });

    serverProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
    serverProcess.stderr.on('data', (data) => console.error(`[Backend Err]: ${data}`));
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
    // Start all services concurrently for maximum speed
    startMongoDB();
    startExpressServer();
    createWindow();

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