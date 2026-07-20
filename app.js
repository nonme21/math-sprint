// Game Constants and State
let score = 0;
let highScoreNormal = parseInt(localStorage.getItem('math_sprint_high_normal')) || 0;
let highScoreImpossible = parseInt(localStorage.getItem('math_sprint_high_impossible')) || 0;
let soundEnabled = localStorage.getItem('math_sprint_sound') !== 'false';
let vibrationEnabled = localStorage.getItem('math_sprint_vibration') !== 'false';
let lightThemeEnabled = localStorage.getItem('math_sprint_theme') === 'light';
let gameTimeSetting = parseInt(localStorage.getItem('math_sprint_time')) || 60;
let lives = 3;
let secondsLeft = 60;
let gameMode = 'normal'; // 'normal' or 'record'
let currentCorrectAnswer = null;
let roundCount = 0;
let rewardedAdUsed = false;

// Intervals and Timers
let gameTimerInterval = null;

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const secondsLeftText = document.getElementById('seconds-left');
const timerBadge = document.getElementById('timer-badge');
const currentScoreText = document.getElementById('current-score');
const timerProgress = document.getElementById('timer-progress');
const equationBox = document.getElementById('equation-box');
const equationText = document.getElementById('equation-text');
const choiceButtons = document.querySelectorAll('.choice-btn');
const penaltyToast = document.getElementById('penalty-toast');
const bonusToast = document.getElementById('bonus-toast');

// Home screen DOM elements
const bestNormalText = document.getElementById('best-normal');
const btnStartNormal = document.getElementById('btn-start-normal');

// Settings DOM elements
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const btnSettingsClose = document.getElementById('btn-settings-close');
const settingTime = document.getElementById('setting-time');
const toggleSound = document.getElementById('setting-sound');
const toggleVibration = document.getElementById('setting-vibration');
const toggleTheme = document.getElementById('setting-theme');
const btnResetRecords = document.getElementById('btn-reset-records');

// Game Over Modal DOM elements
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreText = document.getElementById('final-score-val');
const highScoreValText = document.getElementById('high-score-val');
const newHighScoreBadge = document.getElementById('new-high-score-badge');
const btnWatchRewarded = document.getElementById('btn-watch-rewarded');
const btnGameMenu = document.getElementById('btn-game-menu');
const btnGameRetry = document.getElementById('btn-game-retry');
const btnGameBack = document.getElementById('btn-game-back');

// Ad Modal DOM elements
const adModal = document.getElementById('ad-modal');
const adTitle = document.getElementById('ad-title');
const adCountdownSeconds = document.getElementById('ad-countdown-seconds');
const adLoaderFill = document.getElementById('ad-loader-fill');
const btnSkipAd = document.getElementById('btn-skip-ad');

// Audio Context setup
let audioCtx = null;
function initAudio() {
    if (!audioCtx && soundEnabled) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}
function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
}
function triggerVibration(pattern) {
    if (vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}



// Initialize application
function init() {
    // Load high scores to UI
    bestNormalText.textContent = `${Math.max(highScoreNormal, highScoreImpossible)}`;

    // Apply saved theme and toggles
    if (settingTime) {
        settingTime.value = gameTimeSetting;
        settingTime.addEventListener('change', (e) => {
            gameTimeSetting = parseInt(e.target.value);
            localStorage.setItem('math_sprint_time', gameTimeSetting);
        });
    }
    if (toggleSound) toggleSound.checked = soundEnabled;
    if (toggleVibration) toggleVibration.checked = vibrationEnabled;
    if (toggleTheme) toggleTheme.checked = lightThemeEnabled;
    if (lightThemeEnabled) document.body.classList.add('light-theme');

    // Hook Up Menu Clicks
    if (btnStartNormal) btnStartNormal.addEventListener('click', () => startGame('normal'));
    const btnStartRecord = document.getElementById('btn-start-record');
    if (btnStartRecord) btnStartRecord.addEventListener('click', () => startGame('record'));
    btnGameBack.addEventListener('click', leaveGame);

    // Settings Clicks
    if (btnSettings) btnSettings.addEventListener('click', () => { if (settingsModal) settingsModal.classList.add('active'); initAudio(); });
    if (btnSettingsClose) btnSettingsClose.addEventListener('click', () => { if (settingsModal) settingsModal.classList.remove('active'); });

    if (toggleSound) toggleSound.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        localStorage.setItem('math_sprint_sound', soundEnabled);
        if (soundEnabled) initAudio();
    });
    if (toggleVibration) toggleVibration.addEventListener('change', (e) => {
        vibrationEnabled = e.target.checked;
        localStorage.setItem('math_sprint_vibration', vibrationEnabled);
        if (vibrationEnabled) triggerVibration(50);
    });
    if (toggleTheme) toggleTheme.addEventListener('change', (e) => {
        lightThemeEnabled = e.target.checked;
        localStorage.setItem('math_sprint_theme', lightThemeEnabled ? 'light' : 'dark');
        if (lightThemeEnabled) document.body.classList.add('light-theme');
        else document.body.classList.remove('light-theme');
    });
    if (btnResetRecords) btnResetRecords.addEventListener('click', () => {
        highScoreNormal = 0;
        highScoreImpossible = 0;
        localStorage.setItem('math_sprint_high_normal', 0);
        localStorage.setItem('math_sprint_high_impossible', 0);
        if (bestNormalText) bestNormalText.textContent = `0`;
        alert('Рекорды сброшены!');
    });

    // Setup Answer button clicks
    choiceButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            checkAnswer(index, e.target);
        });
    });

    // Modal Action Clicks
    btnGameMenu.addEventListener('click', () => {
        closeGameOverModal();
        showHomeScreen();
    });
    btnGameRetry.addEventListener('click', () => {
        closeGameOverModal();
        restartGame();
    });
    btnWatchRewarded.addEventListener('click', () => {
        triggerRewardedAd();
    });
}

// Show Home Screen
function showHomeScreen() {
    gameOverModal.classList.remove('active');
    gameScreen.classList.remove('active');
    homeScreen.classList.add('active');
    bestNormalText.textContent = `${Math.max(highScoreNormal, highScoreImpossible)}`;
}

// Start game setup
function startGame(mode) {
    gameMode = mode;
    score = 0;
    rewardedAdUsed = false;
    currentScoreText.textContent = '0';
    timerBadge.classList.remove('danger');

    if (mode === 'record') {
        secondsLeft = 5;
        lives = 3;
        const livesBadge = document.getElementById('lives-badge');
        if (livesBadge) livesBadge.classList.remove('hidden');
        const livesCount = document.getElementById('lives-count');
        if (livesCount) livesCount.textContent = '❤️❤️❤️';
    } else {
        secondsLeft = gameTimeSetting;
        const livesBadge = document.getElementById('lives-badge');
        if (livesBadge) livesBadge.classList.add('hidden');
    }

    secondsLeftText.textContent = `${secondsLeft}s`;
    timerProgress.style.width = '100%';
    timerProgress.style.backgroundColor = 'var(--neon-green)';

    // Switch screen
    homeScreen.classList.remove('active');
    gameScreen.classList.add('active');



    generateQuestion();
    startTimer();
}

function loseLife() {
    lives = 3; //    lives--;
    playSound('wrong');
    triggerVibration([50, 50, 50]);
    gameScreen.classList.add('shake-animation');
    setTimeout(() => gameScreen.classList.remove('shake-animation'), 400);

    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    for (let i = lives; i < 3; i++) hearts += '💔';
    const livesCount = document.getElementById('lives-count');
    if (livesCount) livesCount.textContent = hearts;

    if (lives <= 0) {
        clearInterval(gameTimerInterval);
        handleTimeOut();
    } else {
        secondsLeft = 5;
        updateTimerUI();
        generateQuestion();
    }
}

// Start Main Countdown timer
function startTimer() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        if (secondsLeft > 0) {
            secondsLeft--;
            updateTimerUI();
        } else {
            if (gameMode === 'record') {
                loseLife();
            } else {
                clearInterval(gameTimerInterval);
                handleTimeOut();
            }
        }
    }, 1000);
}

// Update timer aesthetics based on remaining seconds
function updateTimerUI() {
    secondsLeftText.textContent = `${secondsLeft}s`;

    // Progress Bar Width
    const maxTime = gameMode === 'record' ? 5 : gameTimeSetting;
    const percent = (secondsLeft / maxTime) * 100;
    timerProgress.style.width = `${Math.max(0, percent)}%`;

    // Progress Bar Color and Alarm state
    if (secondsLeft <= 10) {
        timerProgress.style.backgroundColor = 'var(--neon-red)';
        timerBadge.classList.add('danger');
    } else if (secondsLeft <= 25) {
        timerProgress.style.backgroundColor = 'orange';
        timerBadge.classList.remove('danger');
    } else {
        timerProgress.style.backgroundColor = 'var(--neon-green)';
        timerBadge.classList.remove('danger');
    }
}

// Generate mathematical sprint equation
function generateQuestion() {
    let num1, num2, operator, answer;

    if (gameMode === 'normal') {
        const type = Math.floor(Math.random() * 3); // 0 = +, 1 = -, 2 = *
        if (type === 0) {
            num1 = Math.floor(Math.random() * 45) + 5; // 5-49
            num2 = Math.floor(Math.random() * 45) + 5; // 5-49
            operator = '+';
            answer = num1 + num2;
        } else if (type === 1) {
            num1 = Math.floor(Math.random() * 45) + 5;
            num2 = Math.floor(Math.random() * (num1 - 2)) + 2; // ensure positive answer
            operator = '-';
            answer = num1 - num2;
        } else {
            num1 = Math.floor(Math.random() * 11) + 2; // 2-12
            num2 = Math.floor(Math.random() * 11) + 2; // 2-12
            operator = '×';
            answer = num1 * num2;
        }
    } else {
        // Record mode
        let maxNum = 10 + Math.floor(score * 2.5);
        let typeCount = score > 15 ? 3 : (score > 5 ? 2 : 1);
        const type = Math.floor(Math.random() * typeCount);

        if (type === 0) {
            num1 = Math.floor(Math.random() * maxNum) + 2;
            num2 = Math.floor(Math.random() * maxNum) + 2;
            operator = '+';
            answer = num1 + num2;
        } else if (type === 1) {
            num1 = Math.floor(Math.random() * maxNum) + 5;
            num2 = Math.floor(Math.random() * (num1 - 2)) + 2;
            operator = '-';
            answer = num1 - num2;
        } else {
            let multMax = 3 + Math.floor(score / 3);
            num1 = Math.floor(Math.random() * multMax) + 2;
            num2 = Math.floor(Math.random() * multMax) + 2;
            operator = '×';
            answer = num1 * num2;
        }
    }

    currentCorrectAnswer = answer;
    if (gameMode === 'record' && score > 30 && Math.random() > 0.5) {
        let maxNum = 10 + Math.floor(score * 2.5);
        let num3 = Math.floor(Math.random() * (maxNum / 2)) + 1;
        let op2 = Math.random() > 0.5 ? '+' : '-';
        if (op2 === '+') answer += num3;
        else answer -= num3;
        currentCorrectAnswer = answer;
        equationText.textContent = `${num1} ${operator} ${num2} ${op2} ${num3} = ?`;
    } else {
        equationText.textContent = `${num1} ${operator} ${num2} = ?`;
    }

    // Generate unique answer choices
    const options = new Set([answer]);
    while (options.size < 4) {
        const offset = Math.floor(Math.random() * 15) + 1;
        const add = Math.random() > 0.5;
        const value = add ? (answer + offset) : (answer - offset);
        if (value > 0) {
            options.add(value);
        } else {
            options.add(answer + offset + 10);
        }
    }

    // Convert Set to shuffled array
    const shuffledChoices = Array.from(options).sort(() => Math.random() - 0.5);

    // Apply choices to Buttons
    choiceButtons.forEach((btn, index) => {
        btn.textContent = shuffledChoices[index];
        btn.className = 'choice-btn'; // reset class names
        btn.disabled = false;
    });

    // Reset feedback
    equationBox.classList.remove('flash-correct', 'flash-mistake');
}

// User clicked a choice
function checkAnswer(selectedIndex, clickedButton) {
    // Disable buttons instantly to prevent multiple clicks
    choiceButtons.forEach(btn => btn.disabled = true);

    const chosenVal = parseInt(clickedButton.textContent);

    if (chosenVal === currentCorrectAnswer) {
        // Correct Answer
        playSound('correct');
        triggerVibration(30);
        clickedButton.classList.add('correct');
        equationBox.classList.add('flash-correct');

        // Update score
        const pointsAdded = 10;
        score += pointsAdded;
        currentScoreText.textContent = score;

        // Show score toast bonus animation
        bonusToast.textContent = `+${pointsAdded} ОЧКО!`;
        bonusToast.classList.add('active');
        setTimeout(() => bonusToast.classList.remove('active'), 400);

        if (gameMode === 'record') {
            secondsLeft = 5;
            updateTimerUI();
        }

        setTimeout(() => {
            generateQuestion();
        }, 250);
    } else {
        if (gameMode === 'record') {
            clickedButton.classList.add('wrong');
            equationBox.classList.add('flash-mistake');
            choiceButtons.forEach(btn => {
                if (parseInt(btn.textContent) === currentCorrectAnswer) btn.classList.add('reveal-correct');
            });
            setTimeout(() => { loseLife(); }, 400);
        } else {
            // Incorrect Answer: Penalty -3s, Shake screen
            playSound('wrong');
            triggerVibration([50, 50, 50]);
            clickedButton.classList.add('wrong');
            equationBox.classList.add('flash-mistake');

            // Highlight correct answer button
            choiceButtons.forEach(btn => {
                if (parseInt(btn.textContent) === currentCorrectAnswer) {
                    btn.classList.add('reveal-correct');
                }
            });

            // Penalize time
            secondsLeft = Math.max(0, secondsLeft - 3);
            updateTimerUI();

            // Shake screen container animation
            gameScreen.classList.add('shake-animation');
            setTimeout(() => gameScreen.classList.remove('shake-animation'), 400);

            // Show penalty toast error animation
            penaltyToast.classList.add('active');
            setTimeout(() => penaltyToast.classList.remove('active'), 400);

            setTimeout(() => {
                generateQuestion();
            }, 400);
        }
    }
}

// Handling time runs out
function handleTimeOut() {
    roundCount++;
    clearInterval(gameTimerInterval);

    // Check if Interstitial ad should trigger (every 3 rounds)
    if (roundCount % 3 === 0) {
        triggerInterstitialAd(() => {
            showGameOverModal();
        });
    } else {
        showGameOverModal();
    }
}

// Show final scores modal
function showGameOverModal() {
    let isNewHigh = false;
    let oldHigh = 0;

    if (gameMode === 'normal') {
        oldHigh = highScoreNormal;
        if (score > highScoreNormal) {
            highScoreNormal = score;
            localStorage.setItem('math_sprint_high_normal', score);
            isNewHigh = true;
        }
    } else {
        oldHigh = highScoreImpossible;
        if (score > highScoreImpossible) {
            highScoreImpossible = score;
            localStorage.setItem('math_sprint_high_impossible', score);
            isNewHigh = true;
        }
    }

    finalScoreText.textContent = score;
    highScoreValText.textContent = isNewHigh ? score : oldHigh;

    if (isNewHigh) {
        newHighScoreBadge.classList.remove('hidden');
    } else {
        newHighScoreBadge.classList.add('hidden');
    }

    // Handle Rewarded Ad button visibility
    if (rewardedAdUsed) {
        btnWatchRewarded.classList.add('hidden');
    } else {
        btnWatchRewarded.classList.remove('hidden');
        if (gameMode === 'record') {
            btnWatchRewarded.innerHTML = "🎬 РЕКЛАМА ЗА +1 ЖИЗНЬ";
        } else {
            btnWatchRewarded.innerHTML = "🎬 РЕКЛАМА ЗА +15 СЕК";
        }
    }

    gameOverModal.classList.add('active');
}

function closeGameOverModal() {
    gameOverModal.classList.remove('active');
}

// Restart game instantly
function restartGame() {
    startGame(gameMode);
}

// Back out of active game session
function leaveGame() {
    clearInterval(gameTimerInterval);
    showHomeScreen();
}

/* MONETIZATION: AD SIMULATORS */

// Interstitial Fullscreen Ad
function triggerInterstitialAd(onCompletedCallback) {
    adTitle.textContent = "СИМУЛЯЦИЯ РЕКЛАМЫ";
    adLoaderFill.style.width = '0%';
    adModal.classList.add('active');
    btnSkipAd.classList.add('hidden');

    let count = 5;
    document.getElementById('ad-timer-label').textContent = "Закроется через";
    adCountdownSeconds.textContent = `${count}s`;

    // Fill progress bar animation in JS
    setTimeout(() => {
        adLoaderFill.style.transition = 'width 5s linear';
        adLoaderFill.style.width = '100%';
    }, 50);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            adCountdownSeconds.textContent = `${count}s`;
            if (count <= 2) {
                // Show Skip button after 3 seconds
                btnSkipAd.classList.remove('hidden');
            }
        } else {
            clearInterval(interval);
            finishAd();
        }
    }, 1000);

    // Skip Button callback
    function skipHandler() {
        clearInterval(interval);
        btnSkipAd.removeEventListener('click', skipHandler);
        finishAd();
    }
    btnSkipAd.addEventListener('click', skipHandler);

    function finishAd() {
        adLoaderFill.style.transition = 'none';
        adLoaderFill.style.width = '0%';
        adModal.classList.remove('active');
        btnSkipAd.classList.add('hidden');
        if (onCompletedCallback) onCompletedCallback();
    }
}

// Rewarded Video Ad (Grant extra 15 seconds)
function triggerRewardedAd() {
    adTitle.textContent = "СИМУЛЯЦИЯ РЕКЛАМЫ ЗА ВОЗНАГРАЖДЕНИЕ";
    adLoaderFill.style.width = '0%';
    adModal.classList.add('active');
    btnSkipAd.classList.add('hidden'); // skip is disabled for rewarded ads

    let count = 5;
    document.getElementById('ad-timer-label').textContent = "Награда через";
    adCountdownSeconds.textContent = `${count}s`;

    setTimeout(() => {
        adLoaderFill.style.transition = 'width 5s linear';
        adLoaderFill.style.width = '100%';
    }, 50);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            adCountdownSeconds.textContent = `${count}s`;
        } else {
            clearInterval(interval);
            adLoaderFill.style.transition = 'none';
            adLoaderFill.style.width = '0%';
            adModal.classList.remove('active');

            // Give reward (15 seconds) and resume game
            rewardedAdUsed = true;

            if (gameMode === 'record') {
                lives = 1;
                const livesCount = document.getElementById('lives-count');
                if (livesCount) livesCount.textContent = '❤️💔💔';
                secondsLeft = 5;
            } else {
                secondsLeft = 15;
            }

            updateTimerUI();

            closeGameOverModal();
            generateQuestion();
            startTimer();
        }
    }, 1000);
}

// Run app init on load
window.addEventListener('DOMContentLoaded', init);
