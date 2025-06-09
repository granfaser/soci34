document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert('Доступ запрещен. Пожалуйста, войдите.');
        window.location.href = 'index.html'; // Redirect to main page to login
        return;
    }

    const newsFormContainer = document.getElementById('news-form-container');
    const manageNewsForm = document.getElementById('manage-news-form');
    const addNewsBtn = document.getElementById('add-news-btn');
    const adminNewsList = document.getElementById('admin-news-list');
    const formTitle = document.getElementById('form-title');
    const newsIdInput = document.getElementById('news-id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminMessage = document.getElementById('admin-message');

    // Optional: Particles on admin page
    // if (document.getElementById('particles-js-admin')) {
    //     particlesJS("particles-js-admin", { /* ... your particles.js config ... */ });
    // }
    
    const currentYearSpanAdmin = document.getElementById('currentYearAdmin');
    if (currentYearSpanAdmin) {
        currentYearSpanAdmin.textContent = new Date().getFullYear();
    }

    function showMessage(message, type = 'success') {
        adminMessage.textContent = message;
        adminMessage.className = type; // 'success' or 'error'
        adminMessage.style.display = 'block';
        setTimeout(() => {
            adminMessage.style.display = 'none';
        }, 3000);
    }

    async function fetchNews() {
        try {
            const response = await fetch('/api/news', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) { // Unauthorized or Forbidden
                localStorage.removeItem('adminToken');
                alert('Сессия истекла или недействительна. Пожалуйста, войдите снова.');
                window.location.href = 'index.html';
                return;
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const newsItems = await response.json();
            renderNews(newsItems);
        } catch (error) {
            console.error('Failed to load news:', error);
            adminNewsList.innerHTML = '<p>Не удалось загрузить новости.</p>';
            showMessage(`Ошибка загрузки новостей: ${error.message}`, 'error');
        }
    }

    function renderNews(newsItems) {
        adminNewsList.innerHTML = '';
        if (newsItems.length === 0) {
            adminNewsList.innerHTML = '<p>Новостей пока нет. Добавьте первую!</p>';
            return;
        }
        newsItems.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate)); // Sort by newest first

        newsItems.forEach(item => {
            const newsArticle = document.createElement('article');
            newsArticle.classList.add('news-item'); // Reuse news-item style
            newsArticle.dataset.id = item.id;

            const shortContent = item.content.length > 100 ? item.content.substring(0, 97) + '...' : item.content;

            newsArticle.innerHTML = `
                <img src="${item.imageUrl || 'https://via.placeholder.com/400x250/2c3e50/ecf0f1?text=Новость'}" alt="${item.title}">
                <div class="news-content">
                    <h3>${item.title}</h3>
                    <p class="news-meta">ID: ${item.id} | Опубликовано: ${new Date(item.publishedDate).toLocaleDateString('ru-RU')} | Автор: ${item.author || 'Редакция'}</p>
                    <p>${shortContent}</p>
                </div>
                <div class="admin-controls">
                    <button class="cta-button edit-btn">Редактировать</button>
                    <button class="cta-button delete-btn">Удалить</button>
                </div>
            `;
            
            newsArticle.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(item));
            newsArticle.querySelector('.delete-btn').addEventListener('click', () => deleteNewsItem(item.id, item.title));
            
            adminNewsList.appendChild(newsArticle);
        });
    }

    addNewsBtn.addEventListener('click', () => {
        formTitle.textContent = 'Добавить Новость';
        manageNewsForm.reset();
        newsIdInput.value = '';
        newsFormContainer.style.display = 'block';
        cancelEditBtn.style.display = 'none';
        addNewsBtn.style.display = 'none'; // Hide "Add News" button when form is open
    });

    cancelEditBtn.addEventListener('click', () => {
        newsFormContainer.style.display = 'none';
        manageNewsForm.reset();
        addNewsBtn.style.display = 'inline-block'; // Show "Add News" button
    });

    function populateFormForEdit(item) {
        formTitle.textContent = 'Редактировать Новость';
        newsIdInput.value = item.id;
        document.getElementById('news-title').value = item.title;
        document.getElementById('news-content').value = item.content;
        document.getElementById('news-image-url').value = item.imageUrl || '';
        document.getElementById('news-author').value = item.author || '';
        newsFormContainer.style.display = 'block';
        cancelEditBtn.style.display = 'inline-block';
        addNewsBtn.style.display = 'none'; // Hide "Add News" button
        window.scrollTo({ top: newsFormContainer.offsetTop - 100, behavior: 'smooth' });
    }

    manageNewsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = newsIdInput.value;
        const newsData = {
            title: document.getElementById('news-title').value,
            content: document.getElementById('news-content').value,
            imageUrl: document.getElementById('news-image-url').value,
            author: document.getElementById('news-author').value,
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/news/${id}` : '/api/news';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newsData)
            });

            if (response.status === 401 || response.status === 403) {
                 localStorage.removeItem('adminToken');
                alert('Сессия истекла или недействительна. Пожалуйста, войдите снова.');
                window.location.href = 'index.html';
                return;
            }
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            showMessage(result.message || (id ? 'Новость успешно обновлена!' : 'Новость успешно добавлена!'));
            
            manageNewsForm.reset();
            newsFormContainer.style.display = 'none';
            addNewsBtn.style.display = 'inline-block'; // Show "Add News" button
            fetchNews(); // Refresh the list
        } catch (error) {
            console.error('Failed to save news:', error);
            showMessage(`Ошибка сохранения новости: ${error.message}`, 'error');
        }
    });

    async function deleteNewsItem(id, title) {
        if (!confirm(`Вы уверены, что хотите удалить новость "${title}"?`)) return;

        try {
            const response = await fetch(`/api/news/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminToken');
                alert('Сессия истекла или недействительна. Пожалуйста, войдите снова.');
                window.location.href = 'index.html';
                return;
            }
            if (!response.ok) {
                 const errorResult = await response.json();
                throw new Error(errorResult.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            showMessage(result.message || 'Новость успешно удалена!');
            fetchNews(); // Refresh the list
        } catch (error) {
            console.error('Failed to delete news:', error);
            showMessage(`Ошибка удаления новости: ${error.message}`, 'error');
        }
    }
    
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        alert('Вы вышли из системы.');
        window.location.href = 'index.html';
    });

    // Initial load
    fetchNews();
});