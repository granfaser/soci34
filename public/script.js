// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // Particles.js Configuration
    if (document.getElementById('particles-js')) {
        particlesJS("particles-js", { /* ... ваша полная конфигурация particles.js ... */
            "particles": { "number": {"value": 80, "density": {"enable": true, "value_area": 800}}, "color": {"value": "#E91E63"}, "shape": {"type": "circle", "stroke": {"width": 0, "color": "#000000"}, "polygon": {"nb_sides": 5}}, "opacity": {"value": 0.4, "random": false, "anim": {"enable": false, "speed": 1, "opacity_min": 0.1, "sync": false}}, "size": {"value": 3, "random": true, "anim": {"enable": false, "speed": 40, "size_min": 0.1, "sync": false}}, "line_linked": {"enable": true, "distance": 150, "color": "#00bcd4", "opacity": 0.3, "width": 1}, "move": {"enable": true, "speed": 3, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false, "attract": {"enable": false, "rotateX": 600, "rotateY": 1200}}},
            "interactivity": {"detect_on": "canvas", "events": {"onhover": {"enable": true, "mode": "grab"}, "onclick": {"enable": true, "mode": "push"}, "resize": true}, "modes": {"grab": {"distance": 140, "line_linked": {"opacity": 0.7}}, "bubble": {"distance": 400, "size": 40, "duration": 2, "opacity": 8, "speed": 3}, "repulse": {"distance": 200, "duration": 0.4}, "push": {"particles_nb": 4}, "remove": {"particles_nb": 2}}},
            "retina_detect": true
        });
    }

    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('header nav a[href^="#"], header nav a[href^="index.html#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#') || href.startsWith('index.html#')) {
                e.preventDefault();
                const targetId = href.includes('#') ? href.substring(href.lastIndexOf('#')) : '#';
                
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                    // Если мы уже на главной странице
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        const headerOffset = document.querySelector('header')?.offsetHeight || 0;
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                } else {
                    // Если мы на другой странице, переходим на главную с якорем
                    window.location.href = `index.html${targetId}`;
                }
            }
        });
    });

    // Animate sections on scroll
    const sections = document.querySelectorAll('.content-section');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, observerOptions);
    sections.forEach(section => sectionObserver.observe(section));

    // Admin Modal Logic
    const adminModal = document.getElementById('adminLoginModal');
    const adminLoginForm = document.getElementById('adminLoginForm');

    window.showAdminLogin = () => { // Эта функция будет глобальной
        if (adminModal) adminModal.style.display = 'block';
    }
    window.closeAdminLogin = () => { // И эта
        if (adminModal) adminModal.style.display = 'none';
    }
    
    // Закрытие по клику вне окна (только для модалки на index.html)
    if(adminModal) { // Проверяем, что мы на странице с этой модалкой
        window.addEventListener('click', (event) => {
            if (event.target == adminModal) {
                 adminModal.style.display = "none";
            }
        });
    }


    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.adminUser.value;
            const password = e.target.adminPass.value;

            try {
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const result = await response.json();

                if (response.ok && result.token) {
                    localStorage.setItem('adminToken', result.token);
                    alert('Вход успешен! Перенаправление в админ-панель...');
                    closeAdminLogin();
                    window.location.href = 'admin.html'; 
                } else {
                    alert(`Ошибка входа: ${result.message || 'Неверный логин или пароль!'}`);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Произошла ошибка при попытке входа.');
            }
        });
    }

    // Subscribe form (placeholder)
    const subscribeForm = document.getElementById('subscribe-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input[type="email"]').value;
            if (email) {
                alert(`Спасибо за подписку, ${email}! (Это заглушка)`);
                subscribeForm.reset();
            }
        });
    }

    // Load News for index.html
    async function loadPublicNews() {
        const newsGrid = document.querySelector('#news .news-grid');
        if (!newsGrid) return;

        newsGrid.innerHTML = '<p style="text-align:center; width:100%;">Загрузка новостей...</p>'; // Сообщение о загрузке

        try {
            const response = await fetch('/api/news');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const newsItems = await response.json();
            newsGrid.innerHTML = ''; 

            if (newsItems.length === 0) {
                newsGrid.innerHTML = '<p style="text-align:center; width:100%;">Пока нет новостей.</p>';
                return;
            }
            
            // Сортировка новостей по дате (сначала новые)
            newsItems.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

            newsItems.forEach(item => {
                const newsArticle = document.createElement('article');
                newsArticle.classList.add('news-item');
                const shortContent = item.content.length > 150 ? item.content.substring(0, 147) + '...' : item.content;

                newsArticle.innerHTML = `
                    <a href="news-detail.html?id=${item.id}" class="news-item-link">
                        <img src="${item.imageUrl || 'https://via.placeholder.com/400x250/2c3e50/ecf0f1?text=Новость'}" alt="${item.title}">
                    </a>
                    <div class="news-content">
                        <h3><a href="news-detail.html?id=${item.id}">${item.title}</a></h3>
                        <p class="news-meta">Опубликовано: <time datetime="${new Date(item.publishedDate).toISOString()}">${new Date(item.publishedDate).toLocaleDateString('ru-RU')}</time> | Автор: ${item.author || 'Редакция'}</p>
                        <p>${shortContent}</p>
                        <a href="news-detail.html?id=${item.id}" class="read-more">Читать далее</a>
                    </div>
                `;
                newsGrid.appendChild(newsArticle);
            });
        } catch (error) {
            console.error('Failed to load news:', error);
            newsGrid.innerHTML = '<p style="text-align:center; width:100%;">Не удалось загрузить новости. Пожалуйста, попробуйте позже.</p>';
        }
    }

    if (document.querySelector('#news .news-grid')) {
        loadPublicNews();
    }

    // Set current year in footer
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});