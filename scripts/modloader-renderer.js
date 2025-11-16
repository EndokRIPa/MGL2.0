const { ipcRenderer } = require('electron');

class ModloaderRenderer {
    constructor() {
        this.currentVersion = '';
        this.availableModloaders = [];
        this.selectedModloader = '';
        this.init();
    }

    async init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Modloaders data received
        ipcRenderer.on('modloaders-data', (event, { version, availableModloaders }) => {
            this.currentVersion = version;
            this.availableModloaders = availableModloaders;
            this.populateModloaderGrid();
            this.updateVersionInfo();
        });

        // Modloader selection
        document.getElementById('select-modloader').addEventListener('click', () => {
            if (this.selectedModloader) {
                ipcRenderer.send('modloader-selected', {
                    version: this.currentVersion,
                    modloader: this.selectedModloader
                });
            }
        });

        // Cancel/Back
        document.getElementById('cancel-modloader').addEventListener('click', () => {
            ipcRenderer.send('close-modloader');
        });
    }

    updateVersionInfo() {
        document.getElementById('current-version').textContent = this.currentVersion;
    }

    populateModloaderGrid() {
        const grid = document.getElementById('modloader-grid');
        grid.innerHTML = '';

        const modloaders = [
            {
                id: 'vanilla',
                name: 'Vanilla',
                desc: 'Официальная версия без модов',
                alwaysAvailable: true
            },
            {
                id: 'fabric',
                name: 'Fabric',
                desc: 'Современный легковесный модлоадер',
                minVersion: '1.14'
            },
            {
                id: 'forge',
                name: 'Forge',
                desc: 'Классический модлоадер с большим количеством модов', 
                minVersion: '1.0'
            },
            {
                id: 'neoforge',
                name: 'NeoForge',
                desc: 'Форк Forge с современными улучшениями',
                minVersion: '1.20.1'
            }
        ];

        modloaders.forEach(modloader => {
            const isAvailable = this.isModloaderAvailable(modloader);
            const option = document.createElement('div');
            option.className = `modloader-option ${isAvailable ? '' : 'disabled'}`;
            
            let warning = '';
            if (!isAvailable && modloader.minVersion) {
                warning = `<div class="modloader-warning">Доступно с ${modloader.minVersion}+</div>`;
            }

            option.innerHTML = `
                <div class="modloader-name">${modloader.name}</div>
                <div class="modloader-desc">${modloader.desc}</div>
                ${warning}
            `;

            if (isAvailable) {
                option.addEventListener('click', () => {
                    this.selectModloader(option, modloader.id);
                });
            }

            grid.appendChild(option);
        });
    }

    isModloaderAvailable(modloader) {
        if (modloader.alwaysAvailable) return true;
        return this.availableModloaders.includes(modloader.id);
    }

    selectModloader(element, modloaderId) {
        // Remove selection from all options
        document.querySelectorAll('.modloader-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selection to clicked option
        element.classList.add('selected');
        this.selectedModloader = modloaderId;
        
        // Enable select button
        document.getElementById('select-modloader').disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ModloaderRenderer();
});