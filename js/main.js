class InputHandler {
  constructor() {
	this.keys = new Set();

	window.addEventListener("keydown", (event) => {
	  const key = event.key.toLowerCase();
	  const isMovementKey = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key);
	  const isActionKey = key === "enter" || event.code === "Space";

	  if (isMovementKey || isActionKey) {
		event.preventDefault();
	  }

	  this.keys.add(key);

	  if (event.code === "Space" || key === " ") {
		this.keys.add("space");
	  }
	});

	window.addEventListener("keyup", (event) => {
	  const key = event.key.toLowerCase();
	  this.keys.delete(key);

	  if (event.code === "Space" || key === " ") {
		this.keys.delete("space");
	  }
	});
  }

  isPressed(...candidates) {
	return candidates.some((key) => this.keys.has(key));
  }
}

class Entity {
  constructor(x, y, width, height, color) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.color = color;
  }

  draw(ctx) {
	ctx.fillStyle = this.color;
	ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  intersectsAABB(other) {
	return (
	  this.x < other.x + other.width &&
	  this.x + this.width > other.x &&
	  this.y < other.y + other.height &&
	  this.y + this.height > other.y
	);
  }
}

class Player extends Entity {
  constructor(x, y) {
	super(x, y, 40, 40, "#4df5c9");
	this.speed = 260;
  }

  update(input, bounds, deltaTime) {
	let vx = 0;
	let vy = 0;

	if (input.isPressed("arrowleft", "a")) vx -= 1;
	if (input.isPressed("arrowright", "d")) vx += 1;
	if (input.isPressed("arrowup", "w")) vy -= 1;
	if (input.isPressed("arrowdown", "s")) vy += 1;

	if (vx !== 0 && vy !== 0) {
	  const factor = Math.SQRT1_2;
	  vx *= factor;
	  vy *= factor;
	}

	this.x += vx * this.speed * deltaTime;
	this.y += vy * this.speed * deltaTime;

	this.x = Math.max(0, Math.min(bounds.width - this.width, this.x));
	this.y = Math.max(0, Math.min(bounds.height - this.height, this.y));
  }
}

class Enemy extends Entity {
  constructor(x, y, width, height, color, vx, vy) {
	super(x, y, width, height, color);
	this.vx = vx;
	this.vy = vy;
  }

  update(deltaTime) {
	this.x += this.vx * deltaTime;
	this.y += this.vy * deltaTime;
  }

  isOutside(bounds, margin = 120) {
	return (
	  this.x > bounds.width + margin ||
	  this.y > bounds.height + margin ||
	  this.x + this.width < -margin ||
	  this.y + this.height < -margin
	);
  }
}

class Game {
  constructor(canvas, ui) {
	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");
	this.ui = ui;
	this.input = new InputHandler();

	this.score = 0;
	this.lives = 3;
	this.isGameOver = false;

	this.player = new Player(60, 60);
	this.goal = new Entity(760, 420, 46, 46, "#69a6ff");

	this.enemies = [];
	this.enemySpawnTimer = 0;
	this.elapsedTime = 0;

	this.invulnerabilityDuration = 1.2;
	this.blinkFrequency = 12;
	this.invulnerableUntil = 0;

	this.lastTime = 0;
	this.maxDelta = 1 / 20;
  }

  start() {
	this.updateHud();
	requestAnimationFrame((time) => this.loop(time));
  }

  loop(timestamp) {
	const rawDelta = this.lastTime === 0 ? 0 : (timestamp - this.lastTime) / 1000;
	const deltaTime = Math.min(this.maxDelta, Number.isFinite(rawDelta) ? rawDelta : 0);
	this.lastTime = timestamp;

	this.elapsedTime += deltaTime;

	this.update(deltaTime);
	this.render();

	requestAnimationFrame((time) => this.loop(time));
  }

  update(deltaTime) {
	if (this.isGameOver) {
	  if (this.input.isPressed("enter", "space")) {
		this.restart();
	  }
	  return;
	}

	this.player.update(this.input, this.canvas, deltaTime);

	if (this.player.intersectsAABB(this.goal)) {
	  this.score += 10;
	  this.repositionGoal();
	  this.updateHud();
	}

	this.spawnEnemies(deltaTime);
	this.updateEnemies(deltaTime);
	this.handleEnemyCollisions();
  }

  spawnEnemies(deltaTime) {
	this.enemySpawnTimer += deltaTime;
	const spawnInterval = this.getSpawnInterval();

	while (this.enemySpawnTimer >= spawnInterval) {
	  this.enemySpawnTimer -= spawnInterval;
	  this.enemies.push(this.createEnemy());
	}
  }

  updateEnemies(deltaTime) {
	for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
	  const enemy = this.enemies[i];
	  enemy.update(deltaTime);

	  if (enemy.isOutside(this.canvas)) {
		this.enemies.splice(i, 1);
	  }
	}
  }

  handleEnemyCollisions() {
	if (this.isPlayerInvulnerable()) {
	  return;
	}

	for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
	  const enemy = this.enemies[i];
	  if (!this.player.intersectsAABB(enemy)) {
		continue;
	  }

	  this.enemies.splice(i, 1);
	  this.lives -= 1;
	  this.invulnerableUntil = this.elapsedTime + this.invulnerabilityDuration;
	  this.resetPlayerPosition();
	  this.updateHud();

	  if (this.lives <= 0) {
		this.isGameOver = true;
	  }
	  return;
	}
  }

  createEnemy() {
	const fromTop = Math.random() < 0.5;
	const size = 24 + Math.random() * 20;

	const startX = fromTop
	  ? Math.random() * (this.canvas.width - size)
	  : this.canvas.width + size;
	const startY = fromTop
	  ? -size
	  : Math.random() * (this.canvas.height - size);

	const playerCenterX = this.player.x + this.player.width / 2;
	const playerCenterY = this.player.y + this.player.height / 2;
	const enemyCenterX = startX + size / 2;
	const enemyCenterY = startY + size / 2;

	const dx = playerCenterX - enemyCenterX;
	const dy = playerCenterY - enemyCenterY;
	const distance = Math.hypot(dx, dy) || 1;

	const baseSpeed = 115 + Math.random() * 80;
	const scaledSpeed = baseSpeed + this.getDifficultyLevel() * 18;

	const vx = (dx / distance) * scaledSpeed;
	const vy = (dy / distance) * scaledSpeed;

	return new Enemy(startX, startY, size, size, "#ff5e88", vx, vy);
  }

  getDifficultyLevel() {
	return Math.floor(this.score / 40);
  }

  getSpawnInterval() {
	const minInterval = 0.38;
	const baseInterval = 1.45;
	const intervalDrop = this.getDifficultyLevel() * 0.08;
	return Math.max(minInterval, baseInterval - intervalDrop);
  }

  isPlayerInvulnerable() {
	return this.elapsedTime < this.invulnerableUntil;
  }

  shouldDrawPlayer() {
	if (!this.isPlayerInvulnerable()) {
	  return true;
	}

	const timeRemaining = this.invulnerableUntil - this.elapsedTime;
	return Math.floor(timeRemaining * this.blinkFrequency) % 2 === 0;
  }

  render() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	this.drawGrid();
	this.goal.draw(this.ctx);

	for (const enemy of this.enemies) {
	  enemy.draw(this.ctx);
	}

	if (this.shouldDrawPlayer()) {
	  this.player.draw(this.ctx);
	}

	if (this.isGameOver) {
	  this.drawGameOver();
	}
  }

  drawGrid() {
	const size = 40;
	this.ctx.strokeStyle = "rgba(142, 162, 209, 0.15)";
	this.ctx.lineWidth = 1;

	for (let x = 0; x <= this.canvas.width; x += size) {
	  this.ctx.beginPath();
	  this.ctx.moveTo(x, 0);
	  this.ctx.lineTo(x, this.canvas.height);
	  this.ctx.stroke();
	}

	for (let y = 0; y <= this.canvas.height; y += size) {
	  this.ctx.beginPath();
	  this.ctx.moveTo(0, y);
	  this.ctx.lineTo(this.canvas.width, y);
	  this.ctx.stroke();
	}
  }

  drawGameOver() {
	this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
	this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

	this.ctx.fillStyle = "#ff5e88";
	this.ctx.font = "700 56px Inter, sans-serif";
	this.ctx.textAlign = "center";
	this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2 - 26);

	this.ctx.fillStyle = "#e5ecff";
	this.ctx.font = "500 22px Inter, sans-serif";
	this.ctx.fillText(`Score final: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 14);

	this.ctx.fillStyle = "#4df5c9";
	this.ctx.font = "600 18px Inter, sans-serif";
	this.ctx.fillText("Pulsa Enter o Espacio para reiniciar", this.canvas.width / 2, this.canvas.height / 2 + 54);
  }

  restart() {
	this.score = 0;
	this.lives = 3;
	this.isGameOver = false;

	this.enemies = [];
	this.enemySpawnTimer = 0;
	this.elapsedTime = 0;
	this.invulnerableUntil = 0;

	this.resetPlayerPosition();
	this.repositionGoal();
	this.updateHud();
  }

  repositionGoal() {
	const margin = 20;
	const maxX = this.canvas.width - this.goal.width - margin;
	const maxY = this.canvas.height - this.goal.height - margin;
	this.goal.x = margin + Math.random() * (maxX - margin);
	this.goal.y = margin + Math.random() * (maxY - margin);
  }

  resetPlayerPosition() {
	this.player.x = 60;
	this.player.y = 60;
  }

  updateHud() {
	this.ui.score.textContent = String(this.score);
	this.ui.lives.textContent = String(Math.max(this.lives, 0));
  }
}

function bootstrap() {
  const canvas = document.getElementById("gameCanvas");
  const score = document.getElementById("scoreValue");
  const lives = document.getElementById("livesValue");

  if (!(canvas instanceof HTMLCanvasElement) || !score || !lives) {
	throw new Error("No se pudo inicializar la escena: elementos del DOM no encontrados.");
  }

  const game = new Game(canvas, { score, lives });
  game.start();
}

bootstrap();
