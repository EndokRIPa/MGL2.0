const fs = require('fs-extra');
const path = require('path');

class LauncherSettings {
  constructor() {
    this.settingsFile = path.join(process.env.APPDATA, 'magma-launcher', 'settings.json');
    this.defaultSettings = {
      username: 'Player_MGL',
      javaPath: '',
      memoryMax: 2048,
      lastVersion: '1.20.1',
      lastModloader: 'vanilla',
      consoleEnabled: false,
      backgroundAnimation: true,
      blockColor: 'rgba(20, 20, 30, 0.9)',
      launchButtonColor: '#0078D7',
      textColor: 'white',
      accentColor: '#00ffff',
      secondaryTextColor: '#b5b4b3',
      currentStyle: 'default'
    };
    
    this.settings = { ...this.defaultSettings };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const savedSettings = fs.readJsonSync(this.settingsFile);
        this.settings = { ...this.defaultSettings, ...savedSettings };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  save() {
    try {
      fs.ensureDirSync(path.dirname(this.settingsFile));
      fs.writeJsonSync(this.settingsFile, this.settings, { spaces: 2 });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
  }

  update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getAll() {
    return { ...this.settings };
  }

  reset() {
    this.settings = { ...this.defaultSettings };
    this.save();
  }
}

module.exports = LauncherSettings;