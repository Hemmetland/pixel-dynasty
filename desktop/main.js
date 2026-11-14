// Electron-skal för Pixel Dynasty. Rör inte spelkoden: laddar den byggda dist/index.html.
// Spelet laddas via ett eget protokoll (app://game) så att localStorage (sparfilerna) får en fast
// ursprungsadress och överlever uppdateringar och att appen flyttas.
const { app, BrowserWindow, Menu, protocol, shell, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const FEEDBACK_URL = process.env.PD_FEEDBACK_URL ||
  'https://github.com/Hemmetland/pixel-dynasty/issues/new?template=testfeedback.yml'; // GitHub-issue med mall
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function gameDir() {
  return app.isPackaged ? path.join(__dirname, 'game') : path.join(__dirname, '..', 'dist');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500,
    backgroundColor: '#10131c', title: 'Pixel Dynasty', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') },
  });
  win.loadURL('app://game/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
}

function buildMenu() {
  const feedback = FEEDBACK_URL
    ? [{ label: 'Skicka feedback…', click: () => shell.openExternal(FEEDBACK_URL) }] : [];
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'Spel', submenu: [
      { role: 'togglefullscreen', label: 'Helskärm' },
      { role: 'reload', label: 'Ladda om' },
      { label: 'Öppna mapp med sparfiler', click: () => shell.openPath(app.getPath('userData')) },
      ...feedback,
      { type: 'separator' }, { role: 'quit', label: 'Avsluta' },
    ] },
    { label: 'Felsök', submenu: [{ role: 'toggleDevTools', label: 'Utvecklarverktyg' }] },
  ]));
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(gameDir(), rel));
    if (!file.startsWith(gameDir())) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
