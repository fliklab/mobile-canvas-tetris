import './style.css'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type Cell,
  type GameState,
  hardDrop,
  movePiece,
  renderBoardWithPiece,
  rotatePiece,
  softDrop,
  tick,
  togglePause,
  createGame,
} from './game'

const DROP_INTERVAL_BY_LEVEL = 720
const MIN_DROP_INTERVAL = 140
const CELL_COLORS: Record<Exclude<Cell, null>, string> = {
  I: '#50e3ff',
  J: '#6174ff',
  L: '#ff9f43',
  O: '#ffe66d',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#fb7185',
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')

app.innerHTML = `
  <main class="shell" aria-label="Mobile canvas Tetris game">
    <section class="topbar">
      <div>
        <p class="eyebrow">Canvas Mobile Web</p>
        <h1>Tetris Touch</h1>
      </div>
      <button class="icon-button" id="restart" type="button" aria-label="Restart game">↻</button>
    </section>

    <section class="hud" aria-live="polite">
      <div class="hud-card"><span>Score</span><strong id="score">0</strong></div>
      <div class="hud-card"><span>Lines</span><strong id="lines">0</strong></div>
      <div class="hud-card"><span>Level</span><strong id="level">1</strong></div>
      <div class="hud-card status"><span>Status</span><strong id="status">PLAY</strong></div>
    </section>

    <section class="stage-wrap">
      <canvas id="game" width="300" height="600" aria-label="Tetris board"></canvas>
      <div class="overlay" id="overlay" hidden>
        <strong id="overlay-title">Paused</strong>
        <span id="overlay-copy">Tap pause to resume</span>
      </div>
    </section>

    <section class="controls" aria-label="Touch controls">
      <div class="joystick" aria-label="Joystick">
        <button data-action="rotate" class="joy-btn up" type="button" aria-label="Rotate">↻</button>
        <button data-action="left" class="joy-btn left" type="button" aria-label="Move left">←</button>
        <button data-action="down" class="joy-btn down" type="button" aria-label="Soft drop">↓</button>
        <button data-action="right" class="joy-btn right" type="button" aria-label="Move right">→</button>
        <div class="joy-core" aria-hidden="true"></div>
      </div>

      <div class="game-buttons" aria-label="Game buttons">
        <button data-action="hardDrop" class="action-button primary" type="button">DROP</button>
        <button data-action="pause" class="action-button" type="button">PAUSE</button>
        <button data-action="restart" class="action-button" type="button">NEW</button>
      </div>
    </section>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const maybeContext = canvas.getContext('2d')
if (!maybeContext) throw new Error('Canvas 2D context is not available')
const context: CanvasRenderingContext2D = maybeContext

const scoreElement = document.querySelector<HTMLElement>('#score')!
const linesElement = document.querySelector<HTMLElement>('#lines')!
const levelElement = document.querySelector<HTMLElement>('#level')!
const statusElement = document.querySelector<HTMLElement>('#status')!
const overlay = document.querySelector<HTMLElement>('#overlay')!
const overlayTitle = document.querySelector<HTMLElement>('#overlay-title')!
const overlayCopy = document.querySelector<HTMLElement>('#overlay-copy')!

let game = createGame()
let lastFrame = 0
let dropAccumulator = 0
let repeatTimer: number | undefined
let repeatInterval: number | undefined

function updateGame(next: GameState): void {
  game = next
  draw()
  syncHud()
}

function dropInterval(): number {
  return Math.max(MIN_DROP_INTERVAL, DROP_INTERVAL_BY_LEVEL - (game.level - 1) * 58)
}

function draw(): void {
  const width = canvas.width
  const height = canvas.height
  const cellSize = Math.floor(Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT))
  const boardWidth = cellSize * BOARD_WIDTH
  const boardHeight = cellSize * BOARD_HEIGHT
  const offsetX = Math.floor((width - boardWidth) / 2)
  const offsetY = Math.floor((height - boardHeight) / 2)
  const board = renderBoardWithPiece(game)

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#070a13'
  context.fillRect(0, 0, width, height)

  drawGrid(offsetX, offsetY, cellSize)

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const cell = board[y][x]
      if (cell) drawBlock(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, CELL_COLORS[cell])
    }
  }

  context.strokeStyle = 'rgba(255,255,255,0.38)'
  context.lineWidth = 2
  context.strokeRect(offsetX + 1, offsetY + 1, boardWidth - 2, boardHeight - 2)
}

function drawGrid(offsetX: number, offsetY: number, cellSize: number): void {
  context.strokeStyle = 'rgba(255,255,255,0.055)'
  context.lineWidth = 1
  for (let x = 0; x <= BOARD_WIDTH; x += 1) {
    const px = offsetX + x * cellSize
    context.beginPath()
    context.moveTo(px, offsetY)
    context.lineTo(px, offsetY + BOARD_HEIGHT * cellSize)
    context.stroke()
  }
  for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
    const py = offsetY + y * cellSize
    context.beginPath()
    context.moveTo(offsetX, py)
    context.lineTo(offsetX + BOARD_WIDTH * cellSize, py)
    context.stroke()
  }
}

function drawBlock(x: number, y: number, size: number, color: string): void {
  const radius = Math.max(4, size * 0.16)
  roundedRect(x + 2, y + 2, size - 4, size - 4, radius)
  context.fillStyle = color
  context.fill()
  context.fillStyle = 'rgba(255,255,255,0.24)'
  roundedRect(x + 5, y + 5, size - 10, Math.max(3, size * 0.18), radius / 2)
  context.fill()
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath()
  const roundRect = (context as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, width: number, height: number, radii: number) => void
  }).roundRect
  if (typeof roundRect === 'function') {
    roundRect.call(context, x, y, width, height, radius)
    return
  }

  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
}

function syncHud(): void {
  scoreElement.textContent = String(game.score)
  linesElement.textContent = String(game.lines)
  levelElement.textContent = String(game.level)
  statusElement.textContent = game.status === 'game-over' ? 'OVER' : game.status === 'paused' ? 'PAUSE' : 'PLAY'

  overlay.hidden = game.status === 'playing'
  if (game.status === 'paused') {
    overlayTitle.textContent = 'Paused'
    overlayCopy.textContent = 'PAUSE 버튼으로 계속하기'
  }
  if (game.status === 'game-over') {
    overlayTitle.textContent = 'Game Over'
    overlayCopy.textContent = 'NEW 버튼으로 재시작'
  }
}

function handleAction(action: string): void {
  if (action === 'restart') {
    updateGame(createGame())
    dropAccumulator = 0
    return
  }

  if (action === 'pause') {
    updateGame(togglePause(game))
    return
  }

  if (game.status !== 'playing') return

  if (action === 'left') updateGame(movePiece(game, -1))
  if (action === 'right') updateGame(movePiece(game, 1))
  if (action === 'down') {
    updateGame(softDrop(game))
    dropAccumulator = 0
  }
  if (action === 'rotate') updateGame(rotatePiece(game))
  if (action === 'hardDrop') {
    updateGame(hardDrop(game))
    dropAccumulator = 0
  }
}

function startRepeat(action: string): void {
  stopRepeat()
  handleAction(action)
  if (!['left', 'right', 'down'].includes(action)) return
  repeatTimer = window.setTimeout(() => {
    repeatInterval = window.setInterval(() => handleAction(action), action === 'down' ? 70 : 105)
  }, 180)
}

function stopRepeat(): void {
  if (repeatTimer !== undefined) window.clearTimeout(repeatTimer)
  if (repeatInterval !== undefined) window.clearInterval(repeatInterval)
  repeatTimer = undefined
  repeatInterval = undefined
}

function animationLoop(timestamp: number): void {
  const delta = timestamp - lastFrame
  lastFrame = timestamp

  if (game.status === 'playing') {
    dropAccumulator += delta
    if (dropAccumulator >= dropInterval()) {
      updateGame(tick(game))
      dropAccumulator = 0
    }
  }

  requestAnimationFrame(animationLoop)
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const button = target.closest<HTMLButtonElement>('[data-action], #restart')
  if (!button || button.classList.contains('joy-btn')) return
  handleAction(button.dataset.action ?? 'restart')
})

document.addEventListener('pointerdown', (event) => {
  const target = event.target as HTMLElement
  const button = target.closest<HTMLButtonElement>('.joy-btn')
  if (!button) return
  event.preventDefault()
  button.setPointerCapture(event.pointerId)
  startRepeat(button.dataset.action ?? '')
})

document.addEventListener('pointerup', stopRepeat)
document.addEventListener('pointercancel', stopRepeat)
document.addEventListener('pointerleave', (event) => {
  if ((event.target as HTMLElement).closest<HTMLButtonElement>('.joy-btn')) stopRepeat()
})

document.addEventListener('keydown', (event) => {
  const keyAction: Record<string, string> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'rotate',
    ' ': 'hardDrop',
    p: 'pause',
    P: 'pause',
    r: 'restart',
    R: 'restart',
  }
  const action = keyAction[event.key]
  if (!action) return
  event.preventDefault()
  handleAction(action)
})

canvas.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false })

draw()
syncHud()
requestAnimationFrame(animationLoop)
