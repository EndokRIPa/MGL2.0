const { ipcRenderer } = require('electron');

class ColorPickerRenderer {
    constructor() {
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupColorPickers();
        this.setupEventListeners();
    }

    async loadSettings() {
        this.settings = await ipcRenderer.invoke('get-settings');
    }

    setupColorPickers() {
        // Background colors
        const bgColors = [
            '#010756', '#4B0082', '#006400', '#8B0000', '#FF8C00', '#FF1493',
            '#2F4F4F', '#000080', '#8B4513', '#2E8B57'
        ];
        
        this.setupColorPicker('background-colors', bgColors, 'background-color');

        // Block colors
        const blockColors = [
            'rgba(20, 20, 30, 0.9)', 'rgba(40, 40, 60, 0.9)', 'rgba(10, 10, 20, 0.9)', 
            'rgba(0, 30, 60, 0.9)', 'rgba(30, 20, 40, 0.9)', 'rgba(20, 40, 20, 0.9)'
        ];
        
        this.setupColorPicker('block-colors', blockColors, 'block-color');

        // Text colors
        const textColors = [
            '#FFFFFF', '#F0F0F0', '#E0E0E0', '#C0C0C0', '#A0A0A0', '#FFD700'
        ];
        
        this.setupColorPicker('text-colors', textColors, 'text-color');

        // Accent colors
        const accentColors = [
            '#00FFFF', '#0078D7', '#107C10', '#D13438', '#881798', '#FFB900'
        ];
        
        this.setupColorPicker('accent-colors', accentColors, 'accent-color');
    }

    setupColorPicker(containerId, colors, settingKey) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = color;
            colorOption.dataset.color = color;
            colorOption.dataset.setting = settingKey;

            // Check if this color is currently selected
            const currentColor = this.getCurrentColor(settingKey);
            if (this.colorsAreEqual(color, currentColor)) {
                colorOption.classList.add('selected');
            }

            colorOption.addEventListener('click', () => {
                this.selectColor(settingKey, color);
                this.updateSelectedColor(containerId, colorOption);
            });

            container.appendChild(colorOption);
        });
    }

    getCurrentColor(settingKey) {
        switch (settingKey) {
            case 'background-color': return this.settings.backgroundAnimation ? '#010756' : '#010756'; // Simplified
            case 'block-color': return this.settings.blockColor || 'rgba(20, 20, 30, 0.9)';
            case 'text-color': return this.settings.textColor || 'white';
            case 'accent-color': return this.settings.accentColor || '#00ffff';
            default: return '';
        }
    }

    colorsAreEqual(color1, color2) {
        // Simple color comparison (could be improved for rgba)
        return color1.replace(/\s/g, '') === color2.replace(/\s/g, '');
    }

    updateSelectedColor(containerId, selectedElement) {
        const container = document.getElementById(containerId);
        const allOptions = container.querySelectorAll('.color-option');
        allOptions.forEach(option => option.classList.remove('selected'));
        selectedElement.classList.add('selected');
    }

    selectColor(settingKey, color) {
        switch (settingKey) {
            case 'background-color':
                // Background color is handled differently
                break;
            case 'block-color':
                this.settings.blockColor = color;
                break;
            case 'text-color':
                this.settings.textColor = color;
                break;
            case 'accent-color':
                this.settings.accentColor = color;
                break;
        }
    }

    setupEventListeners() {
        // Custom color inputs
        document.getElementById('apply-bg-custom').addEventListener('click', () => {
            const color = document.getElementById('custom-bg-color').value;
            // Handle custom background color
        });

        document.getElementById('apply-block-custom').addEventListener('click', () => {
            const color = document.getElementById('custom-block-color').value;
            this.settings.blockColor = color;
        });

        document.getElementById('apply-text-custom').addEventListener('click', () => {
            const color = document.getElementById('custom-text-color').value;
            this.settings.textColor = color;
        });

        document.getElementById('apply-accent-custom').addEventListener('click', () => {
            const color = document.getElementById('custom-accent-color').value;
            this.settings.accentColor = color;
        });

        // Reset and save buttons
        document.getElementById('reset-colors').addEventListener('click', () => {
            this.resetColors();
        });

        document.getElementById('save-colors').addEventListener('click', () => {
            this.saveColors();
        });
    }

    resetColors() {
        this.settings.blockColor = 'rgba(20, 20, 30, 0.9)';
        this.settings.textColor = 'white';
        this.settings.accentColor = '#00ffff';
        this.settings.secondaryTextColor = '#b5b4b3';
        this.settings.launchButtonColor = '#0078D7';
        
        this.setupColorPickers();
    }

    saveColors() {
        ipcRenderer.send('save-settings', this.settings);
        window.close();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ColorPickerRenderer();
});