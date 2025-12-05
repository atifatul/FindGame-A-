import "./style.css";
import Phaser from "phaser";
import backgroundImage from "./background.png";
import spriteSheet from "./spritesheet5.png";

// --- SOUND GENERATOR  ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === "pop") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      1200,
      audioCtx.currentTime + 0.1
    );
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.1
    );
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === "error") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === "win") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } else if (type === "gameover") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
}

// --- GAME VARIABLES ---
let score = 0;
let targetScore = 5;
let lives = 3;
let maxLives = 3;
let timerEvent;
let timeElapsed = 0;
let timerText;
let stars = [];
let hearts = [];
let bubbles = [];
let isWaveClearing = false;
let isGameOver = false;
let isGameRunning = false;
let hasShownInstructions = false;
let rotateContainer;

function preload() {
  this.load.image("background", backgroundImage);
  this.load.spritesheet("sprites", spriteSheet, {
    frameWidth: 118,
    frameHeight: 88,
  });
}

function create() {
  // Background
  let bg = this.add.image(400, 225, "background");
  bg.setDisplaySize(800, 450);

  createAnimations(this);
  spawnAmbientCreatures(this);
  createUI(this);

  // --- Rotate Screen Message Setup ---
  createRotateOverlay(this);

  // Game start logic
  if (!hasShownInstructions) {
    showStartScreen(this);
    hasShownInstructions = true;
  } else {
    startGameLogic(this);
  }

  // Event listener for resizing/orientation change
  this.scale.on(
    "resize",
    (gameSize, baseSize, displaySize, previousWidth, previousHeight) => {
      checkOrientation(this);
    }
  );

  // Initial Check
  checkOrientation(this);
}

function update() {
  if (isGameRunning) {
    bubbles.forEach((b, index) => {
      if (b.active) {
        b.y += Math.sin(this.time.now / 500 + index) * 0.5;
      }
    });
  }
}

// --- CONFIGURATION ---
const config = {
  type: Phaser.AUTO,
  parent: "app",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 450,
  },
  dom: {
    createContainer: true,
  },
  render: { pixelArt: false, antialias: true, roundPixels: true },
  backgroundColor: "#006994",
  physics: { default: "arcade", arcade: { debug: false } },
  scene: { preload: preload, create: create, update: update },
};

const game = new Phaser.Game(config);

// --- NEW ORIENTATION LOGIC ---

function createRotateOverlay(scene) {
  rotateContainer = scene.add.container(0, 0);
  rotateContainer.setVisible(false);
  rotateContainer.setDepth(1000);

  let overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 1);
  overlay.fillRect(0, 0, 800, 450);
  overlay.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, 800, 450),
    Phaser.Geom.Rectangle.Contains
  );

  let icon = scene.add
    .text(400, 180, "📱 ➡️ 🔄", {
      fontSize: "80px",
    })
    .setOrigin(0.5);

  let text = scene.add
    .text(400, 280, "Please Rotate Your Device", {
      fontSize: "32px",
      fontFamily: "Arial",
      color: "#ffffff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);

  rotateContainer.add([overlay, icon, text]);
}

function checkOrientation(scene) {
  if (window.innerWidth < window.innerHeight) {
    if (isGameRunning) {
      scene.physics.pause();
      if (timerEvent) timerEvent.paused = true;
    }
    if (rotateContainer) rotateContainer.setVisible(true);
  } else {
    if (isGameRunning) {
      scene.physics.resume();
      if (timerEvent) timerEvent.paused = false;
    }
    if (rotateContainer) rotateContainer.setVisible(false);
  }
}

function spawnWave(scene) {
  if (isGameOver || !isGameRunning) return;

  bubbles = [];
  isWaveClearing = false;

  let positions = [200, 330, 470, 600];
  Phaser.Utils.Array.Shuffle(positions);

  let letters = ["A", "B", "C", "D"];
  Phaser.Utils.Array.Shuffle(letters);

  for (let i = 0; i < 4; i++) {
    let x = positions[i];
    let y = Phaser.Math.Between(200, 350);
    let letter = letters[i];
    let bubble = createBubble(scene, x, y, letter);
    bubbles.push(bubble);
  }
}

function createBubble(scene, x, y, text) {
  let container = scene.add.container(x, 500);

  let circle = scene.add.graphics();
  circle.fillStyle(0x44aaff, 0.6);
  circle.fillCircle(0, 0, 50);
  circle.lineStyle(3, 0xffffff, 0.8);
  circle.strokeCircle(0, 0, 50);

  let shine = scene.add.graphics();
  shine.fillStyle(0xffffff, 0.4);
  shine.fillEllipse(-20, -20, 15, 10);

  let label = scene.add
    .text(0, 0, text, {
      fontSize: "48px",
      fontFamily: "Arial",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setResolution(2);

  container.add([circle, shine, label]);
  container.setInteractive(
    new Phaser.Geom.Circle(0, 0, 80),
    Phaser.Geom.Circle.Contains
  );

  container.on("pointerdown", () => {
    if (isWaveClearing || isGameOver || !isGameRunning) return;
    if (rotateContainer && rotateContainer.visible) return;

    if (text === "A") {
      handleCorrect(scene, container);
    } else {
      handleWrong(scene, container);
    }
  });

  scene.tweens.add({
    targets: container,
    y: y,
    duration: 800,
    ease: "Back.out",
  });

  return container;
}

function showStartScreen(scene) {
  let uiContainer = scene.add.container(0, 0);

  let overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.85);
  overlay.fillRect(0, 0, 800, 450);

  let header = scene.add
    .text(400, 100, "INSTRUCTIONS", {
      fontSize: "28px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setResolution(2);

  let title = scene.add
    .text(400, 160, "Find the Letter 'A'", {
      fontSize: "52px",
      fontFamily: "Arial",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setResolution(2);

  let instr = scene.add
    .text(
      400,
      240,
      "Pop only bubbles with 'A'\nBe careful! You have 3 lives ❤️",
      {
        fontSize: "24px",
        fontFamily: "Arial",
        color: "#dddddd",
        align: "center",
        lineSpacing: 10,
      }
    )
    .setOrigin(0.5)
    .setResolution(2);

  let startBtn = scene.add
    .text(400, 340, "▶ START GAME", {
      fontSize: "36px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#28a745",
      padding: { x: 30, y: 15 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setResolution(2);

  startBtn.on("pointerover", () => startBtn.setScale(1.1));
  startBtn.on("pointerout", () => startBtn.setScale(1));

  startBtn.on("pointerdown", () => {
    if (rotateContainer && rotateContainer.visible) return;

    if (!scene.scale.isFullscreen) {
      scene.scale.startFullscreen();
    }

    uiContainer.destroy();
    startGameLogic(scene);
    setTimeout(() => {
      checkOrientation(scene);
    }, 100);
  });

  uiContainer.add([overlay, header, title, instr, startBtn]);
}

function startGameLogic(scene) {
  isGameRunning = true;
  spawnWave(scene);

  timerEvent = scene.time.addEvent({
    delay: 1000,
    callback: () => {
      if (
        score < targetScore &&
        !isGameOver &&
        isGameRunning &&
        (!rotateContainer || !rotateContainer.visible)
      ) {
        timeElapsed++;
        timerText.setText("Time: " + formatTime(timeElapsed));
      }
    },
    loop: true,
  });
}

// --- HELPER FUNCTIONS ---

function createUI(scene) {
  for (let i = 0; i < targetScore; i++) {
    let starGfx = scene.add.graphics();
    drawStar(starGfx, 0xffffff, false);
    starGfx.x = 40 + i * 40;
    starGfx.y = 40;
    stars.push(starGfx);
  }

  timerText = scene.add
    .text(400, 40, "Time: 00:00", {
      fontSize: "24px",
      fill: "#fff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setResolution(2);

  let savedRecord = localStorage.getItem("bubble_pop_record");
  let recordText = savedRecord
    ? `Best: ${formatTime(savedRecord)}`
    : "Best: --:--";
  scene.add
    .text(400, 70, recordText, {
      fontSize: "16px",
      fill: "#ffff00",
      stroke: "#000",
      strokeThickness: 2,
    })
    .setOrigin(0.5)
    .setResolution(2);

  scene.add
    .text(650, 40, "Lives:", {
      fontSize: "20px",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 2,
    })
    .setOrigin(0.5)
    .setResolution(2);
  for (let i = 0; i < maxLives; i++) {
    let heart = scene.add
      .text(700 + i * 35, 40, "❤️", { fontSize: "28px" })
      .setOrigin(0.5)
      .setResolution(2);
    hearts.push(heart);
  }

  // ---  Fullscreen Toggle Button (Mobile Fix) ---

  let fsButton = scene.add
    .text(760, 410, "⛶", {
      fontSize: "30px",
      color: "#ffffff",
      backgroundColor: "#00000055",
      padding: { x: 8, y: 4 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(100);

  fsButton.on("pointerdown", () => {
    if (scene.scale.isFullscreen) {
      scene.scale.stopFullscreen();
    } else {
      scene.scale.startFullscreen();
    }
  });
}

function drawStar(graphics, color, filled) {
  graphics.clear();
  graphics.lineStyle(2, 0x000000);
  if (filled) graphics.fillStyle(color, 1);

  const points = 5;
  const outerRadius = 15;
  const innerRadius = 7;
  let angle = -Math.PI / 2;
  const step = Math.PI / points;

  graphics.beginPath();

  for (let i = 0; i < points; i++) {
    graphics.lineTo(
      Math.cos(angle) * outerRadius,
      Math.sin(angle) * outerRadius
    );
    angle += step;
    graphics.lineTo(
      Math.cos(angle) * innerRadius,
      Math.sin(angle) * innerRadius
    );
    angle += step;
  }

  graphics.closePath();
  if (filled) graphics.fillPath();
  graphics.strokePath();
}

function handleCorrect(scene, targetBubble) {
  playSound("pop");
  isWaveClearing = true;
  drawStar(stars[score], 0x00ff00, true);
  score++;

  scene.tweens.add({
    targets: targetBubble,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 0,
    duration: 200,
    onComplete: () => targetBubble.destroy(),
  });

  bubbles.forEach((b) => {
    if (b !== targetBubble) {
      scene.tweens.add({
        targets: b,
        y: -100,
        duration: 1000,
        ease: "Back.in",
        onComplete: () => {
          b.destroy();
        },
      });
    }
  });

  if (score >= targetScore) {
    if (timerEvent) timerEvent.remove();
    saveRecord(timeElapsed);
    setTimeout(() => showWinScreen(scene), 1000);
  } else {
    setTimeout(() => spawnWave(scene), 1200);
  }
}

function handleWrong(scene, targetBubble) {
  if (isGameOver) return;
  playSound("error");

  scene.tweens.add({
    targets: targetBubble,
    x: targetBubble.x + 10,
    duration: 50,
    yoyo: true,
    repeat: 5,
  });

  lives--;

  if (lives >= 0 && lives < hearts.length) {
    hearts[lives].setText("💔");
    scene.tweens.add({
      targets: hearts[lives],
      alpha: 0.5,
      scale: 0.8,
      duration: 300,
    });
  }

  if (lives <= 0) {
    isGameOver = true;
    if (timerEvent) timerEvent.remove();
    setTimeout(() => showGameOverScreen(scene), 800);
  }
}

function showWinScreen(scene) {
  let overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, 800, 450);

  scene.add
    .text(400, 150, "YOU WON!", {
      fontSize: "64px",
      fontFamily: "Arial",
      color: "#00ff00",
      stroke: "#fff",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setResolution(2);

  scene.add
    .text(400, 230, `Time: ${formatTime(timeElapsed)}`, {
      fontSize: "32px",
      fontFamily: "Arial",
      color: "#ffffff",
    })
    .setOrigin(0.5)
    .setResolution(2);

  createRestartButton(scene, "🔄 Play Again", "#00ff00");
  playSound("win");
}

function showGameOverScreen(scene) {
  let overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, 800, 450);

  scene.add
    .text(400, 150, "GAME OVER", {
      fontSize: "64px",
      fontFamily: "Arial",
      color: "#ff0000",
      stroke: "#fff",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setResolution(2);

  scene.add
    .text(400, 230, "Out of Lives!", {
      fontSize: "32px",
      fontFamily: "Arial",
      color: "#ffffff",
    })
    .setOrigin(0.5)
    .setResolution(2);

  createRestartButton(scene, "🔄 Try Again", "#ff0000");
  playSound("gameover");
}

function createRestartButton(scene, text, hoverColor) {
  let btn = scene.add
    .text(400, 320, text, {
      fontSize: "40px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#006994",
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setResolution(2);

  btn.on("pointerover", () => {
    btn.setStyle({ fill: hoverColor, backgroundColor: "#005c82" });
  });
  btn.on("pointerout", () => {
    btn.setStyle({ fill: "#ffffff", backgroundColor: "#006994" });
  });
  btn.on("pointerdown", () => {
    if (!scene.scale.isFullscreen) {
      scene.scale.startFullscreen();
    }
    restartGame(scene);
  });
  return btn;
}

function restartGame(scene) {
  score = 0;
  lives = 3;
  timeElapsed = 0;
  isWaveClearing = false;
  isGameOver = false;
  isGameRunning = false;
  bubbles = [];
  stars = [];
  hearts = [];
  scene.scene.restart();
}

function createAnimations(scene) {
  if (!scene.anims.exists("swim_right")) {
    scene.anims.create({
      key: "swim_right",
      frames: scene.anims.generateFrameNumbers("sprites", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (!scene.anims.exists("swim_left")) {
    scene.anims.create({
      key: "swim_left",
      frames: scene.anims.generateFrameNumbers("sprites", {
        start: 6,
        end: 11,
      }),
      frameRate: 8,
      repeat: -1,
    });
  }
}

function spawnAmbientCreatures(scene) {
  for (let i = 0; i < 5; i++) {
    let startFromLeft = Math.random() > 0.5;

    let startX, endX, animKey;

    if (startFromLeft) {
      startX = -150;
      endX = 950;
      animKey = "swim_right";
    } else {
      startX = 950;
      endX = -150;
      animKey = "swim_left";
    }

    let y = Phaser.Math.Between(50, 400);

    let fish = scene.add.sprite(startX, y, "sprites").play(animKey);
    fish.setScale(0.4);

    scene.tweens.add({
      targets: fish,
      x: endX,
      duration: Phaser.Math.Between(15000, 25000),
      repeat: -1,
      onRepeat: () => {
        let nextFromLeft = Math.random() > 0.5;
        if (nextFromLeft) {
          fish.x = -150;
          fish.play("swim_right");
          scene.tweens.add({
            targets: fish,
            x: 950,
            duration: Phaser.Math.Between(15000, 25000),
          });
        } else {
          fish.x = 950;
          fish.play("swim_left");
          scene.tweens.add({
            targets: fish,
            x: -150,
            duration: Phaser.Math.Between(15000, 25000),
          });
        }
        fish.y = Phaser.Math.Between(50, 400);
      },
    });
  }
}

function formatTime(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = seconds % 60;
  return `${min < 10 ? "0" + min : min}:${sec < 10 ? "0" + sec : sec}`;
}

function saveRecord(currentSeconds) {
  let best = localStorage.getItem("bubble_pop_record");
  if (!best || currentSeconds < parseInt(best)) {
    localStorage.setItem("bubble_pop_record", currentSeconds);
  }
}
