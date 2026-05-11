const RADIUS = 45;
const TOTAL_LENGTH = 2 * Math.PI * RADIUS;

const DEFAULT_CONFIG = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreak: false,
  autoStartFocus: false
};

let config = { ...DEFAULT_CONFIG };
let currentMode = 'focus';
let state = 'idle';
let timeLeft = config.focusMinutes * 60;
let interval = null;
let focusCount = 0;

const timerEl = document.getElementById('timer');
const progressBar = document.getElementById('progressBar');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const modeLabel = document.getElementById('modeLabel');
const cycleInfoEl = document.getElementById('cycleInfo');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const confirmDialog = document.getElementById('confirmDialog');
const toastEl = document.getElementById('toast');

const modeBtns = document.querySelectorAll('.mode-btn');

function loadConfig() {
  const keys = ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'longBreakEvery', 'autoStartBreak', 'autoStartFocus'];
  keys.forEach(key => {
    const stored = localStorage.getItem(`pomodoro.${key}`);
    if (stored !== null) {
      if (key === 'autoStartBreak' || key === 'autoStartFocus') {
        config[key] = stored === 'true';
      } else {
        config[key] = parseInt(stored, 10);
      }
    }
  });
}

function saveConfig() {
  const keys = ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'longBreakEvery', 'autoStartBreak', 'autoStartFocus'];
  keys.forEach(key => {
    localStorage.setItem(`pomodoro.${key}`, config[key]);
  });
}

function getDuration(mode) {
  switch (mode) {
    case 'focus': return config.focusMinutes * 60;
    case 'shortBreak': return config.shortBreakMinutes * 60;
    case 'longBreak': return config.longBreakMinutes * 60;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateProgress() {
  const total = getDuration(currentMode);
  const progress = ((total - timeLeft) / total) * TOTAL_LENGTH;
  progressBar.style.strokeDashoffset = TOTAL_LENGTH - progress;
}

function updateDisplay() {
  timerEl.textContent = formatTime(timeLeft);
  updateProgress();
  updateCycleInfo();
}

function updateCycleInfo() {
  if (currentMode === 'focus') {
    const nextBreak = focusCount >= config.longBreakEvery ? '长休息' : '短休息';
    cycleInfoEl.textContent = `第 ${focusCount + 1} 次专注 · 下一个：${nextBreak}`;
  } else if (currentMode === 'shortBreak') {
    cycleInfoEl.textContent = `短休息中`;
  } else {
    cycleInfoEl.textContent = `长休息中`;
  }
}

function setMode(mode, force = false) {
  if (state === 'running' && !force) {
    showConfirm('切换模式将重置当前计时，是否继续？', () => {
      clearInterval(interval);
      state = 'idle';
      currentMode = mode;
      timeLeft = getDuration(mode);
      updateModeUI();
      updateDisplay();
      startBtn.textContent = '开始';
    });
    return;
  }

  clearInterval(interval);
  state = 'idle';
  currentMode = mode;
  timeLeft = getDuration(mode);
  updateModeUI();
  updateDisplay();
  startBtn.textContent = '开始';
}

function updateModeUI() {
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });
  updateModeLabel();
}

function updateModeLabel() {
  const labels = { focus: '专注时间', shortBreak: '短休息时间', longBreak: '长休息时间' };
  modeLabel.textContent = labels[currentMode];
}

function showConfirm(message, onOk) {
  document.getElementById('confirmMessage').textContent = message;
  confirmDialog.classList.add('active');

  const handleOk = () => {
    confirmDialog.classList.remove('active');
    cleanup();
    onOk();
  };

  const handleCancel = () => {
    confirmDialog.classList.remove('active');
    cleanup();
  };

  const cleanup = () => {
    document.getElementById('confirmOk').removeEventListener('click', handleOk);
    document.getElementById('confirmCancel').removeEventListener('click', handleCancel);
  };

  document.getElementById('confirmOk').addEventListener('click', handleOk);
  document.getElementById('confirmCancel').addEventListener('click', handleCancel);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function tick() {
  if (state !== 'running') return;

  timeLeft--;
  updateDisplay();

  if (timeLeft <= 0) {
    clearInterval(interval);
    state = 'idle';

    if (currentMode === 'focus') {
      focusCount++;
      window.electronAPI.showNotification('番茄钟', '专注结束！休息一下吧 🌿');

      const nextMode = focusCount >= config.longBreakEvery ? 'longBreak' : 'shortBreak';
      timeLeft = getDuration(nextMode);
      currentMode = nextMode;

      if (nextMode === 'longBreak') {
        focusCount = 0;
      }

      if (config.autoStartBreak) {
        state = 'running';
        interval = setInterval(tick, 1000);
        startBtn.textContent = '暂停';
      } else {
        startBtn.textContent = '开始';
      }

      updateModeUI();
      updateDisplay();

    } else {
      window.electronAPI.showNotification('番茄钟', '休息结束！继续加油 🍅');
      timeLeft = getDuration('focus');
      currentMode = 'focus';

      if (config.autoStartFocus) {
        state = 'running';
        interval = setInterval(tick, 1000);
        startBtn.textContent = '暂停';
      } else {
        startBtn.textContent = '开始';
      }

      updateModeUI();
      updateDisplay();
    }
  }
}

startBtn.addEventListener('click', () => {
  if (state === 'running') {
    state = 'paused';
    clearInterval(interval);
    startBtn.textContent = '继续';
  } else {
    state = 'running';
    interval = setInterval(tick, 1000);
    startBtn.textContent = '暂停';
  }
});

resetBtn.addEventListener('click', () => {
  clearInterval(interval);
  state = 'idle';
  timeLeft = getDuration(currentMode);
  startBtn.textContent = '开始';
  updateDisplay();
});

skipBtn.addEventListener('click', () => {
  if (currentMode === 'focus') {
    focusCount++;
    const nextMode = focusCount >= config.longBreakEvery ? 'longBreak' : 'shortBreak';
    if (nextMode === 'longBreak') focusCount = 0;
    timeLeft = getDuration(nextMode);
    currentMode = nextMode;
  } else {
    timeLeft = getDuration('focus');
    currentMode = 'focus';
  }
  clearInterval(interval);
  state = 'idle';
  startBtn.textContent = '开始';
  updateModeUI();
  updateDisplay();
  showToast('已跳过');
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

settingsBtn.addEventListener('click', () => {
  document.getElementById('focusMinutes').value = config.focusMinutes;
  document.getElementById('shortBreakMinutes').value = config.shortBreakMinutes;
  document.getElementById('longBreakMinutes').value = config.longBreakMinutes;
  document.getElementById('longBreakEvery').value = config.longBreakEvery;
  document.getElementById('autoStartBreak').checked = config.autoStartBreak;
  document.getElementById('autoStartFocus').checked = config.autoStartFocus;
  settingsModal.classList.add('active');
});

document.getElementById('cancelSettings').addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

document.getElementById('saveSettings').addEventListener('click', () => {
  const focusM = parseInt(document.getElementById('focusMinutes').value, 10);
  const shortM = parseInt(document.getElementById('shortBreakMinutes').value, 10);
  const longM = parseInt(document.getElementById('longBreakMinutes').value, 10);
  const every = parseInt(document.getElementById('longBreakEvery').value, 10);

  if ([focusM, shortM, longM, every].some(v => isNaN(v) || v < 1 || v > 180)) {
    showToast('请输入 1-180 之间的有效数字');
    return;
  }

  config.focusMinutes = focusM;
  config.shortBreakMinutes = shortM;
  config.longBreakMinutes = longM;
  config.longBreakEvery = every;
  config.autoStartBreak = document.getElementById('autoStartBreak').checked;
  config.autoStartFocus = document.getElementById('autoStartFocus').checked;

  saveConfig();

  if (state === 'idle') {
    timeLeft = getDuration(currentMode);
    updateDisplay();
  }

  settingsModal.classList.remove('active');
  showToast('设置已保存');
});

document.querySelectorAll('.stepper-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    const current = parseInt(target.value, 10) || 0;
    const delta = btn.classList.contains('plus') ? 1 : -1;
    const newVal = Math.max(1, Math.min(180, current + delta));
    target.value = newVal;
  });
});

loadConfig();
updateModeUI();
updateDisplay();