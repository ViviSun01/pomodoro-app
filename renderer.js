// ========================
// CONFIG & STATE
// ========================

const CONFIG = {
  defaultDuration: 25
};

let config = {
  durationPreset: CONFIG.defaultDuration,
  theme: 'light'
};

let lampState = 'off'; // 'off' | 'on'
let timeLeft = config.durationPreset * 60;
let elapsed = 0;
let sessionStartTime = null;
let interval = null;
let audioContext = null;

// ========================
// DOM ELEMENTS
// ========================

const appFrame = document.getElementById('appFrame');
const statusBar = document.getElementById('statusBar');
const lampShade = document.getElementById('lampShade');
const lampBase = document.getElementById('lampBase');
const lampLight = document.getElementById('lampLight');
const lampDot = document.getElementById('lampDot');
const lampGlow = document.getElementById('lampGlow');
const timerDisplay = document.getElementById('timerDisplay');
const turnOnBtn = document.getElementById('turnOnBtn');
const turnOnText = document.getElementById('turnOnText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const durationInput = document.getElementById('durationInput');
const themeBtns = document.querySelectorAll('.theme-btn');
const toastEl = document.getElementById('toast');

// ========================
// Figma IMAGE RESOURCES
// ========================

const LAMP_RESOURCES = {
  // Light theme - Lamp OFF (lamp02)
  'light-off-shade': 'https://www.figma.com/api/mcp/asset/49724f87-699b-4c41-9778-6950175e42b6',
  'light-off-dot': 'https://www.figma.com/api/mcp/asset/5df685ba-a550-4d5d-a015-22ac13723260',

  // Light theme - Lamp ON (Component 1)
  'light-on-shade': 'https://www.figma.com/api/mcp/asset/93fe1c5f-5e16-49ae-a6d7-c2e24b50b51d',
  'light-on-base': 'https://www.figma.com/api/mcp/asset/2f36f148-8def-4541-9ee6-798d84a409ea',
  'light-on-light': 'https://www.figma.com/api/mcp/asset/5b40551e-f93c-4612-a547-ba89b435a1b5',
  'light-on-dot': 'https://www.figma.com/api/mcp/asset/9aacf85f-d687-4657-9635-b0b3879850ce',

  // Dark theme - Lamp OFF (lamp04)
  'dark-off-shade': 'https://www.figma.com/api/mcp/asset/fa9c626f-defa-4db6-a93c-8b77aa3f584e',
  'dark-off-dot': 'https://www.figma.com/api/mcp/asset/62cc7b89-02f5-45c6-a81f-189af544b7af',

  // Dark theme - Lamp ON (lamp03)
  'dark-on-shade': 'https://www.figma.com/api/mcp/asset/24ec36d9-7c6f-4848-8e03-57a7ef425f7f',
  'dark-on-base': 'https://www.figma.com/api/mcp/asset/ef48f236-077d-4c0a-9eaa-d49cb6bbf3f0',
  'dark-on-light': 'https://www.figma.com/api/mcp/asset/c4407eda-3919-499d-b11f-0c824a8d28a1',
  'dark-on-dot': 'https://www.figma.com/api/mcp/asset/9bb94772-38af-4f9b-9d72-f47d55fe848c'
};

// Status bar colors
const STATUS_COLORS = {
  light: '#baa89a',
  dark: '#efebdf'
};

// ========================
// AUDIO - Web Audio API
// ========================

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'on') {
      // Warm lamp on sound - gentle fade in with sine wave
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(180, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    } else {
      // Lamp off sound - soft fade out
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio not supported or blocked
    console.log('Audio blocked');
  }
}

// ========================
// CONFIG MANAGEMENT
// ========================

function loadConfig() {
  const storedTheme = localStorage.getItem('lamp.theme');
  const storedDuration = localStorage.getItem('lamp.durationPreset');

  if (storedTheme) config.theme = storedTheme;
  if (storedDuration) config.durationPreset = parseInt(storedDuration, 10);
}

function saveConfig() {
  localStorage.setItem('lamp.theme', config.theme);
  localStorage.setItem('lamp.durationPreset', config.durationPreset);
}

// ========================
// THEME MANAGEMENT
// ========================

function applyTheme() {
  document.body.dataset.theme = config.theme;
  appFrame.dataset.theme = config.theme;
  statusBar.style.background = STATUS_COLORS[config.theme];

  themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === config.theme);
  });

  updateLampImages();
}

// ========================
// LAMP IMAGES
// ========================

function updateLampImages() {
  const prefix = config.theme;
  const isOn = lampState === 'on';

  lampShade.src = isOn
    ? LAMP_RESOURCES[`${prefix}-on-shade`]
    : LAMP_RESOURCES[`${prefix}-off-shade`];

  lampDot.src = isOn
    ? LAMP_RESOURCES[`${prefix}-on-dot`]
    : LAMP_RESOURCES[`${prefix}-off-dot`];

  // Only show base and light when on
  if (isOn) {
    lampBase.src = LAMP_RESOURCES[`${prefix}-on-base`];
    lampLight.src = LAMP_RESOURCES[`${prefix}-on-light`];
  }
}

// ========================
// LAMP STATE
// ========================

function turnOn() {
  lampState = 'on';
  appFrame.dataset.lamp = 'on';
  turnOnText.textContent = 'Turn Off';

  // Add turn-on animation class
  lampGlow.classList.add('lamp-glow-turning-on');
  lampBase.classList.add('lamp-turning-on');
  lampLight.classList.add('lamp-turning-on');

  // Play sound
  playSound('on');

  // Remove animation class after it completes
  setTimeout(() => {
    lampGlow.classList.remove('lamp-glow-turning-on');
    lampBase.classList.remove('lamp-turning-on');
    lampLight.classList.remove('lamp-turning-on');
    updateLampImages();
  }, 800);

  // Start timer
  elapsed = 0;
  sessionStartTime = Date.now();
  interval = setInterval(tick, 1000);
  updateDisplay();
}

function turnOff() {
  lampState = 'off';
  appFrame.dataset.lamp = 'off';
  turnOnText.textContent = 'Turn On';

  // Add turn-off animation class
  lampGlow.classList.add('lamp-turning-off');
  lampBase.classList.add('lamp-turning-off');
  lampLight.classList.add('lamp-turning-off');

  // Play sound
  playSound('off');

  // Stop timer
  clearInterval(interval);
  interval = null;

  // Remove animation class after it completes
  setTimeout(() => {
    lampGlow.classList.remove('lamp-turning-off');
    lampBase.classList.remove('lamp-turning-off');
    lampLight.classList.remove('lamp-turning-off');
    updateLampImages();
    updateDisplay();
  }, 500);
}

function toggleLamp() {
  if (lampState === 'on') {
    turnOff();
  } else {
    turnOn();
  }
}

// ========================
// TIMER
// ========================

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function tick() {
  if (lampState !== 'on') return;
  elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  updateDisplay();
}

function updateDisplay() {
  if (lampState === 'off') {
    timerDisplay.textContent = formatTime(timeLeft);
  } else {
    timerDisplay.textContent = formatTime(elapsed);
  }
}

// ========================
// TOAST
// ========================

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ========================
// EVENT LISTENERS
// ========================

turnOnBtn.addEventListener('click', toggleLamp);

settingsBtn.addEventListener('click', () => {
  durationInput.value = config.durationPreset;
  settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
  const newDuration = parseInt(durationInput.value, 10);
  if (newDuration >= 1 && newDuration <= 120) {
    config.durationPreset = newDuration;
    timeLeft = config.durationPreset * 60;
    saveConfig();
    if (lampState === 'off') {
      updateDisplay();
    }
  }
  settingsModal.classList.remove('active');
  showToast('Settings saved');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('active');
  }
});

themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    config.theme = btn.dataset.theme;
    applyTheme();
    saveConfig();
  });
});

// ========================
// INITIALIZE
// ========================

loadConfig();
applyTheme();
updateDisplay();
