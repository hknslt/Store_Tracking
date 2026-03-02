const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { machineIdSync } = require('node-machine-id');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Bahçemo Mağazam",
    icon: path.join(__dirname, 'public/icon.ico'),
    webPreferences: {
      nodeIntegration: false,    
      contextIsolation: true,    
      preload: path.join(__dirname, 'preload.cjs') 
    }
  });


  win.loadURL('http://localhost:5173').catch((e) => {
    console.log('Sunucuya bağlanamadı, dist dosyasına bakılıyor...');
    win.loadFile('dist/index.html');
  });
};


ipcMain.handle('get-machine-id', async () => {
  try {

    const id = machineIdSync({ original: true });
    return id;
  } catch (error) {
    console.error("Machine ID alınamadı:", error);
    return "UNKNOWN_DEVICE";
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});