document.addEventListener('DOMContentLoaded', () => {
    AOS.init({
        duration: 800,
        once: true
    });

    const introModal = document.getElementById('intro-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const startGameBtn = document.getElementById('start-game-btn');

    const gameSection = document.getElementById('game-section');
    const envelopeSection = document.getElementById('envelope-section');
    const letterSection = document.getElementById('letter-section');

    const gameArea = document.getElementById('game-area');
    const catcher = document.getElementById('catcher');
    const scoreDisplay = document.getElementById('score');
    const gameMessage = document.getElementById('game-message');

    const envelope = document.getElementById('envelope');

    const GOAL_SCORE = 15;
    let currentScore = 0;
    let gameInterval;
    let hearts = [];
    let animationFrameId;
    const heartSpeed = 2.5;
    const heartCreationInterval = 900;
    let gameActive = false;
    let gamePausedByVisibility = false;

    function pauseGame() {
        if (!gameActive) return;
        clearInterval(gameInterval);
        cancelAnimationFrame(animationFrameId);
        gamePausedByVisibility = true;
        console.log("Игра приостановлена (вкладка скрыта или игра завершена)");
    }

    function resumeGame() {
        if (!gameActive || !gamePausedByVisibility) return;
        if (currentScore >= GOAL_SCORE) {
            gamePausedByVisibility = false;
            return;
        }
        gameInterval = setInterval(createHeart, heartCreationInterval);
        animationFrameId = requestAnimationFrame(moveHearts);
        gamePausedByVisibility = false;
        console.log("Игра возобновлена (вкладка стала видимой)");
    }

    document.addEventListener('visibilitychange', () => {
        if (!gameSection || gameSection.classList.contains('hidden') || !gameActive) {
            return;
        }
        if (document.hidden) {
            pauseGame();
        } else {
            resumeGame();
        }
    });

    fetch('/log-visit', { method: 'POST' }) 
    .then(response => {
        if (!response.ok) {
            console.error('Сервер не смог залогировать визит. Статус:', response.status);
        } 
    })
    .catch(error => {
        console.error('Ошибка при отправке сигнала логирования на сервер:', error);
    });

    function createHeart() {
        if (!gameActive || gamePausedByVisibility || !gameArea) return;
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
        if (!gameActive || gamePausedByVisibility) {
            if (gameActive && !gamePausedByVisibility) {
                 animationFrameId = requestAnimationFrame(moveHearts);
            }
            return;
        }
        hearts.forEach((heart, index) => {
            if (!heart) { hearts.splice(index, 1); return; }
            let topPosition = heart.offsetTop;
            heart.style.top = topPosition + heartSpeed + 'px';
            if (isColliding(heart, catcher)) {
                heart.remove();
                hearts.splice(index, 1);
                currentScore++;
                if (scoreDisplay) scoreDisplay.textContent = currentScore;
                if (currentScore >= GOAL_SCORE && gameActive) {
                    endGame(true);
                }
            } else if (gameArea && topPosition > gameArea.offsetHeight) {
                heart.remove();
                hearts.splice(index, 1);
            }
        });
        if (gameActive && !gamePausedByVisibility) {
            animationFrameId = requestAnimationFrame(moveHearts);
        }
    }

    function isColliding(element1, element2) {
        if (!element1 || !element2) return false;
        const rect1 = element1.getBoundingClientRect();
        const rect2 = element2.getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }
    
    function centerCatcher() {
        if(catcher && gameArea) {
            const gameAreaWidth = gameArea.offsetWidth;
            const catcherWidth = catcher.offsetWidth;
            catcher.style.left = (gameAreaWidth / 2) - (catcherWidth / 2) + 'px';
        }
    }

    function moveCatcher(event) {
        if (!gameActive || gamePausedByVisibility || !gameArea || !catcher) return;
        const gameAreaRect = gameArea.getBoundingClientRect();
        const gameAreaWidth = gameAreaRect.width;
        const catcherWidth = catcher.offsetWidth;
        let xPositionInGameArea;
        if (event.type === 'mousemove') {
            xPositionInGameArea = event.clientX - gameAreaRect.left;
        } else if (event.type === 'touchmove' && event.touches.length > 0) {
            xPositionInGameArea = event.touches[0].clientX - gameAreaRect.left;
        } else {
            return;
        }
        let newLeft = xPositionInGameArea - catcherWidth / 2;
        const minLeft = 0;
        const maxLeft = gameAreaWidth - catcherWidth;
        newLeft = Math.max(minLeft, newLeft);
        newLeft = Math.min(maxLeft, newLeft);
        if (maxLeft < minLeft) {
            newLeft = minLeft;
        }
        catcher.style.left = newLeft + 'px';
    }

    function startGame() {
        if (gameActive) return;
        if (!gameSection || !gameArea || !startGameBtn) {
            console.error("Ошибка: Не найдены необходимые элементы для старта игры.");
            return;
        }
        console.log("Запуск игры...");
        showSection(gameSection);
        gameActive = true;
        gamePausedByVisibility = false;
        const goalDisplayElem = document.querySelector('#game-elements h2 .highlight');
        if(goalDisplayElem) goalDisplayElem.textContent = GOAL_SCORE;
        currentScore = 0;
        if (scoreDisplay) scoreDisplay.textContent = currentScore;
        if (gameMessage) gameMessage.textContent = '';
        hearts.forEach(heart => heart.remove());
        hearts = [];
        centerCatcher();
        clearInterval(gameInterval);
        cancelAnimationFrame(animationFrameId);
        gameInterval = setInterval(createHeart, heartCreationInterval);
        animationFrameId = requestAnimationFrame(moveHearts);
        gameArea.addEventListener('mousemove', moveCatcher);
        gameArea.addEventListener('touchmove', moveCatcher, { passive: true });
        startGameBtn.disabled = true;
    }

    function endGame(isWin) {
        if (!gameActive) return;
        console.log("Игра завершена. Победа:", isWin);
        gameActive = false;
        pauseGame();
        if(gameArea) {
            gameArea.removeEventListener('mousemove', moveCatcher);
            gameArea.removeEventListener('touchmove', moveCatcher);
        }
        if (isWin) {
            if(gameMessage) gameMessage.textContent = 'Победа!';
            launchConfetti();
            setTimeout(() => {
                showSection(envelopeSection);
                hideSection(gameSection);
                if (typeof AOS !== 'undefined') AOS.refresh();
            }, 1500);
        }
        startGameBtn.disabled = false;
    }

    function launchConfetti() {
        if (typeof confetti !== 'function') {
            console.warn('Библиотека Confetti не загружена');
            return;
        }
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ffcad4', '#f4acb7', '#d88c9a', '#ffffff'],
        });
        setTimeout(() => confetti({ particleCount: 40, spread: 50, origin: { x: 0.2, y: 0.7 }, colors: ['#ffcad4', '#f4acb7', '#ffffff'] }), 250);
        setTimeout(() => confetti({ particleCount: 40, spread: 50, origin: { x: 0.8, y: 0.7 }, colors: ['#ffcad4', '#f4acb7', '#ffffff'] }), 500);
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
            const color = Math.random() > 0.5 ? 'var(--primary-pink)' : 'var(--secondary-pink)';
            heart.style.backgroundColor = color;
            heart.style.animationDuration = Math.random() * 6 + 10 + 's';
            heart.style.animationDelay = Math.random() * 12 + 's';
            heart.style.opacity = '0';
            background.appendChild(heart);
        }
    }

    createBackgroundHearts();

});
