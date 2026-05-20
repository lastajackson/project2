// Game State
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
        allMultipliers: []
    }
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
});

// Utility Functions
function setBetAmount(amount) {
    document.getElementById('betAmount').value = amount;
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
    document.getElementById('totalLost').textContent = `$${gameState.stats.totalLost.toFixed(2)}`;
    updateStats();
    updateHistory();
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

// Crash Calculation
function calculateCrashPoint(difficulty) {
    let baseCrash;
    
    switch(difficulty) {
        case 'easy':
            baseCrash = 1.3 + Math.random() * 1.5;
            break;
        case 'medium':
            baseCrash = 2 + Math.random() * 4;
            break;
        case 'hard':
            baseCrash = 3 + Math.random() * 8;
            break;
        default:
            baseCrash = 2 + Math.random() * 4;
    }
    
    return Math.max(1.01, baseCrash);
}

// Multiplier Calculation
function calculateMultiplier(elapsedTime) {
    const multiplier = 1 + Math.pow(2, elapsedTime * 0.004) - 1;
    return Math.max(1, multiplier);
}

// Canvas Drawing
function drawGraph() {
    if (!gameState.gameActive) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 14, 39, 0.5)';
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

        // Draw crash label
        ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`CRASH: ${gameState.crashPoint.toFixed(2)}x`, crashX, padding - 10);
    }

    // Draw curve
    ctx.strokeStyle = 'rgb(0, 212, 255)';
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

    // Draw current position
    const elapsedTime = Date.now() - gameState.gameStartTime;
    const currentMult = calculateMultiplier(elapsedTime);
    
    if (currentMult <= gameState.crashPoint) {
        const dotX = padding + (currentMult / 20) * graphWidth;
        const dotY = height - padding - (currentMult / 20) * graphHeight;

        ctx.fillStyle = 'rgb(81, 207, 102)';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
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

    showNotification(`Game started! Betting $${betAmount.toFixed(2)}`, 'warning');
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

    const winAmount = gameState.currentBet * gameState.currentMultiplier;
    gameState.balance += winAmount;

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
    
    if (gameState.currentMultiplier > gameState.stats.bestMultiplier) {
        gameState.stats.bestMultiplier = gameState.currentMultiplier;
    }

    // Save data
    localStorage.setItem('balance', gameState.balance);
    localStorage.setItem('gameHistory', JSON.stringify(gameState.gameHistory));
    localStorage.setItem('stats', JSON.stringify(gameState.stats));

    // Update UI
    document.getElementById('crashMessage').textContent = 'CASHED OUT!';
    document.getElementById('currentMultiplier').classList.remove('crashed');
    
    showNotification(`✅ Won $${(winAmount - gameState.currentBet).toFixed(2)}!`, 'success');
    
    endGame();
}

function crash() {
    gameState.gameActive = false;

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

    if (gameState.currentMultiplier > gameState.stats.bestMultiplier) {
        gameState.stats.bestMultiplier = gameState.currentMultiplier;
    }

    // Save data
    localStorage.setItem('balance', gameState.balance);
    localStorage.setItem('gameHistory', JSON.stringify(gameState.gameHistory));
    localStorage.setItem('stats', JSON.stringify(gameState.stats));

    // Update UI
    document.getElementById('crashMessage').textContent = '💥 CRASHED!';
    document.getElementById('currentMultiplier').classList.add('crashed');
    
    showNotification(`❌ Lost $${gameState.currentBet.toFixed(2)}!`, 'error');
    
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
            allMultipliers: []
        };

        localStorage.setItem('balance', gameState.balance);
        localStorage.setItem('gameHistory', JSON.stringify(gameState.gameHistory));
        localStorage.setItem('stats', JSON.stringify(gameState.stats));

        updateDisplay();
        showNotification('Stats reset successfully!', 'success');
    }
}
