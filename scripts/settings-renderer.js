const { ipcRenderer } = require('electron');

class SettingsRenderer {
    constructor() {
        this.settings = {};
        this.ramInfo = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupRamSlider();
        this.updateUserIdDisplay();
    }

    async loadSettings() {
        this.settings = await ipcRenderer.invoke('get-settings');
        this.populateSettings();
    }

    populateSettings() {
        document.getElementById('java-path').value = this.settings.javaPath || '';
        document.getElementById('console-enabled').checked = this.settings.consoleEnabled || false;
        document.getElementById('background-animation').checked = this.settings.backgroundAnimation !== false;
    }

    updateUserIdDisplay() {
        document.getElementById('user-id-value').textContent = this.settings.userId || 'user 0000_0000_0000_0000';
    }

    setupRamSlider() {
        ipcRenderer.invoke('get-system-ram').then(ramInfo => {
            this.ramInfo = ramInfo;
            
            const slider = document.getElementById('ram-slider');
            const valueDisplay = document.getElementById('ram-value');
            
            slider.min = ramInfo.min;
            slider.max = ramInfo.max;
            slider.value = this.settings.memoryMax || ramInfo.min;
            
            valueDisplay.textContent = slider.value + ' MB';
            
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value + ' MB';
            });
        });
    }

    setupEventListeners() {
        // Java path browser
        document.getElementById('browse-java').addEventListener('click', () => {
            ipcRenderer.send('browse-java');
        });

        // Java path selected
        ipcRenderer.on('java-path-selected', (event, path) => {
            document.getElementById('java-path').value = path;
        });

        // Copy user ID
        document.getElementById('copy-user-id').addEventListener('click', () => {
            this.copyUserId();
        });

        // Regenerate user ID
        document.getElementById('regenerate-user-id').addEventListener('click', () => {
            this.regenerateUserId();
        });

        // Reset settings
        document.getElementById('reset-settings').addEventListener('click', () => {
            this.resetSettings();
        });

        // Save settings
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Cancel
        document.getElementById('cancel-settings').addEventListener('click', () => {
            ipcRenderer.send('close-settings');
        });
    }

    copyUserId() {
        const userId = this.settings.userId;
        navigator.clipboard.writeText(userId).then(() => {
            this.showNotification('ID скопирован в буфер обмена!');
        }).catch(err => {
            console.error('Failed to copy user ID:', err);
            this.showNotification('Ошибка копирования ID');
        });
    }

    async regenerateUserId() {
        if (confirm('Вы уверены, что хотите сгенерировать новый ID пользователя?\nСтарый ID будет утерян.')) {
            try {
                const newUserId = await ipcRenderer.invoke('regenerate-user-id');
                this.settings.userId = newUserId;
                this.updateUserIdDisplay();
                this.showNotification('Новый ID сгенерирован!');
            } catch (error) {
                console.error('Failed to regenerate user ID:', error);
                this.showNotification('Ошибка генерации нового ID');
            }
        }
    }

    resetSettings() {
        if (confirm('Вы уверены, что хотите сбросить все настройки?\nЭто действие нельзя отменить.')) {
            ipcRenderer.invoke('reset-settings').then(() => {
                this.showNotification('Настройки сброшены!');
                // Reload settings
                setTimeout(() => {
                    this.loadSettings();
                    this.updateUserIdDisplay();
                }, 1000);
            });
        }
    }

    saveSettings() {
        this.settings.javaPath = document.getElementById('java-path').value;
        this.settings.memoryMax = parseInt(document.getElementById('ram-slider').value);
        this.settings.consoleEnabled = document.getElementById('console-enabled').checked;
        this.settings.backgroundAnimation = document.getElementById('background-animation').checked;
        
        ipcRenderer.send('save-settings', this.settings);
        this.showNotification('Настройки сохранены!');
        
        setTimeout(() => {
            ipcRenderer.send('close-settings');
        }, 1000);
    }

    showNotification(message) {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(30, 30, 50, 0.95);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            border: 1px solid #00ffff;
            z-index: 1000;
            font-size: 14px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Автоматически скрываем через 2 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SettingsRenderer();
});