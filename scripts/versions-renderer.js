const { ipcRenderer } = require('electron');

class VersionsRenderer {
    constructor() {
        this.versions = [];
        this.filteredVersions = [];
        this.selectedVersion = '';
        this.init();
    }

    async init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Versions loaded
        ipcRenderer.on('versions-loaded', (event, versions) => {
            this.versions = versions;
            this.filteredVersions = versions;
            this.populateVersionsList();
        });

        // Search functionality
        document.getElementById('version-search').addEventListener('input', (e) => {
            this.filterVersions(e.target.value);
        });

        // Version selection
        document.getElementById('select-version').addEventListener('click', () => {
            if (this.selectedVersion) {
              // Закрываем окно версий и открываем модлоадер
              ipcRenderer.send('close-versions');
              ipcRenderer.send('open-modloader', this.selectedVersion);
            }
        });

        // Cancel
        document.getElementById('cancel-versions').addEventListener('click', () => {
            ipcRenderer.send('close-versions');
        });
    }

    filterVersions(searchText) {
        if (!searchText) {
            this.filteredVersions = this.versions;
        } else {
            this.filteredVersions = this.versions.filter(version => 
                version.toLowerCase().includes(searchText.toLowerCase())
            );
        }
        this.populateVersionsList();
    }

    populateVersionsList() {
        const versionsList = document.getElementById('versions-list');
        versionsList.innerHTML = '';

        if (this.filteredVersions.length === 0) {
            versionsList.innerHTML = '<div class="version-item" style="text-align: center; color: #b5b4b3;">Версии не найдены</div>';
            return;
        }

        this.filteredVersions.forEach(version => {
            const versionItem = document.createElement('div');
            versionItem.className = 'version-item';
            
            // Определяем тип версии
            const versionType = this.getVersionType(version);
            const typeClass = this.getVersionTypeClass(versionType);
            
            versionItem.innerHTML = `
                <div>
                    <span class="version-number">${version}</span>
                    <span class="version-type ${typeClass}">${versionType}</span>
                </div>
            `;
            
            versionItem.addEventListener('click', () => {
                this.selectVersion(versionItem, version);
            });
            
            versionsList.appendChild(versionItem);
        });
    }

    getVersionType(version) {
        const [major, minor] = version.split('.').map(Number);
        
        // Классификация версий
        if (major === 1) {
            if (minor >= 17) return 'Современная';
            if (minor >= 9) return 'Стабильная';
            if (minor >= 0) return 'Классическая';
        }
        
        return 'Релиз';
    }

    getVersionTypeClass(type) {
        const classes = {
            'Современная': 'modern',
            'Стабильная': 'stable', 
            'Классическая': 'classic',
            'Релиз': 'release'
        };
        return classes[type] || 'release';
    }

    selectVersion(element, version) {
        // Remove selection from all items
        document.querySelectorAll('.version-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        element.classList.add('selected');
        this.selectedVersion = version;
        
        // Enable select button
        document.getElementById('select-version').disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VersionsRenderer();
});