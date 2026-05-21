const scenes = {
  home: document.querySelector('[data-scene="home"]'),
  loading: document.querySelector('[data-scene="loading"]'),
  levels: document.querySelector('[data-scene="levels"]'),
  mine: document.querySelector('[data-scene="mine"]'),
  whale: document.querySelector('[data-scene="whale"]'),
  badges: document.querySelector('[data-scene="badges"]'),
  outing: document.querySelector('[data-scene="outing"]'),
  diary: document.querySelector('[data-scene="diary"]'),
  victory: document.querySelector('[data-scene="victory"]'),
  failure: document.querySelector('[data-scene="failure"]'),
  encyclopedia: document.querySelector('[data-scene="encyclopedia"]'),
  card: document.querySelector('[data-scene="card"]'),
  account: document.querySelector('[data-scene="account"]'),
};

const startBtn = document.querySelector("#startBtn");
const agree = document.querySelector("#agree");
const toast = document.querySelector("#toast");
const progressText = document.querySelector("#progressText");
const progressFill = document.querySelector("#progressFill");
const progressTrack = document.querySelector(".progress-track");
const loadingStatus = document.querySelector("#loadingStatus");
const replayBtn = document.querySelector("#replayBtn");
const backHomeBtn = document.querySelector("#backHomeBtn");
const continueBtn = document.querySelector("#continueBtn");
const levelCards = document.querySelectorAll(".level-card");
const mineBoard = document.querySelector("#mineBoard");
const mineEffect = document.querySelector("#mineEffect");
const mineBackBtn = document.querySelector("#mineBackBtn");
const bellBtn = document.querySelector("#bellBtn");
const dispelBtn = document.querySelector("#dispelBtn");
const skipWhaleBtn = document.querySelector("#skipWhaleBtn");
const mineBellCounter = document.querySelector("#mineBellCounter");
const mineScoreCounter = document.querySelector("#mineScoreCounter");

let toastTimer = 0;
let progressTimer = 0;
let audioContext;
let bgmNodes = null;
let bgmTimer = 0;
let bgmStep = 0;
let tileResults = [];
let revealedTiles = 0;
let noteScore = 320;
let bellChances = 3;
let currentScene = "home";
let previousScene = "home";

const loadingCopy = [
  "正在敲响保圣寺的晨钟......",
  "正在唤醒保罗寺的灵光......",
  "瑞兽甪端正在靠近......",
  "守护之旅即将开始......",
];

const mineTokenAssets = {
  safe: {
    icon: "./assets/effects/safe_icon.png",
    fx: "./assets/effects/water_ripple.svg",
    alt: "安全区域",
  },
  note: {
    icon: "./assets/effects/note_icon.png",
    fx: "./assets/effects/gold_sparkles.svg",
    alt: "音律之声",
  },
  whale: {
    icon: "./assets/effects/whale_icon.png",
    fx: "./assets/effects/warning_ring.svg",
    alt: "鲸鱼危险",
  },
  luduan: {
    icon: "./assets/effects/luduan_icon.png",
    fx: "./assets/effects/click_burst.svg",
    alt: "甪端惊喜",
  },
};

function fitScenes() {
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  document.querySelectorAll(".scene").forEach((scene) => {
    const designWidth = Number(scene.dataset.designWidth || 941);
    const designHeight = Number(scene.dataset.designHeight || 1672);
    scene.style.width = `${viewportWidth}px`;
    scene.style.height = `${(viewportWidth * designHeight) / designWidth}px`;
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function ensureSceneImage(name) {
  const image = scenes[name]?.querySelector(".scene-art");
  if (!image || image.src || !image.dataset.src) {
    return;
  }
  image.src = image.dataset.src;
}

function preloadSceneImage(name) {
  const image = scenes[name]?.querySelector(".scene-art");
  if (!image?.dataset.src || image.src) {
    return;
  }
  const preload = new Image();
  preload.src = image.dataset.src;
}

function preloadMineTokenAssets() {
  Object.values(mineTokenAssets).forEach((asset) => {
    [asset.icon, asset.fx].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  });
}

function showScene(name, options = {}) {
  if (!scenes[name]) {
    return;
  }
  ensureSceneImage(name);
  if (!options.skipHistory && name !== currentScene) {
    previousScene = currentScene;
  }
  Object.values(scenes).forEach((scene) => scene.classList.remove("is-active"));
  scenes[name].classList.add("is-active");
  currentScene = name;
}

function getAudioContext() {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function unlockAudio() {
  try {
    getAudioContext();
  } catch {
    // Some mobile browsers keep audio locked until a later tap.
  }
}

function startBackgroundMusic() {
  try {
    if (bgmNodes) {
      getAudioContext();
      return;
    }

    const context = getAudioContext();
    const master = context.createGain();
    const musicBus = context.createGain();
    const delay = context.createDelay();
    const feedback = context.createGain();
    const filter = context.createBiquadFilter();
    const padNodes = [];

    master.gain.value = 0.22;
    musicBus.gain.value = 0.72;
    filter.type = "lowpass";
    filter.frequency.value = 1480;
    delay.delayTime.value = 0.42;
    feedback.gain.value = 0.16;

    musicBus.connect(filter).connect(master).connect(context.destination);
    musicBus.connect(delay).connect(feedback).connect(delay);
    delay.connect(filter);

    [146.83, 220, 293.66].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index % 2 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.042 : 0.018;
      oscillator.connect(gain).connect(musicBus);
      oscillator.start();
      padNodes.push(oscillator, gain);
    });

    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
    const pattern = [0, 2, 4, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, 0, 1];

    const playPluck = (frequency, time, accent = false) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const pluckFilter = context.createBiquadFilter();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.996, time + 0.9);
      pluckFilter.type = "lowpass";
      pluckFilter.frequency.setValueAtTime(accent ? 1900 : 1380, time);
      pluckFilter.frequency.exponentialRampToValueAtTime(520, time + 0.9);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(accent ? 0.13 : 0.09, time + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.28);
      oscillator.connect(pluckFilter).connect(gain).connect(musicBus);
      oscillator.start(time);
      oscillator.stop(time + 1.38);
    };

    const playFlute = (frequency, time) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const fluteFilter = context.createBiquadFilter();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.frequency.linearRampToValueAtTime(frequency * 1.006, time + 1.1);
      fluteFilter.type = "lowpass";
      fluteFilter.frequency.value = 1260;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.26);
      gain.gain.linearRampToValueAtTime(0.042, time + 1.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.15);
      oscillator.connect(fluteFilter).connect(gain).connect(musicBus);
      oscillator.start(time);
      oscillator.stop(time + 2.35);
    };

    const scheduleMusic = () => {
      const now = context.currentTime + 0.05;
      const noteIndex = pattern[bgmStep % pattern.length];
      playPluck(scale[noteIndex], now, bgmStep % 8 === 0);
      if (bgmStep % 4 === 2) {
        playPluck(scale[(noteIndex + 2) % scale.length] * 0.5, now + 0.16, false);
      }
      if (bgmStep % 16 === 4) {
        playFlute(scale[5], now + 0.06);
      }
      if (bgmStep % 16 === 12) {
        playFlute(scale[4], now + 0.04);
      }
      bgmStep += 1;
    };

    scheduleMusic();
    bgmTimer = window.setInterval(scheduleMusic, 760);
    bgmNodes = { master, musicBus, filter, delay, feedback, padNodes };
  } catch {
    // Background audio is optional; gameplay remains intact if audio is unavailable.
  }
}

function vibrateDevice(pattern = [80, 30, 80]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function playBell() {
  try {
    const context = getAudioContext();
    const now = context.currentTime;
    const master = audioContext.createGain();
    const filter = context.createBiquadFilter();
    const delay = context.createDelay();
    const feedback = context.createGain();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.46, now + 0.035);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 4.4);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(360, now + 3.6);
    delay.delayTime.value = 0.28;
    feedback.gain.value = 0.22;

    master.connect(filter).connect(context.destination);
    master.connect(delay).connect(feedback).connect(delay);
    delay.connect(filter);

    [98, 147, 196, 247, 294, 392].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency * (1 + index * 0.003), now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, now + 3.8);
      gain.gain.setValueAtTime(index === 0 ? 1 : 0.42 / (index * 0.5 + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6 + index * 0.12);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + index * 0.012);
      oscillator.stop(now + 4.5);
    });

    vibrateDevice([90, 36, 120]);
  } catch {
    // Audio is a small enhancement; interaction still works if the browser blocks it.
  }
}

function playNote() {
  try {
    const context = getAudioContext();
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    master.connect(context.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
      gain.gain.setValueAtTime(0.3, now + index * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62 + index * 0.05);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + index * 0.055);
      oscillator.stop(now + 0.76 + index * 0.05);
    });
  } catch {
    // Note feedback is optional.
  }
}

function playSafeTile() {
  try {
    const context = getAudioContext();
    const now = context.currentTime;
    const master = context.createGain();
    const filter = context.createBiquadFilter();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.54);
    master.connect(filter).connect(context.destination);

    [392, 587.33].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.05);
      gain.gain.setValueAtTime(0.22, now + index * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46 + index * 0.04);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + index * 0.05);
      oscillator.stop(now + 0.58 + index * 0.04);
    });
  } catch {
    // Tile feedback is optional.
  }
}

function playWhaleAlert() {
  try {
    const context = getAudioContext();
    const now = context.currentTime;
    const master = context.createGain();
    const filter = context.createBiquadFilter();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.2, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(820, now);
    filter.frequency.exponentialRampToValueAtTime(230, now + 0.88);
    master.connect(filter).connect(context.destination);

    [174.61, 130.81].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + 0.82);
      gain.gain.setValueAtTime(index === 0 ? 0.16 : 0.22, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + 1);
    });
  } catch {
    // Warning sound is optional.
  }
}

function playLuduanSurprise() {
  try {
    const context = getAudioContext();
    const now = context.currentTime;
    const master = context.createGain();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.016);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    master.connect(context.destination);

    [659.25, 783.99, 987.77, 1174.66].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
      gain.gain.setValueAtTime(0.18, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7 + index * 0.08);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + 0.92 + index * 0.08);
    });
  } catch {
    // Surprise sound is optional.
  }
}

function setProgress(value) {
  const rounded = Math.min(100, Math.max(0, Math.round(value)));
  progressText.textContent = `${rounded}%`;
  progressFill.style.width = `${rounded}%`;
  progressTrack.setAttribute("aria-valuenow", String(rounded));
  loadingStatus.textContent = loadingCopy[Math.min(loadingCopy.length - 1, Math.floor(rounded / 28))];
}

function shuffle(items) {
  return items
    .map((value) => ({ value, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map((item) => item.value);
}

function resetMineGame() {
  revealedTiles = 0;
  noteScore = 320;
  bellChances = 3;
  updateMineStats();
  tileResults = shuffle([
    "safe",
    "safe",
    "safe",
    "safe",
    "safe",
    "safe",
    "safe",
    "note",
    "note",
    "note",
    "note",
    "whale",
    "whale",
    "whale",
    "luduan",
    "luduan",
  ]);

  mineBoard.innerHTML = "";
  mineEffect.className = "mine-effect";
  mineEffect.textContent = "";

  tileResults.forEach((result, index) => {
    const tile = document.createElement("button");
    tile.className = "mine-tile";
    tile.type = "button";
    tile.setAttribute("aria-label", `探索第 ${index + 1} 个图块`);
    tile.dataset.index = String(index);
    tile.dataset.result = result;
    tile.addEventListener("click", () => revealTile(tile));
    mineBoard.appendChild(tile);
  });
}

function showMineEffect(text, type) {
  mineEffect.textContent = text;
  mineEffect.className = `mine-effect is-visible ${type}`;
  window.setTimeout(() => mineEffect.classList.remove("is-visible"), 900);
}

function updateMineStats() {
  mineBellCounter.textContent = `${bellChances}/3`;
  mineScoreCounter.textContent = String(noteScore);
  mineScoreCounter.classList.add("is-bumping");
  window.setTimeout(() => mineScoreCounter.classList.remove("is-bumping"), 260);
}

function renderTileToken(type, bonusText = "") {
  const token = mineTokenAssets[type];
  if (!token) {
    return "";
  }

  const bonus = bonusText ? `<span class="tile-token-bonus">${bonusText}</span>` : "";
  return `
    <span class="mine-token token-${type}">
      <img class="tile-token-fx" src="${token.fx}" alt="" aria-hidden="true" />
      <img class="tile-token-icon" src="${token.icon}" alt="${token.alt}" />
      ${bonus}
    </span>
  `;
}

function revealTile(tile) {
  if (tile.classList.contains("is-revealed")) {
    return;
  }

  const result = tile.dataset.result;
  tile.classList.add("is-revealed", `is-${result}`);
  revealedTiles += 1;

  if (result === "safe") {
    tile.innerHTML = renderTileToken("safe");
    showMineEffect("安全区域", "safe");
    playSafeTile();
  }

  if (result === "note") {
    noteScore += 20;
    updateMineStats();
    tile.innerHTML = renderTileToken("note", "+20");
    showMineEffect("音律之声 +20", "note");
    playNote();
  }

  if (result === "whale") {
    tile.innerHTML = renderTileToken("whale");
    showMineEffect("发现鲸鱼！", "whale");
    playWhaleAlert();
    vibrateDevice([60, 30, 60]);
    window.setTimeout(() => {
      if (bellChances <= 0) {
        showScene("failure");
      } else {
        showScene("whale");
      }
    }, 720);
    return;
  }

  if (result === "luduan") {
    noteScore += 50;
    updateMineStats();
    tile.innerHTML = renderTileToken("luduan", "+50");
    showMineEffect("甪端惊喜 +50", "luduan");
    playLuduanSurprise();
    vibrateDevice([35, 24, 45]);
  }

  if (revealedTiles >= 13) {
    showMineEffect("守护完成！", "safe");
    window.setTimeout(() => showScene("victory"), 820);
  }
}

function enterMineScene() {
  resetMineGame();
  showScene("mine");
  preloadSceneImage("whale");
  preloadSceneImage("victory");
  preloadSceneImage("failure");
  showToast("开始探索甪直桥");
}

function startLoading() {
  window.clearInterval(progressTimer);
  replayBtn.classList.remove("is-visible");
  setProgress(0);
  showScene("loading");
  window.setTimeout(startBackgroundMusic, 260);

  let progress = 0;
  let levelsPreloaded = false;
  progressTimer = window.setInterval(() => {
    const step = progress < 72 ? 3 + Math.random() * 4 : 1 + Math.random() * 2.5;
    progress = Math.min(100, progress + step);
    setProgress(progress);

    if (!levelsPreloaded && progress >= 48) {
      levelsPreloaded = true;
      preloadSceneImage("levels");
    }

    if (progress >= 100) {
      window.clearInterval(progressTimer);
      loadingStatus.textContent = "晨钟已响，守护之旅准备就绪";
      window.setTimeout(() => {
        showScene("levels");
        window.setTimeout(playBell, 120);
      }, 460);
      if (navigator.vibrate) {
        navigator.vibrate([45, 25, 45]);
      }
    }
  }, 150);
}

startBtn.addEventListener("click", () => {
  if (!agree.checked) {
    showToast("请先勾选同意用户协议和隐私政策");
    return;
  }
  unlockAudio();
  startLoading();
});

replayBtn.addEventListener("click", () => {
  showScene("home");
  showToast("已回到开始页面");
});

backHomeBtn.addEventListener("click", () => {
  window.clearInterval(progressTimer);
  showScene("home");
  showToast("已返回首页");
});

continueBtn.addEventListener("click", () => {
  startBackgroundMusic();
  enterMineScene();
});

levelCards.forEach((levelCard) => {
  levelCard.addEventListener("click", () => {
    startBackgroundMusic();
    enterMineScene();
  });
});

mineBackBtn.addEventListener("click", () => {
  showScene("levels");
  showToast("已返回关卡选择");
});

bellBtn.addEventListener("click", () => {
  bellChances = Math.max(0, bellChances - 1);
  updateMineStats();
  bellBtn.classList.remove("is-ringing");
  void bellBtn.offsetWidth;
  bellBtn.classList.add("is-ringing");
  playBell();
  if (bellChances === 0) {
    showToast("钟声机会已用完，小心鲸鱼");
  } else {
    showToast(`钟声已响，剩余 ${bellChances}/3 次`);
  }
});

dispelBtn.addEventListener("click", () => {
  if (bellChances <= 0) {
    showScene("failure");
    showToast("钟声机会已用完");
    return;
  }
  bellChances = Math.max(0, bellChances - 1);
  updateMineStats();
  bellBtn.classList.remove("is-ringing");
  void bellBtn.offsetWidth;
  bellBtn.classList.add("is-ringing");
  playBell();
  showScene("mine");
  showToast("鲸鱼被钟声驱散，继续守护水域");
});

skipWhaleBtn.addEventListener("click", () => {
  showScene("mine");
  showToast("暂不使用钟声，返回棋盘");
});

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.addEventListener("click", (event) => {
  const backButton = event.target.closest("[data-back]");
  if (backButton) {
    showScene(previousScene || "home", { skipHistory: true });
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (!goButton) {
    return;
  }

  const target = goButton.dataset.go;
  if (target === "mine") {
    startBackgroundMusic();
    enterMineScene();
    return;
  }

  showScene(target);
});

fitScenes();
ensureSceneImage("home");
preloadMineTokenAssets();
window.addEventListener("resize", fitScenes);
window.visualViewport?.addEventListener("resize", fitScenes);
document.addEventListener("gesturestart", (event) => event.preventDefault());

if (location.hash === "#loading") {
  startLoading();
}

if (location.hash === "#levels") {
  showScene("levels");
}

if (location.hash === "#mine") {
  enterMineScene();
}

if (location.hash === "#whale") {
  showScene("whale");
}

[
  "badges",
  "outing",
  "diary",
  "victory",
  "failure",
  "encyclopedia",
  "card",
  "account",
].forEach((name) => {
  if (location.hash === `#${name}`) {
    showScene(name);
  }
});
