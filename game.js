// Advanced Game State
let gameState = {
    balance: localStorage.getItem('balance') ? parseFloat(localStorage.getItem('balance')) : 1000,
    currentBet: 0,
    currentMultiplier: 0,
    gameActive: false,
    gameStartTime: 0,
    crashPoint: 0,
    autoCashoutPoint: 0,
    gameHistory: localStorage.getItem('gameHistory') ? JSON.parse(localStorage.getItem('gameHistory')) : [],
    stats: localStorage.getItem('stats') ? JSON.parse(localStorage.getItem('stats')) : {
        gamesPlayed: 0,
        gamesWon: 0,
        totalWon: 0,
        totalLost: 0,
        bestMultiplier: 0,
        allMultipliers: [],
        winStreak: 0,
        maxWinStreak: 0,
        loseStreak: 0
    },
    gameSequence: [],
    volatility: 1,
    roundNumber: 0,
    cumulativeWinnings: 0,
    achievements: localStorage.getItem('achievements') ? JSON.parse(localStorage.getItem('achievements')) : {},
    soundEnabled: true,
    autoPlayEnabled: false,
    autoPlayRounds: 0,
    autoPlayRoundsLeft: 0
};

// Canvas Setup
const canvas = document.getElementById('crashCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const container = document.querySelector('.crash-graph');
    canvas.width = container.offsetWidth - 20;
    canvas.height = container.offsetHeight - 20;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Initialize on page load
window.addEventListener('load', () => {
    updateDisplay();
    checkAndAwardAchievements();
});

// Sound Effects (Simple Web Audio API)
function playSound(type) {
    if (!gameState.soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'win':
                oscillator.frequency.value = 800;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
            case 'crash':
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
            case 'click':
                oscillator.frequency.value = 600;
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
        }
    } catch(e) {
        // Audio context not available
    }
}

// Utility Functions
function setBetAmount(amount) {
    document.getElementById('betAmount').value = amount;
    playSound('click');
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function updateDisplay() {
    document.getElementById('balance').textContent = `$${gameState.balance.toFixed(2)}`;
    document.getElementById('totalWon').textContent = `$${gameState.stats.totalWon.toFixed(2)}`;
    document.getElementById('totalLoss').textContent = `$${gameState.stats.totalLost.toFixed(2)}`;
    updateStats();
    updateHistory();
    updateAchievements();
}

function updateStats() {
    document.getElementById('gamesPlayed').textContent = gameState.stats.gamesPlayed;
    
    const winRate = gameState.stats.gamesPlayed > 0 
        ? ((gameState.stats.gamesWon / gameState.stats.gamesPlayed) * 100).toFixed(1) 
        : '0';
    document.getElementById('winRate').textContent = `${winRate}%`;
    
    const avgMultiplier = gameState.stats.allMultipliers.length > 0
        ? (gameState.stats.allMultipliers.reduce((a, b) => a + b) / gameState.stats.allMultipliers.length).toFixed(2)
        : '0.00';
    document.getElementById('avgMultiplier').textContent = `${avgMultiplier}x`;
    
    document.getElementById('bestMultiplier').textContent = `${gameState.stats.bestMultiplier.toFixed(2)}x`;
    
    // Update win/lose streaks if they exist
    const winStreakEl = document.getElementById('winStreak');
    if (winStreakEl) {
        winStreakEl.textContent = gameState.stats.winStreak;
    }
    const maxStreakEl = document.getElementById('maxWinStreak');
    if (maxStreakEl) {
        maxStreakEl.textContent = gameState.stats.maxWinStreak;
    }
}

function updateHistory() {
    const historyList = document.getElementById('historyList');
    
    if (gameState.gameHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No games yet</div>';
        return;
    }

    historyList.innerHTML = gameState.gameHistory
        .slice(-20)
        .reverse()
        .map(game => {
            const time = new Date(game.timestamp).toLocaleTimeString();
            const resultClass = game.won ? 'won' : 'lost';
            const resultText = game.won 
                ? `+$${(game.bet * game.multiplier).toFixed(2)} (${game.multiplier.toFixed(2)}x)` 
                : `-$${game.bet.toFixed(2)} (${game.crashAt.toFixed(2)}x)`;
            
            return `<div class="history-item ${resultClass}">
                <span class="history-item-time">${time}</span>
                <span class="history-item-result">${resultText}</span>
            </div>`;
        })
        .join('');
}

function updateAchievements() {
    const achievementsContainer = document.getElementById('achievementsContainer');
    if (!achievementsContainer) return;
    
    let html = '';
    const allAchievements = {
        'first_win': { name: '🎯 First Win', unlocked: gameState.achievements.first_win },
        'high_roller': { name: '💰 High Roller', unlocked: gameState.achievements.high_roller },
        'win_streak_5': { name: '🔥 On Fire', unlocked: gameState.achievements.win_streak_5 },
        'best_multiplier_10': { name: '📈 X10 Club', unlocked: gameState.achievements.best_multiplier_10 },
        'bankruptcy_recovery': { name: '💪 Comeback', unlocked: gameState.achievements.bankruptcy_recovery }
    };
    
    for (const [key, ach] of Object.entries(allAchievements)) {
        html += `<div class="achievement ${ach.unlocked ? 'unlocked' : 'locked'}" title="${ach.name}">
            ${ach.name}
        </div>`;
    }
    
    achievementsContainer.innerHTML = html;
}

// Advanced Crash Calculation with Volatility
function calculateCrashPoint(difficulty) {
    let baseCrash;
    gameState.volatility = 1 + (Math.random() * 0.3);
    
    switch(difficulty) {
        case 'easy':
            baseCrash = (1.3 + Math.random() * 1.5) * gameState.volatility;
            break;
        case 'medium':
            baseCrash = (2 + Math.random() * 4) * gameState.volatility;
            break;
        case 'hard':
            baseCrash = (3 + Math.random() * 8) * gameState.volatility;
            break;
        default:
            baseCrash = (2 + Math.random() * 4) * gameState.volatility;
    }
    
    return Math.max(1.01, Math.round(baseCrash * 100) / 100);
}

// Multiplier Calculation with smooth exponential growth
function calculateMultiplier(elapsedTime) {
    const multiplier = 1 + Math.pow(2, elapsedTime * 0.004) - 1;
    return Math.max(1, multiplier);
}

// Advanced Canvas Drawing with animations
function drawGraph() {
    if (!gameState.gameActive) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(10, 14, 39, 0.8)');
    gradient.addColorStop(1, 'rgba(20, 30, 60, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y = padding + (graphHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw crash point line
    if (gameState.crashPoint > 0) {
        const crashX = padding + (gameState.crashPoint / 20) * graphWidth;
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(crashX, padding);
        ctx.lineTo(crashX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw crash label with glow effect
        ctx.shadowColor = 'rgba(255, 107, 107, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`CRASH: ${gameState.crashPoint.toFixed(2)}x`, crashX, padding - 10);
        ctx.shadowColor = 'transparent';
    }

    // Draw curve with gradient
    const curveGradient = ctx.createLinearGradient(padding, 0, width - padding, 0);
    curveGradient.addColorStop(0, 'rgb(0, 212, 255)');
    curveGradient.addColorStop(1, 'rgb(0, 150, 255)');
    
    ctx.strokeStyle = curveGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let x = 0; x <= graphWidth; x += 2) {
        const multiplier = 1 + Math.pow(2, (x / graphWidth) * 8 * 0.004) - 1;
        const y = height - padding - (multiplier / 20) * graphHeight;
        
        if (x === 0) {
            ctx.moveTo(padding + x, y);
        } else {
            ctx.lineTo(padding + x, y);
        }
    }

    ctx.stroke();

    // Draw current position with pulse effect
    const elapsedTime = Date.now() - gameState.gameStartTime;
    const currentMult = calculateMultiplier(elapsedTime);
    
    if (currentMult <= gameState.crashPoint) {
        const dotX = padding + (currentMult / 20) * graphWidth;
        const dotY = height - padding - (currentMult / 20) * graphHeight;

        // Pulse effect
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 1;
        
        ctx.fillStyle = `rgba(81, 207, 102, ${0.5 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer circle
        ctx.strokeStyle = 'rgba(81, 207, 102, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 10 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Game Functions
function placeBet() {
    const betAmount = parseFloat(document.getElementById('betAmount').value);
    const autoCashout = parseFloat(document.getElementById('autoCashout').value) || 0;
    const difficulty = document.getElementById('difficulty').value;

    if (isNaN(betAmount) || betAmount <= 0) {
        showNotification('Please enter a valid bet amount', 'error');
        return;
    }

    if (betAmount > gameState.balance) {
        showNotification('Insufficient balance!', 'error');
        return;
    }

    if (autoCashout && autoCashout < 1.01) {
        showNotification('Auto cashout must be at least 1.01x', 'error');
        return;
    }

    // Start game
    gameState.currentBet = betAmount;
    gameState.balance -= betAmount;
    gameState.gameActive = true;
    gameState.gameStartTime = Date.now();
    gameState.crashPoint = calculateCrashPoint(difficulty);
    gameState.autoCashoutPoint = autoCashout;
    gameState.currentMultiplier = 1;
    gameState.roundNumber++;

    // Update UI
    document.getElementById('placeBetBtn').style.display = 'none';
    document.getElementById('cashoutBtn').style.display = 'block';
    document.getElementById('cashoutBtn').disabled = false;
    document.getElementById('gameStatus').textContent = 'GAME IN PROGRESS';
    document.getElementById('betAmount').disabled = true;
    document.getElementById('autoCashout').disabled = true;
    document.getElementById('difficulty').disabled = true;

    document.querySelectorAll('.quick-bet-btn').forEach(btn => {
        btn.disabled = true;
    });

    showNotification(`Round ${gameState.roundNumber} started! Betting $${betAmount.toFixed(2)}`, 'warning');
    updateDisplay();
    gameLoop();
}

function gameLoop() {
    if (!gameState.gameActive) return;

    const elapsedTime = Date.now() - gameState.gameStartTime;
    gameState.currentMultiplier = calculateMultiplier(elapsedTime);

    document.getElementById('currentMultiplier').textContent = `${gameState.currentMultiplier.toFixed(2)}x`;
    document.getElementById('potentialWin').textContent = `$${(gameState.currentBet * gameState.currentMultiplier).toFixed(2)}`;
    document.getElementById('crashAt').textContent = `${gameState.crashPoint.toFixed(2)}x`;

    drawGraph();

    // Check for crash
    if (gameState.currentMultiplier >= gameState.crashPoint) {
        crash();
        return;
    }

    // Check for auto-cashout
    if (gameState.autoCashoutPoint > 0 && gameState.currentMultiplier >= gameState.autoCashoutPoint) {
        cashout();
        return;
    }

    requestAnimationFrame(gameLoop);
}

function cashout() {
    if (!gameState.gameActive) return;

    gameState.gameActive = false;
    playSound('win');

    const winAmount = gameState.currentBet * gameState.currentMultiplier;
    gameState.balance += winAmount;
    gameState.cumulativeWinnings += (winAmount - gameState.currentBet);

    // Record game
    gameState.gameHistory.push({
        bet: gameState.currentBet,
        multiplier: gameState.currentMultiplier,
        won: true,
        crashAt: gameState.crashPoint,
        timestamp: new Date().toISOString()
    });

    // Update stats
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    gameState.stats.totalWon += (winAmount - gameState.currentBet);
    gameState.stats.allMultipliers.push(gameState.currentMultiplier);
    gameState.stats.winStreak = (gameState.stats.winStreak || 0) + 1;
    gameState.stats.loseStreak = 0;
    
    if (gameState.stats.winStreak > (gameState.stats.maxWinStreak || 0)) {
        gameState.stats.maxWinStreak = gameState.stats.winStreak;
    }
    
    if (gameState.currentMultiplier > gameState.stats.bestMultiplier) {
        gameState.stats.bestMultiplier = gameState.currentMultiplier;
    }

    // Save data
    saveGameState();

    // Update UI
    document.getElementById('crashMessage').textContent = '✅ CASHED OUT!';
    document.getElementById('currentMultiplier').classList.remove('crashed');
    
    showNotification(`✅ Won $${(winAmount - gameState.currentBet).toFixed(2)}!`, 'success');
    
    checkAndAwardAchievements();
    endGame();
}

function crash() {
    gameState.gameActive = false;
    playSound('crash');

    // Record game
    gameState.gameHistory.push({
        bet: gameState.currentBet,
        multiplier: gameState.currentMultiplier,
        won: false,
        crashAt: gameState.crashPoint,
        timestamp: new Date().toISOString()
    });

    // Update stats
    gameState.stats.gamesPlayed++;
    gameState.stats.totalLost += gameState.currentBet;
    gameState.stats.allMultipliers.push(gameState.currentMultiplier);
    gameState.stats.winStreak = 0;
    gameState.stats.loseStreak = (gameState.stats.loseStreak || 0) + 1;

    if (gameState.currentMultiplier > gameState.stats.bestMultiplier) {
        gameState.stats.bestMultiplier = gameState.currentMultiplier;
    }

    // Save data
    saveGameState();

    // Update UI
    document.getElementById('crashMessage').textContent = '💥 CRASHED!';
    document.getElementById('currentMultiplier').classList.add('crashed');
    
    showNotification(`❌ Lost $${gameState.currentBet.toFixed(2)}!`, 'error');
    
    checkAndAwardAchievements();
    endGame();
}

function endGame() {
    document.getElementById('placeBetBtn').style.display = 'block';
    document.getElementById('cashoutBtn').style.display = 'none';
    document.getElementById('cashoutBtn').disabled = true;
    document.getElementById('gameStatus').textContent = 'GAME ENDED';
    document.getElementById('betAmount').disabled = false;
    document.getElementById('autoCashout').disabled = false;
    document.getElementById('difficulty').disabled = false;

    document.querySelectorAll('.quick-bet-btn').forEach(btn => {
        btn.disabled = false;
    });

    updateDisplay();
    
    // Draw final graph
    drawGraph();
    
    // Auto-play next round if enabled
    if (gameState.autoPlayEnabled && gameState.autoPlayRoundsLeft > 0) {
        gameState.autoPlayRoundsLeft--;
        setTimeout(() => {
            placeBet();
        }, 2000);
    }
}

// Achievement System
function checkAndAwardAchievements() {
    // First Win
    if (gameState.stats.gamesWon === 1 && !gameState.achievements.first_win) {
        gameState.achievements.first_win = true;
        showNotification('🎯 Achievement Unlocked: First Win!', 'success');
    }
    
    // High Roller (bet over $500)
    if (gameState.currentBet >= 500 && !gameState.achievements.high_roller) {
        gameState.achievements.high_roller = true;
        showNotification('💰 Achievement Unlocked: High Roller!', 'success');
    }
    
    // Win Streak of 5
    if (gameState.stats.winStreak === 5 && !gameState.achievements.win_streak_5) {
        gameState.achievements.win_streak_5 = true;
        showNotification('🔥 Achievement Unlocked: On Fire!', 'success');
    }
    
    // Reach 10x multiplier
    if (gameState.currentMultiplier >= 10 && !gameState.achievements.best_multiplier_10) {
        gameState.achievements.best_multiplier_10 = true;
        showNotification('📈 Achievement Unlocked: X10 Club!', 'success');
    }
    
    // Comeback from near bankruptcy
    if (gameState.balance < 100 && gameState.cumulativeWinnings > 200 && !gameState.achievements.bankruptcy_recovery) {
        gameState.achievements.bankruptcy_recovery = true;
        showNotification('💪 Achievement Unlocked: Comeback!', 'success');
    }
    
    saveGameState();
}

// Save Game State
function saveGameState() {
    localStorage.setItem('balance', gameState.balance);
    localStorage.setItem('gameHistory', JSON.stringify(gameState.gameHistory));
    localStorage.setItem('stats', JSON.stringify(gameState.stats));
    localStorage.setItem('achievements', JSON.stringify(gameState.achievements));
}

// Auto-Play Feature
function toggleAutoPlay() {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const autoPlayRoundsInput = document.getElementById('autoPlayRounds');
    
    if (!autoPlayBtn) return;
    
    gameState.autoPlayEnabled = !gameState.autoPlayEnabled;
    autoPlayBtn.classList.toggle('active', gameState.autoPlayEnabled);
    
    if (gameState.autoPlayEnabled) {
        const rounds = parseInt(autoPlayRoundsInput?.value) || 5;
        gameState.autoPlayRoundsLeft = rounds;
        showNotification(`Auto-play enabled for ${rounds} rounds`, 'info');
    } else {
        showNotification('Auto-play disabled', 'info');
    }
}

// Sound Toggle
function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
        soundBtn.classList.toggle('active', gameState.soundEnabled);
    }
    showNotification(`Sound ${gameState.soundEnabled ? 'enabled' : 'disabled'}`, 'info');
}

function resetStats() {
    if (confirm('Are you sure you want to reset all statistics?')) {
        gameState.balance = 1000;
        gameState.gameHistory = [];
        gameState.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWon: 0,
            totalLost: 0,
            bestMultiplier: 0,
            allMultipliers: [],
            winStreak: 0,
            maxWinStreak: 0,
            loseStreak: 0
        };
        gameState.achievements = {};
        gameState.cumulativeWinnings = 0;
        gameState.roundNumber = 0;

        saveGameState();
        updateDisplay();
        showNotification('Stats reset successfully!', 'success');
    }
}
