const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function waitForDevServer(url) {
  for (;;) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#111111',
    title: 'lynesque.com',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const builtClient = path.resolve(__dirname, '../client/dist/index.html');
  if (fs.existsSync(builtClient)) {
    await win.loadFile(builtClient);
  } else {
    const devUrl = 'http://127.0.0.1:5173';
    await waitForDevServer(devUrl);
    await win.loadURL(devUrl);
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
