document.addEventListener('DOMContentLoaded', () => {
    AOS.init({
        duration: 800,
        once: true
    })
    fetch('/log-visit', { method: 'POST' }) // Отправляем POST запрос на наш бэкенд по новому адресу
        .then(response => {
            if (!response.ok) {
                console.error('Сервер не смог залогировать визит. Статус:', response.status);
            } else {
                // Эта строка появится в консоли браузера, подтверждая отправку
                console.log('Сервер уведомлен о визите для логирования.');
            }
        })
        .catch(error => {
            console.error('Ошибка при отправке сигнала логирования на сервер:', error);
        });


    const introModal = document.getElementById('intro-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const startGameBtn = document.getElementById('start-game-btn');

    const gameSection = document.getElementById('game-section');
    const envelopeSection = document.getElementById('envelope-section');
    const letterSection = document.getElementById('letter-section');
    const reasonsSection = document.getElementById('reasons-section');

    const gameElements = document.getElementById('game-elements');
    const gameArea = document.getElementById('game-area');
    const catcher = document.getElementById('catcher');
    const scoreDisplay = document.getElementById('score');
    const gameMessage = document.getElementById('game-message');

    const envelope = document.getElementById('envelope');
    const showReasonsBtn = document.getElementById('show-reasons-btn');

    const GOAL_SCORE = 15;
    let currentScore = 0;
    let gameInterval;
    let hearts = [];
    let animationFrameId;
    const heartSpeed = 2.5;
    const heartCreationInterval = 900;
    let gameActive = false;

    function createHeart() {
        if (!gameActive || !gameArea) return;
        const heart = document.createElement('div');
        heart.classList.add('falling-heart');
        const gameAreaWidth = gameArea.offsetWidth;
        if (gameAreaWidth > 0) {
            heart.style.left = Math.random() * (gameAreaWidth - 25) + 'px';
        } else {
            heart.style.left = '50%';
        }
        heart.style.top = '-30px';
        gameArea.appendChild(heart);
        hearts.push(heart);
    }

    function moveHearts() {
        if (!gameActive) return;
        hearts.forEach((heart, index) => {
            if (!heart) { hearts.splice(index, 1); return; }
            let topPosition = heart.offsetTop;
            heart.style.top = topPosition + heartSpeed + 'px';
            if (isColliding(heart, catcher)) {
                heart.remove();
                hearts.splice(index, 1);
                currentScore++;
                if (scoreDisplay) scoreDisplay.textContent = currentScore;
                if (currentScore >= GOAL_SCORE) {
                    launchConfetti();
                    endGame(true);
                }
            } else if (gameArea && topPosition > gameArea.offsetHeight) {
                heart.remove();
                hearts.splice(index, 1);
            }
        });
        if (gameActive) {
            animationFrameId = requestAnimationFrame(moveHearts);
        }
    }

    function isColliding(element1, element2) {
        if (!element1 || !element2) return false;
        const rect1 = element1.getBoundingClientRect();
        const rect2 = element2.getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }

    function moveCatcher(event) {
        if (!gameActive || !gameArea || !catcher) return;
        const gameAreaRect = gameArea.getBoundingClientRect();
        let xPosition;
        if (event.type === 'mousemove') { xPosition = event.clientX - gameAreaRect.left; }
        else if (event.type === 'touchmove' && event.touches.length > 0) { xPosition = event.touches[0].clientX - gameAreaRect.left; }
        else { return; }
        const catcherWidth = catcher.offsetWidth;
        const minX = 0;
        const maxX = (gameAreaRect.width > catcherWidth) ? (gameAreaRect.width - catcherWidth) : 0;
        let newLeft = xPosition - catcherWidth / 2;
        newLeft = Math.max(minX, Math.min(newLeft, maxX));
        catcher.style.left = newLeft + 'px';
    }

    function startGame() {
        if (gameActive) return;
        if (!gameSection || !gameArea || !startGameBtn) {
            console.error("Ошибка: Не найдены необходимые элементы для старта игры.");
            return;
        }
        console.log("Starting game from modal...");
        showSection(gameSection);
        const goalDisplayElem = document.querySelector('#game-elements h2 .highlight');
        if(goalDisplayElem) goalDisplayElem.textContent = GOAL_SCORE;
        currentScore = 0;
        if (scoreDisplay) scoreDisplay.textContent = currentScore;
        if (gameMessage) gameMessage.textContent = '';
        hearts.forEach(heart => heart.remove());
        hearts = [];
        gameActive = true;
        gameInterval = setInterval(createHeart, heartCreationInterval);
        animationFrameId = requestAnimationFrame(moveHearts);
        gameArea.addEventListener('mousemove', moveCatcher);
        gameArea.addEventListener('touchmove', moveCatcher, { passive: true });
        startGameBtn.disabled = true;
    }

    function endGame(isWin) {
        if (!gameActive) return;
        console.log("Ending game. Win:", isWin);
        gameActive = false;
        clearInterval(gameInterval);
        cancelAnimationFrame(animationFrameId);
        if(gameArea) {
            gameArea.removeEventListener('mousemove', moveCatcher);
            gameArea.removeEventListener('touchmove', moveCatcher);
        }
        if (isWin) {
            if(gameMessage) gameMessage.textContent = 'Победа!';
            setTimeout(() => {
                showSection(envelopeSection);
                hideSection(gameSection);
                if (typeof AOS !== 'undefined') AOS.refresh();
            }, 1500);
        }
    }

    function launchConfetti() {
        if (typeof confetti !== 'function') {
            console.warn('Confetti library not loaded');
            return;
        }
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ffcad4', '#f4acb7', '#d88c9a', '#ffffff'],
        });
        setTimeout(() => confetti({ particleCount: 50, spread: 60, origin: { x: 0.2, y: 0.7 }, colors: ['#ffcad4', '#f4acb7', '#ffffff'] }), 200);
        setTimeout(() => confetti({ particleCount: 50, spread: 60, origin: { x: 0.8, y: 0.7 }, colors: ['#ffcad4', '#f4acb7', '#ffffff'] }), 400);
    }

    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (introModal) introModal.classList.add('hidden');
            if (modalBackdrop) modalBackdrop.classList.add('hidden');
            setTimeout(() => {
                startGame();
            }, 400);
        });
    } else {
        console.error("Кнопка старта игры не найдена!");
    }

    if(envelope) {
        envelope.addEventListener('click', () => {
            showSection(letterSection);
            hideSection(envelopeSection);
            setTimeout(() => {
                if(showReasonsBtn) showReasonsBtn.classList.remove('hidden');
                if (typeof AOS !== 'undefined') AOS.refreshHard();
            }, 500);
            if (typeof AOS !== 'undefined') AOS.refresh();
        });
    } else {
        console.error("Элемент конверта не найден!");
    }

    function showSection(section) {
        if(section) section.classList.remove('hidden');
    }
    function hideSection(section) {
        if(section) section.classList.add('hidden');
    }

    function createBackgroundHearts() {
        const background = document.getElementById('hearts-background');
        if (!background) {
            console.error("Элемент фона для сердец не найден!");
            return;
        }
        const heartsCount = 15;
        for (let i = 0; i < heartsCount; i++) {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            heart.style.left = Math.random() * 100 + 'vw';
            const baseSize = Math.random() * 10 + 8;
            heart.style.width = baseSize + 'px';
            heart.style.height = baseSize + 'px';
            const pseudoStyle = document.createElement('style');
            const uniqueId = `heart-bg-${i}`;
            heart.id = uniqueId;
            const color = Math.random() > 0.5 ? 'var(--primary-pink)' : 'var(--secondary-pink)';
            pseudoStyle.innerHTML = `#${uniqueId}::before { width: ${baseSize}px; height: ${baseSize}px; top: -${baseSize / 2}px; left: 0; background-color: ${color}; opacity: 0.6;} #${uniqueId}::after { width: ${baseSize}px; height: ${baseSize}px; top: 0; left: ${baseSize / 2}px; background-color: ${color}; opacity: 0.6;}`;
            if(document.head) document.head.appendChild(pseudoStyle);
            heart.style.animationDuration = Math.random() * 6 + 10 + 's';
            heart.style.animationDelay = Math.random() * 12 + 's';
            heart.style.opacity = '0';
            background.appendChild(heart);
        }
    }

    createBackgroundHearts();

});