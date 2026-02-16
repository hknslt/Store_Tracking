const { contextBridge, ipcRenderer } = require('electron');

// Bu kod Electron ile React arasında güvenli bir köprü kurar
contextBridge.exposeInMainWorld('electronAPI', {
    getMachineId: () => ipcRenderer.invoke('get-machine-id')
});