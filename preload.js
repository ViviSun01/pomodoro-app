const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => {
    new Notification({ title, body }).show();
  }
});