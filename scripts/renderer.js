const { ipcRenderer } = require('electron');
const path = require('path');

class MagmaRenderer {
  constructor() {
    this.settings = {};
    this.playerHeadUrl = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.applyStyles();
    this.loadNews();
    this.setup3DHead();
    this.setupMouseTracking();
  }

  async loadSettings() {
    this.settings = await ipcRenderer.invoke('get-settings');
    
    document.getElementById('username-input').value = this.settings.username || 'Player_MGL';
    document.getElementById('username-label').textContent = this.settings.username || 'Player_MGL';
    
    const versions = await ipcRenderer.invoke('get-minecraft-versions');
    this.populateVersionCombo(versions);
  }

  populateVersionCombo(versions) {
    const combo = document.getElementById('version-combo');
    combo.innerHTML = '';
    
    versions.forEach(version => {
      const option = document.createElement('option');
      option.value = version;
      option.textContent = version;
      combo.appendChild(option);
    });

    if (this.settings.lastVersion) {
      combo.value = this.settings.lastVersion;
    }
  }

  setupEventListeners() {

    document.getElementById('version-select-btn').addEventListener('click', () => {
      ipcRenderer.send('open-versions');
    });

    // Version selected from versions window
    ipcRenderer.on('version-changed', (event, version) => {
      this.selectedVersion = version;
      // После выбора версии открываем окно выбора модлоадера
      ipcRenderer.send('open-modloader', version);
    });

    // Version and modloader selected
    ipcRenderer.on('version-modloader-selected', (event, { version, modloader }) => {
      this.onVersionModloaderSelected(version, modloader);
    });

    // Window controls
    document.getElementById('minimize-btn').addEventListener('click', () => {
      ipcRenderer.send('minimize-window');
    });

    document.getElementById('close-btn').addEventListener('mouseenter', () => {
      this.lookAtUser();
    });
    document.getElementById('close-btn').addEventListener('mouseleave', () => {
      this.resetHeadRotation();
    });

    document.getElementById('close-btn').addEventListener('click', () => {
      ipcRenderer.send('close-window');
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
      ipcRenderer.send('open-settings');
    });

    // Remove versions button from settings panel since it's already in main UI
    const versionsBtn = document.getElementById('versions-btn');
    if (versionsBtn) versionsBtn.style.display = 'none';

    document.getElementById('color-btn').addEventListener('click', () => {
      ipcRenderer.send('open-color-picker');
    });

    // Animation toggle
    document.getElementById('animation-btn').addEventListener('click', () => {
      this.toggleBackgroundAnimation();
    });

    // News refresh button
    document.getElementById('news-btn').addEventListener('click', () => {
      this.refreshNews();
    });

    // Launch button
    document.getElementById('launch-btn').addEventListener('click', () => {
      this.launchMinecraft();
    });

    // Username input with head loading
    document.getElementById('username-input').addEventListener('input', async (e) => {
      this.settings.username = e.target.value;
      document.getElementById('username-label').textContent = e.target.value;
      this.saveSettings();
      
      // Load player head
      await this.loadPlayerHead(e.target.value);
    });

    // Version selection
    document.getElementById('version-combo').addEventListener('change', (e) => {
      this.settings.lastVersion = e.target.value;
      this.saveSettings();
    });

    // Version select button
    document.getElementById('version-select-btn').addEventListener('click', () => {
      ipcRenderer.send('open-versions');
    });

    // Folder buttons
    document.getElementById('game-folder-btn').addEventListener('click', () => {
      ipcRenderer.send('open-folder', 'game');
    });

    document.getElementById('mods-folder-btn').addEventListener('click', () => {
      ipcRenderer.send('open-folder', 'mods');
    });

    document.getElementById('texturepacks-folder-btn').addEventListener('click', () => {
      ipcRenderer.send('open-folder', 'texturepacks');
    });

    // External links
    document.getElementById('download-btn').addEventListener('click', () => {
      ipcRenderer.send('open-url', 'https://t.me/mglfiles');
    });

    document.getElementById('telegram-btn').addEventListener('click', () => {
      ipcRenderer.send('open-url', 'https://t.me/mglauncher');
    });

    // Avatar click
    const avatarContainer = document.getElementById('avatar-container');
    if (avatarContainer) {
      avatarContainer.addEventListener('click', () => {
        ipcRenderer.send('open-url', 'https://mglauncher.ru/user');
      });
    }

    // IPC listeners
    ipcRenderer.on('launch-progress', (event, data) => {
      this.updateProgress(data.progress, data.status);
    });

    ipcRenderer.on('launch-success', () => {
      this.onLaunchSuccess();
    });

    ipcRenderer.on('launch-error', (event, error) => {
      this.onLaunchError(error);
    });

    ipcRenderer.on('settings-changed', (event, newSettings) => {
      this.settings = newSettings;
      this.applyStyles();
    });

    ipcRenderer.on('version-changed', (event, version) => {
      document.getElementById('version-combo').value = version;
      this.settings.lastVersion = version;
      this.saveSettings();
    });

    ipcRenderer.on('news-updated', (event, news) => {
      this.displayNews(news);
    });
  }

  onVersionModloaderSelected(version, modloader) {
    // Устанавливаем выбранную версию в комбобокс
    document.getElementById('version-combo').value = version;
    this.settings.lastVersion = version;
    this.settings.lastModloader = modloader;
    this.saveSettings();

    // Показываем уведомление о выборе
    this.showModloaderNotification(version, modloader);
  }

  showModloaderNotification(version, modloader) {
    const modloaderNames = {
      'vanilla': 'Vanilla',
      'fabric': 'Fabric',
      'forge': 'Forge', 
      'neoforge': 'NeoForge'
    };

    const modloaderText = modloaderNames[modloader] || modloader;
    
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(30, 30, 50, 0.95);
      color: white;
      padding: 20px;
      border-radius: 10px;
      border: 2px solid #00ffff;
      z-index: 1000;
      font-size: 16px;
      text-align: center;
    `;
    
    notification.innerHTML = `
      <div style="margin-bottom: 10px;">Версия успешно выбрана!</div>
      <div><strong>Версия:</strong> ${version}</div>
      <div><strong>Модлоадер:</strong> ${modloaderText}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  setup3DHead() {
    const leftColumn = document.querySelector('.left-column');
    if (!leftColumn) return;

    // Remove existing avatar container if any
    const existingAvatar = document.getElementById('avatar-container');
    if (existingAvatar) {
      existingAvatar.remove();
    }

    // Create avatar container
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container block';
    avatarContainer.id = 'avatar-container';
    
    avatarContainer.innerHTML = `
      <div class="head-container">
        <div class="minecraft-head" id="minecraft-head">
          <div class="head-face head-front"></div>
          <div class="head-face head-back"></div>
          <div class="head-face head-right"></div>
          <div class="head-face head-left"></div>
          <div class="head-face head-top"></div>
          <div class="head-face head-bottom"></div>
        </div>
      </div>
    `;
    
    // Insert avatar container after left column
    leftColumn.parentNode.insertBefore(avatarContainer, leftColumn.nextSibling);
    
    // Load default head
    this.loadPlayerHead(this.settings.username);
  }

  setupMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateHeadRotation();
    });
  }

  updateHeadRotation() {
    const head = document.getElementById('minecraft-head');
    if (!head) return;

    const headRect = head.getBoundingClientRect();
    const headCenterX = headRect.left + headRect.width / 2;
    const headCenterY = headRect.top + headRect.height / 2;
    
    // Calculate rotation based on mouse position relative to head center
    const deltaX = this.mouseX - headCenterX;
    const deltaY = this.mouseY - headCenterY;
    
    const rotateY = deltaX / 20;
    const rotateX = -deltaY / 20;
    
    head.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  }

  lookAtUser() {
    const head = document.getElementById('minecraft-head');
    if (!head) return;
    // Плавно поворачиваем голову "прямо на пользователя"
    head.style.transition = 'transform 0.5s ease';
    head.style.transform = 'rotateY(0deg) rotateX(0deg)';
  }

  resetHeadRotation() {
    const head = document.getElementById('minecraft-head');
    if (!head) return;
    // Возвращаем плавное управление мышью
    head.style.transition = 'transform 0.1s ease';
    this.updateHeadRotation();
  }

  async loadPlayerHead(username) {
    if (!username || username === 'Player_MGL') {
      this.setDefaultHead();
      return;
    }

    try {
      const textureUrl = await ipcRenderer.invoke('get-player-head', username);
      
      if (textureUrl) {
        await this.applyHeadTexture(textureUrl);
      } else {
        this.setDefaultHead();
      }
    } catch (error) {
      console.log('Error loading player head:', error);
      this.setDefaultHead();
    }
  }

  async applyHeadTexture(textureUrl) {
    const head = document.getElementById('minecraft-head');
    if (!head) return;

    try {
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = resolve;
            img.onerror = reject;
            img.src = textureUrl;
        });

        const faces = head.querySelectorAll('.head-face');
        faces.forEach(face => {
            face.style.backgroundImage = `url(${textureUrl})`;
            face.style.backgroundSize = '504px 504px'; // Увеличиваем размер фона
            face.style.imageRendering = 'pixelated';
        });

        // Координаты для головы Minecraft (64x64 скин)
        const faceTextures = {
            'head-front': '-64px -64px',   /* Передняя часть */
            'head-back': '-160px -64px',   /* Задняя часть */
            'head-right': '-128px -64px',  /* Правая часть */
            'head-left': '0px -64px',     /* Левая часть */
            'head-top': '-64px 0px',      /* Верхняя часть */
            'head-bottom': '-128px 0px' /* Нижняя часть */
        };

        Object.keys(faceTextures).forEach(className => {
            const face = head.querySelector(`.${className}`);
            if (face) {
                face.style.backgroundPosition = faceTextures[className];
            }
        });
    } catch (error) {
        console.error('Failed to load texture:', error);
        this.setDefaultHead();
    }
  }


  setDefaultHead() {
    const head = document.getElementById('minecraft-head');
    if (!head) return;

    const faces = head.querySelectorAll('.head-face');
    const defaultTextureUrl = 'assets/player.png';

    try {
        const defaultHead = new Image();
        defaultHead.onload = () => {
            faces.forEach(face => {
                face.style.backgroundImage = `url(${defaultTextureUrl})`;
                face.style.backgroundSize = '504px 504px';
                face.style.imageRendering = 'pixelated';
                face.style.backgroundColor = 'transparent';
            });

            const faceTextures = {
                'head-front': '-64px -64px',
                'head-back': '-160px -64px',
                'head-right': '-128px -64px',
                'head-left': '0px -64px',
                'head-top': '-64px 0px',
                'head-bottom': '-126px 0px'
            };

            Object.keys(faceTextures).forEach(className => {
                const face = head.querySelector(`.${className}`);
                if (face) {
                    face.style.backgroundPosition = faceTextures[className];
                }
            });
        };

        defaultHead.onerror = () => {
            faces.forEach(face => {
                face.style.backgroundImage = '';
                face.style.backgroundColor = '#8B8B8B';
            });
        };

        defaultHead.src = defaultTextureUrl;
    } catch (error) {
        console.error('Failed to load default head texture:', error);
        faces.forEach(face => {
            face.style.backgroundImage = '';
            face.style.backgroundColor = '#8B8B8B';
        });
    }
  }

  applyStyles() {
    document.documentElement.style.setProperty('--block-color', this.settings.blockColor || 'rgba(20, 20, 30, 0.9)');
    document.documentElement.style.setProperty('--launch-btn-color', this.settings.launchButtonColor || '#0078D7');
    document.documentElement.style.setProperty('--text-color', this.settings.textColor || 'white');
    document.documentElement.style.setProperty('--accent-color', this.settings.accentColor || '#00ffff');
    document.documentElement.style.setProperty('--secondary-text-color', this.settings.secondaryTextColor || '#b5b4b3');
    
    // Apply background animation
    if (this.settings.backgroundAnimation !== false) {
      document.body.classList.add('animated-background');
    } else {
      document.body.classList.remove('animated-background');
    }
  }

  toggleBackgroundAnimation() {
    this.settings.backgroundAnimation = !this.settings.backgroundAnimation;
    this.applyStyles();
    this.saveSettings();
    
    const status = this.settings.backgroundAnimation ? 'включена' : 'выключена';
    alert(`Анимация фона ${status}`);
  }

  async refreshNews() {
    const newsBtn = document.getElementById('news-btn');
    const originalText = newsBtn.textContent;
    newsBtn.textContent = 'Обновление...';
    newsBtn.disabled = true;

    try {
      // Force reload news
      const newsText = await ipcRenderer.invoke('load-news');
      this.displayNews(newsText);
    } catch (error) {
      console.log('Error refreshing news:', error);
      this.displayNews('Ошибка загрузки новостей...\n\nПроверьте подключение к интернету или попробуйте позже.');
    } finally {
      setTimeout(() => {
        newsBtn.textContent = originalText;
        newsBtn.disabled = false;
      }, 1000);
    }
  }

  async launchMinecraft() {
    const version = document.getElementById('version-combo').value;
    const username = document.getElementById('username-input').value || 'Player_MGL';
    const modloader = this.settings.lastModloader || 'vanilla';

    this.showProgress();
    this.updateProgress(0, 'Подготовка...');
    this.setLaunchState(false);

    try {
      await ipcRenderer.invoke('launch-minecraft', { version, username, modloader });
    } catch (error) {
      this.onLaunchError(error.message);
    }
  }

  showProgress() {
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    if (progressBar) progressBar.style.display = 'block';
    if (progressStatus) progressStatus.style.display = 'block';
  }

  hideProgress() {
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    if (progressBar) progressBar.style.display = 'none';
    if (progressStatus) progressStatus.style.display = 'none';
  }

  updateProgress(progress, status) {
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    if (progressBar) progressBar.value = progress;
    if (progressStatus) progressStatus.textContent = status;
  }

  setLaunchState(enabled) {
    const launchBtn = document.getElementById('launch-btn');
    const versionCombo = document.getElementById('version-combo');
    const usernameInput = document.getElementById('username-input');
    
    if (launchBtn) {
      launchBtn.disabled = !enabled;
      launchBtn.textContent = enabled ? 'ЗАПУСК' : 'ЗАГРУЗКА...';
    }
    
    if (versionCombo) versionCombo.disabled = !enabled;
    if (usernameInput) usernameInput.disabled = !enabled;
  }

  onLaunchSuccess() {
    this.updateProgress(100, 'Запуск выполнен!');
    this.setLaunchState(true);
    
    setTimeout(() => {
      this.hideProgress();
    }, 3000);
  }

  onLaunchError(error) {
    this.updateProgress(0, `Ошибка: ${error}`);
    this.setLaunchState(true);
    
    setTimeout(() => {
      this.hideProgress();
    }, 5000);
    
    alert(`Ошибка запуска: ${error}`);
  }

  saveSettings() {
    ipcRenderer.send('save-settings', this.settings);
  }

  async loadNews() {
    try {
      const newsText = await ipcRenderer.invoke('load-news');
      this.displayNews(newsText);
    } catch (error) {
      console.log('Error loading news:', error);
      this.displayNews('Ошибка загрузки новостей...\n\nПроверьте подключение к интернету или попробуйте позже.');
    }
  }

  async loadNews() {
        try {
            // Используем NewsManager для загрузки новостей
            if (window.newsManager) {
                await window.newsManager.loadNews();
            } else {
                // Fallback если NewsManager не загрузился
                const newsText = await ipcRenderer.invoke('load-news');
                this.displayNews(newsText);
            }
        } catch (error) {
            console.log('Error loading news:', error);
            this.displayNews('Ошибка загрузки новостей...\n\nПроверьте подключение к интернету или попробуйте позже.');
        }
  }

  async refreshNews() {
        const newsBtn = document.getElementById('news-btn');
        const originalText = newsBtn.textContent;
        newsBtn.textContent = 'Обновление...';
        newsBtn.disabled = true;

        try {
            // Используем NewsManager для обновления
            if (window.newsManager) {
                await window.newsManager.refreshNews();
            } else {
                // Fallback
                const newsText = await ipcRenderer.invoke('load-news');
                this.displayNews(newsText);
            }
        } catch (error) {
            console.log('Error refreshing news:', error);
            this.displayNews('Ошибка загрузки новостей...\n\nПроверьте подключение к интернету или попробуйте позже.');
        } finally {
            setTimeout(() => {
                newsBtn.textContent = originalText;
                newsBtn.disabled = false;
            }, 1000);
        }
  }

  displayNews(newsText) {
        const newsContent = document.getElementById('news-content');
        if (newsContent && typeof newsText === 'string') {
            // Простой формат для fallback
            const formattedNews = newsText.split('\n').map(line => {
                if (line.trim() === '') return '<br>';
                if (line.startsWith('- ')) {
                    return `<li>${line.substring(2)}</li>`;
                }
                return `<p>${line}</p>`;
            }).join('');
            
            newsContent.innerHTML = `
                <div class="news-item">
                    ${formattedNews.includes('<li>') ? `<ul>${formattedNews}</ul>` : formattedNews}
                </div>
            `;
        }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MagmaRenderer();
});

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

const titleBar = document.getElementById('title-bar');
if (titleBar) {
  titleBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  new MagmaRenderer();
});

document.getElementById('account-btn').addEventListener('click', () => {
    ipcRenderer.send('open-url', 'https://t.me/Mgl_User_Bot');
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const { screenX, screenY } = e;
    require('electron').remote.getCurrentWindow().setPosition(
      screenX - dragOffset.x,
      screenY - dragOffset.y
    );
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});