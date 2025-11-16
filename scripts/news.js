const { ipcRenderer } = require('electron');

class NewsManager {
    constructor() {
        this.newsUrl = 'https://raw.githubusercontent.com/EndokRIPa/MGL2.0/main/news.txt';
        this.init();
    }

    async init() {
        await this.loadNews();
    }

    async loadNews() {
        try {
            const timestamp = new Date().getTime();
            const url = `${this.newsUrl}?t=${timestamp}`;
            
            console.log('Loading news from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const newsText = await response.text();
            console.log('News loaded successfully, length:', newsText.length);
            
            this.displayNews(newsText);
            
        } catch (error) {
            console.error('Error loading news from GitHub:', error);
            this.displayFallbackNews(error.message);
        }
    }

    displayNews(newsText) {
        const newsContainer = document.getElementById('news-content');
        if (!newsContainer) {
            console.error('News container not found');
            return;
        }

        try {
            // Проверяем, не пустой ли текст
            if (!newsText || newsText.trim() === '') {
                newsContainer.innerHTML = '<div class="news-item"><p>Новости отсутствуют</p></div>';
                return;
            }

            // Форматируем текст новостей
            const formattedNews = this.formatNewsText(newsText);
            newsContainer.innerHTML = formattedNews;
            
            // Добавляем время обновления
            const updateTime = document.createElement('div');
            updateTime.style.cssText = 'text-align: right; font-size: 10px; color: #666; margin-top: 10px;';
            updateTime.textContent = `Обновлено: ${new Date().toLocaleTimeString()}`;
            newsContainer.appendChild(updateTime);
            
        } catch (formatError) {
            console.error('Error formatting news:', formatError);
            this.displayFallbackNews('Ошибка форматирования новостей');
        }
    }

    formatNewsText(text) {
        // Очищаем текст от лишних пробелов
        const cleanText = text.trim();
        
        // Разбиваем текст на строки и форматируем
        const lines = cleanText.split('\n');
        let formattedHTML = '<div class="news-item">';
        
        let inList = false;
        let listType = ''; // 'ul' или 'ol'
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // Пропускаем полностью пустые строки в начале
            if (line === '' && i === 0) continue;
            
            if (line === '') {
                // Пустая строка - закрываем список если он был открыт
                if (inList) {
                    formattedHTML += `</${listType}>`;
                    inList = false;
                    listType = '';
                }
                formattedHTML += '<br>';
                continue;
            }
            
            // Проверяем маркированный список
            if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
                if (!inList || listType !== 'ul') {
                    if (inList) {
                        formattedHTML += `</${listType}>`;
                    }
                    formattedHTML += '<ul>';
                    inList = true;
                    listType = 'ul';
                }
                const listItem = line.substring(2).trim();
                formattedHTML += `<li>${this.escapeHTML(listItem)}</li>`;
                continue;
            }
            
            // Проверяем нумерованный список
            if (/^\d+\.\s/.test(line)) {
                if (!inList || listType !== 'ol') {
                    if (inList) {
                        formattedHTML += `</${listType}>`;
                    }
                    formattedHTML += '<ol>';
                    inList = true;
                    listType = 'ol';
                }
                const listItem = line.replace(/^\d+\.\s/, '').trim();
                formattedHTML += `<li>${this.escapeHTML(listItem)}</li>`;
                continue;
            }
            
            // Закрываем список если он был открыт
            if (inList) {
                formattedHTML += `</${listType}>`;
                inList = false;
                listType = '';
            }
            
            // Заголовки
            if (line.startsWith('# ')) {
                formattedHTML += `<h3>${this.escapeHTML(line.substring(2))}</h3>`;
            } else if (line.startsWith('## ')) {
                formattedHTML += `<h4>${this.escapeHTML(line.substring(3))}</h4>`;
            } else if (line.startsWith('### ')) {
                formattedHTML += `<h5>${this.escapeHTML(line.substring(4))}</h5>`;
            } else {
                // Обычный параграф
                formattedHTML += `<p>${this.escapeHTML(line)}</p>`;
            }
        }
        
        // Закрываем список если он остался открытым
        if (inList) {
            formattedHTML += `</${listType}>`;
        }
        
        formattedHTML += '</div>';
        return formattedHTML;
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    displayFallbackNews(errorMessage = '') {
        const newsContainer = document.getElementById('news-content');
        if (!newsContainer) return;

        const errorDetails = errorMessage ? `<br><small>Ошибка: ${errorMessage}</small>` : '';
        
        newsContainer.innerHTML = `
            <div class="news-item">
                <h3>⚠️ Ошибка загрузки новостей</h3>
                <p>Не удалось загрузить последние новости с GitHub.</p>
                <p>Проверьте:</p>
                <ul>
                    <li>Подключение к интернету</li>
                    <li>Доступность репозитория</li>
                    <li>Формат файла news.txt</li>
                </ul>
                ${errorDetails}
                <br>
                <p><strong>Техническая информация:</strong></p>
                <ul>
                    <li>URL: ${this.newsUrl}</li>
                    <li>Время: ${new Date().toLocaleString()}</li>
                </ul>
            </div>
        `;
    }

    // Метод для принудительного обновления новостей
    async refreshNews() {
        console.log('Forcing news refresh...');
        await this.loadNews();
    }
}

// Initialize news manager
document.addEventListener('DOMContentLoaded', () => {
    window.newsManager = new NewsManager();
});

// Экспортируем для использования в renderer.js
module.exports = NewsManager;