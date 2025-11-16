const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, exec } = require('child_process');
const os = require('os');
const LauncherSettings = require('./settings');

class MagmaLauncher {
  constructor() {
    this.settings = new LauncherSettings();
    this.mainWindow = null;
    this.settingsWindow = null;
    this.versionsWindow = null;
    this.colorPickerWindow = null;
    this.modloaderWindow = null;
    this.pendingModloaderData = null;
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1170,
      height: 740,
      resizable: false,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../assets/icons/icon.png')
    });

    this.mainWindow.loadFile('index.html');
    
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.setupIpcHandlers();
  }

  createModloaderWindow(version) {
    if (this.modloaderWindow) {
        this.modloaderWindow.close();
    }

    this.modloaderWindow = new BrowserWindow({
        width: 450, // Увеличил ширину
        height: 600, // Увеличил высоту
        parent: this.mainWindow,
        modal: true,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Сохраняем данные для отправки после загрузки окна
    this.pendingModloaderData = {
        version: version,
        availableModloaders: this.getAvailableModloaders(version)
    };

    this.modloaderWindow.loadFile('windows/modloader.html');
    
    // Обработчик загрузки содержимого окна
    this.modloaderWindow.webContents.on('did-finish-load', () => {
        if (this.pendingModloaderData && this.modloaderWindow) {
            this.modloaderWindow.webContents.send('modloaders-data', this.pendingModloaderData);
            this.pendingModloaderData = null;
        }
    });

    this.modloaderWindow.on('closed', () => {
        this.modloaderWindow = null;
        this.pendingModloaderData = null;
    });

    // Setup IPC for modloader window
    this.setupModloaderIpc();
  }

  setupModloaderIpc() {
    if (!this.modloaderWindow) return;

    // Modloader selected
    ipcMain.on('modloader-selected', (event, { version, modloader }) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('version-modloader-selected', { version, modloader });
      }
      if (this.modloaderWindow) {
        this.modloaderWindow.close();
      }
    });

    // Close modloader window
    ipcMain.on('close-modloader', () => {
      if (this.modloaderWindow) {
        this.modloaderWindow.close();
      }
    });
  }

  getAvailableModloaders(version) {
    const versionNum = this.parseVersion(version);
    const available = ['vanilla']; // Vanilla всегда доступен

    // Fabric поддерживается с версии 1.14
    if (this.compareVersions(versionNum, [1, 14, 0]) >= 0) {
      available.push('fabric');
    }

    // Forge поддерживается с очень старых версий, но ограничим для ясности
    if (this.compareVersions(versionNum, [1, 0, 0]) >= 0) {
      available.push('forge');
    }

    // NeoForge поддерживается с версии 1.20.1 (отделился от Forge)
    if (this.compareVersions(versionNum, [1, 20, 1]) >= 0) {
      available.push('neoforge');
    }

    return available;
  }

  parseVersion(versionString) {
    // Преобразуем строку версии в массив чисел
    const parts = versionString.split('.').map(part => {
      const num = parseInt(part);
      return isNaN(num) ? 0 : num;
    });
    
    // Дополняем до 3 частей (major.minor.patch)
    while (parts.length < 3) {
      parts.push(0);
    }
    
    return parts.slice(0, 3);
  }

  compareVersions(version1, version2) {
    for (let i = 0; i < 3; i++) {
      if (version1[i] > version2[i]) return 1;
      if (version1[i] < version2[i]) return -1;
    }
    return 0;
  }

  createSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 700,
      parent: this.mainWindow,
      modal: true,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.settingsWindow.loadFile('windows/settings.html');
    
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    // Setup IPC for settings window
    this.setupSettingsIpc();
  }

  createVersionsWindow() {
    if (this.versionsWindow) {
      this.versionsWindow.focus();
      return;
    }

    this.versionsWindow = new BrowserWindow({
      width: 500,
      height: 400,
      parent: this.mainWindow,
      modal: true,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.versionsWindow.loadFile('windows/versions.html');
    this.versionsWindow.on('closed', () => {
      this.versionsWindow = null;
    });

    // Setup IPC for versions window
    this.setupVersionsIpc();
  }

  createColorPickerWindow() {
    if (this.colorPickerWindow) {
      this.colorPickerWindow.focus();
      return;
    }

    this.colorPickerWindow = new BrowserWindow({
      width: 500,
      height: 600,
      parent: this.mainWindow,
      modal: true,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.colorPickerWindow.loadFile('windows/color-picker.html');
    this.colorPickerWindow.on('closed', () => {
      this.colorPickerWindow = null;
    });

    // Setup IPC for color picker window
    this.setupColorPickerIpc();
  }

  setupIpcHandlers() {
    // Window controls
    ipcMain.on('minimize-window', () => {
      if (this.mainWindow) this.mainWindow.minimize();
    });

    ipcMain.on('close-window', () => {
      if (this.mainWindow) this.mainWindow.close();
    });

    ipcMain.on('open-modloader', (event, version) => {
        this.createModloaderWindow(version);
    });

    // Windows management
    ipcMain.on('open-settings', () => {
      this.createSettingsWindow();
    });

    ipcMain.on('open-versions', () => {
      this.createVersionsWindow();
    });

    ipcMain.on('open-color-picker', () => {
      this.createColorPickerWindow();
    });

    // Minecraft launch
    ipcMain.on('launch-minecraft', async (event, { version, username, modloader }) => {
      await this.launchMinecraft(event, version, username, modloader);
    });

    // Open folders
    ipcMain.on('open-folder', (event, folderType) => {
      this.openFolder(folderType);
    });

    // Open URLs
    ipcMain.on('open-url', (event, url) => {
      shell.openExternal(url);
    });

    // Get settings
    ipcMain.handle('get-settings', () => {
      return this.settings.getAll();
    });

    // Save settings
    ipcMain.on('save-settings', (event, newSettings) => {
      this.settings.update(newSettings);
      this.settings.save();
      // Notify main window about settings change
      if (this.mainWindow) {
        this.mainWindow.webContents.send('settings-changed', this.settings.getAll());
      }
    });

    // Get Minecraft versions
    ipcMain.handle('get-minecraft-versions', async () => {
      return await this.getMinecraftVersions();
    });

    // Get system RAM info
    ipcMain.handle('get-system-ram', () => {
      return this.getSystemRamInfo();
    });

    // Get Minecraft head texture
    ipcMain.handle('get-player-head', async (event, username) => {
      return await this.getPlayerHeadTexture(username);
    });

    // Load news
    ipcMain.handle('load-news', async () => {
      return await this.loadNews();
    });

    // Refresh news
    ipcMain.on('refresh-news', async (event) => {
      const news = await this.loadNews();
      if (this.mainWindow) {
        this.mainWindow.webContents.send('news-updated', news);
      }
    });
  }

  setupSettingsIpc() {
    if (!this.settingsWindow) return;

    // Java path browser
    ipcMain.on('browse-java', async (event) => {
      const result = await dialog.showOpenDialog(this.settingsWindow, {
        title: 'Выберите исполняемый файл Java',
        filters: [
          { name: 'Java Executable', extensions: ['exe'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled) {
        event.reply('java-path-selected', result.filePaths[0]);
      }
    });

    // Get RAM info for settings window
    this.settingsWindow.webContents.once('did-finish-load', () => {
      this.settingsWindow.webContents.send('ram-info', this.getSystemRamInfo());
    });

    // Close settings window
    ipcMain.on('close-settings', () => {
      if (this.settingsWindow) {
        this.settingsWindow.close();
      }
    });
  }

  setupVersionsIpc() {
    if (!this.versionsWindow) return;

    // Send versions to versions window
    this.versionsWindow.webContents.once('did-finish-load', async () => {
      const versions = await this.getMinecraftVersions();
      this.versionsWindow.webContents.send('versions-loaded', versions);
    });

    // Close versions window
    ipcMain.on('close-versions', () => {
      if (this.versionsWindow) {
        this.versionsWindow.close();
      }
    });

    // Version selected
    ipcMain.on('version-selected', (event, version) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('version-changed', version);
      }
      if (this.versionsWindow) {
        this.versionsWindow.close();
      }
    });
  }

  setupColorPickerIpc() {
    if (!this.colorPickerWindow) return;

    // Close color picker window
    ipcMain.on('close-color-picker', () => {
      if (this.colorPickerWindow) {
        this.colorPickerWindow.close();
      }
    });
  }

  getSystemRamInfo() {
    const totalMemoryMB = Math.floor(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.floor(os.freemem() / 1024 / 1024);
    
    const recommendedMax = Math.floor(totalMemoryMB * 0.8);
    
    return {
      total: totalMemoryMB,
      free: freeMemoryMB,
      recommendedMax: recommendedMax,
      min: 1024,
      max: Math.min(recommendedMax, 32000)
    };
  }

  async getPlayerHeadTexture(username) {
    try {
      const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
      if (!response.ok) throw new Error('Player not found');
      
      const profile = await response.json();
      const uuid = profile.id;
      
      const textureResponse = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      if (!textureResponse.ok) throw new Error('Texture not found');
      
      const textureData = await textureResponse.json();
      const textureBase64 = textureData.properties[0].value;
      const textureJson = JSON.parse(Buffer.from(textureBase64, 'base64').toString());
      const textureUrl = textureJson.textures.SKIN.url;
      
      return textureUrl;
    } catch (error) {
      console.log('Using default player head');
      return null;
    }
  }

  async loadNews() {
    try {
        // Прямое обращение к raw.githubusercontent.com
        const response = await fetch('https://raw.githubusercontent.com/EndokRIPa/MGL2.0/main/news.txt', {
            headers: {
                'Accept': 'text/plain',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const newsText = await response.text();
        return newsText;
        
    } catch (error) {
        console.log('Using fallback news:', error);
        return `Ошибка загрузки новостей: ${error.message}\n\nПроверьте подключение к интернету или попробуйте позже.`;
    }
  }

  async launchMinecraft(event, version, username, modloader) {
    try {
      event.reply('launch-progress', { progress: 0, status: 'Starting download...' });

      const javaPath = await this.ensureJava();
      if (!javaPath) {
        event.reply('launch-error', 'Java not found');
        return;
      }

      event.reply('launch-progress', { progress: 30, status: 'Downloading Minecraft...' });
      
      const success = await this.downloadAndLaunchMinecraft(version, username, modloader, javaPath);
      
      if (success) {
        event.reply('launch-progress', { progress: 100, status: 'Launching Minecraft...' });
        event.reply('launch-success');
      } else {
        event.reply('launch-error', 'Failed to launch Minecraft');
      }

    } catch (error) {
      event.reply('launch-error', error.message);
    }
  }

  async ensureJava() {
    if (this.settings.get('javaPath') && await fs.pathExists(this.settings.get('javaPath'))) {
      return this.settings.get('javaPath');
    }

    const possiblePaths = [
      'java',
      'javaw',
      path.join(process.env.JAVA_HOME || '', 'bin', 'java.exe'),
      path.join(process.env.JAVA_HOME || '', 'bin', 'javaw.exe'),
      'C:/Program Files/Java/jre8/bin/javaw.exe',
      'C:/Program Files/Java/jre17/bin/javaw.exe'
    ];

    for (const javaPath of possiblePaths) {
      try {
        await this.checkJavaExecutable(javaPath);
        this.settings.set('javaPath', javaPath);
        return javaPath;
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  checkJavaExecutable(javaPath) {
    return new Promise((resolve, reject) => {
      exec(`"${javaPath}" -version`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async downloadAndLaunchMinecraft(version, username, modloader, javaPath) {
    const minecraftDir = path.join(process.env.APPDATA, '.minecraft');
    await fs.ensureDir(minecraftDir);

    // TODO: Implement full Minecraft download and launch logic
    
    const launchArgs = [
      '-Xmx' + this.settings.get('memoryMax') + 'M',
      '-jar',
      path.join(minecraftDir, 'versions', version, version + '.jar'),
      '--username',
      username,
      '--version',
      version,
      '--gameDir',
      minecraftDir,
      '--assetsDir',
      path.join(minecraftDir, 'assets'),
      '--assetIndex',
      version
    ];

    const minecraftProcess = spawn(javaPath, launchArgs, {
      cwd: minecraftDir,
      detached: true,
      stdio: 'ignore'
    });

    minecraftProcess.unref();
    return true;
  }

  async getMinecraftVersions() {
    try {
      const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
      const data = await response.json();
      
      return data.versions
        .filter(v => v.type === 'release')
        .map(v => v.id)
        .slice(0, 50);
    } catch (error) {
      return ['1.20.1', '1.19.2', '1.18.2', '1.17.1', '1.16.5', '1.15.2', '1.14.4', '1.13.2', '1.12.2'];
    }
  }

  openFolder(folderType) {
    const basePath = path.join(process.env.APPDATA, '.minecraft');
    let folderPath;

    switch (folderType) {
      case 'game':
        folderPath = basePath;
        break;
      case 'mods':
        folderPath = path.join(basePath, 'mods');
        break;
      case 'texturepacks':
        folderPath = path.join(basePath, 'resourcepacks');
        break;
      default:
        return;
    }

    fs.ensureDirSync(folderPath);
    shell.openPath(folderPath);
  }

  init() {
    app.whenReady().then(() => {
      this.createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }
}

const launcher = new MagmaLauncher();
launcher.init();