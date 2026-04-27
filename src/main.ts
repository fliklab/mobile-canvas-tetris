import './style.css'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type Cell as TetrisCell,
  type GameState as TetrisState,
  createGame as createTetrisGame,
  hardDrop,
  movePiece,
  renderBoardWithPiece,
  rotatePiece,
  softDrop,
  tick as tickTetris,
  togglePause,
} from './games/tetris/logic'
import {
  SNAKE_BOARD_SIZE,
  type Direction,
  type SnakeState,
  changeDirection,
  createSnakeGame,
  stepSnake,
  toggleSnakePause,
} from './games/snake/logic'
import {
  MINESWEEPER_HEIGHT,
  MINESWEEPER_MINES,
  MINESWEEPER_WIDTH,
  type MinesweeperState,
  createMinesweeperGame,
  revealCell,
  toggleFlag,
} from './games/minesweeper/logic'

type GameId = 'home' | 'tetris' | 'snake' | 'minesweeper'

const TETRIS_DROP_BASE = 720
const TETRIS_MIN_DROP = 140
const SNAKE_INTERVAL = 155

const TETRIS_COLORS: Record<Exclude<TetrisCell, null>, string> = {
  I: '#50e3ff',
  J: '#6174ff',
  L: '#ff9f43',
  O: '#ffe66d',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#fb7185',
}

const maybeApp = document.querySelector<HTMLDivElement>('#app')
if (!maybeApp) throw new Error('App root not found')
const app: HTMLDivElement = maybeApp

let currentGame: GameId = 'home'
let tetris = createTetrisGame()
let snake = createSnakeGame()
let minesweeper = createMinesweeperGame()
let flagMode = false
let lastFrame = 0
let accumulator = 0
let repeatTimer: number | undefined
let repeatInterval: number | undefined
let canvas: HTMLCanvasElement | null = null
let context: CanvasRenderingContext2D | null = null

const games = [
  {
    id: 'tetris' as const,
    title: 'Tetris Touch',
    badge: 'Canvas Blocks',
    description: '블록을 회전하고 라인을 지우는 모바일 캔버스 테트리스.',
    controls: '조이스틱 + DROP / PAUSE / NEW',
  },
  {
    id: 'snake' as const,
    title: 'Snake Bite',
    badge: 'Canvas Arcade',
    description: '먹이를 먹으며 길어지는 클래식 스네이크 게임.',
    controls: '조이스틱 방향 전환 + PAUSE / NEW',
  },
  {
    id: 'minesweeper' as const,
    title: 'Mine Finder',
    badge: 'Canvas Puzzle',
    description: '숫자 힌트로 지뢰를 피하는 모바일 지뢰찾기.',
    controls: '탭으로 열기 + FLAG 모드 표시',
  },
]

function renderHome(): void {
  currentGame = 'home'
  stopRepeat()
  app.innerHTML = `
    <main class="shell home-shell" aria-label="Game selector home">
      <section class="home-hero">
        <p class="eyebrow">Canvas Mobile Web Arcade</p>
        <h1>Game Selector</h1>
        <p class="home-copy">플레이할 게임을 선택하세요. 각 게임 화면의 HOME 버튼으로 언제든 목록으로 돌아올 수 있습니다.</p>
      </section>
      <section class="game-list" aria-label="Available games">
        ${games
          .map(
            (game) => `
          <button class="game-card" data-select-game="${game.id}" type="button">
            <span>${game.badge}</span>
            <strong>${game.title}</strong>
            <em>${game.description}</em>
            <small>${game.controls}</small>
          </button>`,
          )
          .join('')}
      </section>
    </main>
  `
}

function renderGame(gameId: Exclude<GameId, 'home'>): void {
  currentGame = gameId
  stopRepeat()
  accumulator = 0
  const meta = games.find((game) => game.id === gameId)!
  const isTetris = gameId === 'tetris'
  const isMinesweeper = gameId === 'minesweeper'

  app.innerHTML = `
    <main class="shell" aria-label="${meta.title} game">
      <section class="topbar">
        <button class="nav-button" data-action="home" type="button">HOME</button>
        <div>
          <p class="eyebrow">${meta.badge}</p>
          <h1>${meta.title}</h1>
        </div>
        <button class="icon-button" data-action="restart" type="button" aria-label="Restart game">↻</button>
      </section>

      <section class="hud" aria-live="polite">
        <div class="hud-card"><span>Score</span><strong id="score">0</strong></div>
        <div class="hud-card"><span>${isTetris ? 'Lines' : isMinesweeper ? 'Flags' : 'Length'}</span><strong id="metric">0</strong></div>
        <div class="hud-card"><span>${isTetris ? 'Level' : isMinesweeper ? 'Mines' : 'Food'}</span><strong id="level">1</strong></div>
        <div class="hud-card status"><span>Status</span><strong id="status">PLAY</strong></div>
      </section>

      <section class="stage-wrap">
        <canvas id="game" width="300" height="600" aria-label="${meta.title} board" data-board-game="${gameId}"></canvas>
        <div class="overlay" id="overlay" hidden>
          <strong id="overlay-title">Paused</strong>
          <span id="overlay-copy">Tap pause to resume</span>
        </div>
      </section>

      <section class="controls ${isMinesweeper ? 'mine-controls' : ''}" aria-label="Touch controls">
        ${
          isMinesweeper
            ? `<div class="mine-help" aria-label="Minesweeper help">
                <strong>탭: 열기</strong>
                <span>FLAG 모드를 켜면 탭한 칸에 깃발을 표시합니다.</span>
              </div>`
            : `<div class="joystick" aria-label="Joystick">
                <button data-action="up" class="joy-btn up" type="button" aria-label="${isTetris ? 'Rotate' : 'Move up'}">${isTetris ? '↻' : '↑'}</button>
                <button data-action="left" class="joy-btn left" type="button" aria-label="Move left">←</button>
                <button data-action="down" class="joy-btn down" type="button" aria-label="Move down">↓</button>
                <button data-action="right" class="joy-btn right" type="button" aria-label="Move right">→</button>
                <div class="joy-core" aria-hidden="true"></div>
              </div>`
        }

        <div class="game-buttons" aria-label="Game buttons">
          <button data-action="primary" class="action-button primary" type="button">${isTetris ? 'DROP' : isMinesweeper ? 'FLAG' : 'BOOST'}</button>
          ${isMinesweeper ? '' : '<button data-action="pause" class="action-button" type="button">PAUSE</button>'}
          <button data-action="restart" class="action-button" type="button">NEW</button>
        </div>
      </section>
    </main>
  `

  canvas = document.querySelector<HTMLCanvasElement>('#game')
  const maybeContext = canvas?.getContext('2d') ?? null
  if (!canvas || !maybeContext) throw new Error('Canvas 2D context is not available')
  context = maybeContext
  drawCurrentGame()
  syncHud()
}

function drawCurrentGame(): void {
  if (!canvas || !context) return
  if (currentGame === 'tetris') drawTetris(canvas, context, tetris)
  if (currentGame === 'snake') drawSnake(canvas, context, snake)
  if (currentGame === 'minesweeper') drawMinesweeper(canvas, context, minesweeper)
}

function drawTetris(targetCanvas: HTMLCanvasElement, targetContext: CanvasRenderingContext2D, game: TetrisState): void {
  const cellSize = Math.floor(Math.min(targetCanvas.width / BOARD_WIDTH, targetCanvas.height / BOARD_HEIGHT))
  const boardWidth = cellSize * BOARD_WIDTH
  const boardHeight = cellSize * BOARD_HEIGHT
  const offsetX = Math.floor((targetCanvas.width - boardWidth) / 2)
  const offsetY = Math.floor((targetCanvas.height - boardHeight) / 2)
  const board = renderBoardWithPiece(game)

  clearStage(targetCanvas, targetContext)
  drawGrid(targetContext, offsetX, offsetY, BOARD_WIDTH, BOARD_HEIGHT, cellSize)

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const cell = board[y][x]
      if (cell) drawBlock(targetContext, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, TETRIS_COLORS[cell])
    }
  }
  strokeBoard(targetContext, offsetX, offsetY, boardWidth, boardHeight)
}

function drawSnake(targetCanvas: HTMLCanvasElement, targetContext: CanvasRenderingContext2D, game: SnakeState): void {
  const cellSize = Math.floor(Math.min(targetCanvas.width, targetCanvas.height) / SNAKE_BOARD_SIZE)
  const boardSize = cellSize * SNAKE_BOARD_SIZE
  const offsetX = Math.floor((targetCanvas.width - boardSize) / 2)
  const offsetY = Math.floor((targetCanvas.height - boardSize) / 2)

  clearStage(targetCanvas, targetContext)
  drawGrid(targetContext, offsetX, offsetY, SNAKE_BOARD_SIZE, SNAKE_BOARD_SIZE, cellSize)
  drawBlock(targetContext, offsetX + game.food.x * cellSize, offsetY + game.food.y * cellSize, cellSize, '#fb7185')
  game.snake.forEach((part, index) => {
    drawBlock(targetContext, offsetX + part.x * cellSize, offsetY + part.y * cellSize, cellSize, index === 0 ? '#67e8f9' : '#4ade80')
  })
  strokeBoard(targetContext, offsetX, offsetY, boardSize, boardSize)
}

function drawMinesweeper(targetCanvas: HTMLCanvasElement, targetContext: CanvasRenderingContext2D, game: MinesweeperState): void {
  const cellSize = Math.floor(Math.min(targetCanvas.width, targetCanvas.height) / MINESWEEPER_WIDTH)
  const boardWidth = cellSize * MINESWEEPER_WIDTH
  const boardHeight = cellSize * MINESWEEPER_HEIGHT
  const offsetX = Math.floor((targetCanvas.width - boardWidth) / 2)
  const offsetY = Math.floor((targetCanvas.height - boardHeight) / 2)

  clearStage(targetCanvas, targetContext)
  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'middle'
  targetContext.font = `900 ${Math.max(15, cellSize * 0.44)}px Inter, system-ui, sans-serif`

  for (const row of game.board) {
    for (const cell of row) {
      const x = offsetX + cell.x * cellSize
      const y = offsetY + cell.y * cellSize
      if (cell.isRevealed) {
        drawRevealedMineCell(targetContext, x, y, cellSize)
        if (cell.hasMine) {
          targetContext.fillStyle = '#fb7185'
          targetContext.beginPath()
          targetContext.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.22, 0, Math.PI * 2)
          targetContext.fill()
        } else if (cell.adjacentMines > 0) {
          targetContext.fillStyle = mineNumberColor(cell.adjacentMines)
          targetContext.fillText(String(cell.adjacentMines), x + cellSize / 2, y + cellSize / 2 + 1)
        }
      } else {
        drawBlock(targetContext, x, y, cellSize, cell.isFlagged ? '#f59e0b' : '#334155')
        if (cell.isFlagged) {
          targetContext.fillStyle = '#fff7ed'
          targetContext.fillText('⚑', x + cellSize / 2, y + cellSize / 2 + 1)
        }
      }
    }
  }
  strokeBoard(targetContext, offsetX, offsetY, boardWidth, boardHeight)
}

function drawRevealedMineCell(targetContext: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  targetContext.fillStyle = '#dbeafe'
  roundedRect(targetContext, x + 2, y + 2, size - 4, size - 4, Math.max(4, size * 0.12))
  targetContext.fill()
}

function mineNumberColor(count: number): string {
  return ['#e2e8f0', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#be123c', '#0891b2', '#111827', '#64748b'][count] ?? '#0f172a'
}

function clearStage(targetCanvas: HTMLCanvasElement, targetContext: CanvasRenderingContext2D): void {
  targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  targetContext.fillStyle = '#070a13'
  targetContext.fillRect(0, 0, targetCanvas.width, targetCanvas.height)
}

function drawGrid(targetContext: CanvasRenderingContext2D, offsetX: number, offsetY: number, cols: number, rows: number, cellSize: number): void {
  targetContext.strokeStyle = 'rgba(255,255,255,0.055)'
  targetContext.lineWidth = 1
  for (let x = 0; x <= cols; x += 1) {
    const px = offsetX + x * cellSize
    targetContext.beginPath()
    targetContext.moveTo(px, offsetY)
    targetContext.lineTo(px, offsetY + rows * cellSize)
    targetContext.stroke()
  }
  for (let y = 0; y <= rows; y += 1) {
    const py = offsetY + y * cellSize
    targetContext.beginPath()
    targetContext.moveTo(offsetX, py)
    targetContext.lineTo(offsetX + cols * cellSize, py)
    targetContext.stroke()
  }
}

function drawBlock(targetContext: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  const radius = Math.max(4, size * 0.16)
  roundedRect(targetContext, x + 2, y + 2, size - 4, size - 4, radius)
  targetContext.fillStyle = color
  targetContext.fill()
  targetContext.fillStyle = 'rgba(255,255,255,0.24)'
  roundedRect(targetContext, x + 5, y + 5, size - 10, Math.max(3, size * 0.18), radius / 2)
  targetContext.fill()
}

function roundedRect(targetContext: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  targetContext.beginPath()
  const roundRect = (targetContext as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, width: number, height: number, radii: number) => void
  }).roundRect
  if (typeof roundRect === 'function') {
    roundRect.call(targetContext, x, y, width, height, radius)
    return
  }
  targetContext.moveTo(x + radius, y)
  targetContext.lineTo(x + width - radius, y)
  targetContext.quadraticCurveTo(x + width, y, x + width, y + radius)
  targetContext.lineTo(x + width, y + height - radius)
  targetContext.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  targetContext.lineTo(x + radius, y + height)
  targetContext.quadraticCurveTo(x, y + height, x, y + height - radius)
  targetContext.lineTo(x, y + radius)
  targetContext.quadraticCurveTo(x, y, x + radius, y)
}

function strokeBoard(targetContext: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  targetContext.strokeStyle = 'rgba(255,255,255,0.38)'
  targetContext.lineWidth = 2
  targetContext.strokeRect(x + 1, y + 1, width - 2, height - 2)
}

function syncHud(): void {
  if (currentGame === 'home') return
  const score = document.querySelector<HTMLElement>('#score')!
  const metric = document.querySelector<HTMLElement>('#metric')!
  const level = document.querySelector<HTMLElement>('#level')!
  const status = document.querySelector<HTMLElement>('#status')!
  const overlay = document.querySelector<HTMLElement>('#overlay')!
  const overlayTitle = document.querySelector<HTMLElement>('#overlay-title')!
  const overlayCopy = document.querySelector<HTMLElement>('#overlay-copy')!
  if (currentGame === 'minesweeper') {
    score.textContent = String(minesweeper.revealedSafeCells)
    metric.textContent = String(minesweeper.flagsRemaining)
    level.textContent = String(MINESWEEPER_MINES)
    status.textContent = minesweeper.status === 'won' ? 'WIN' : minesweeper.status === 'game-over' ? 'OVER' : flagMode ? 'FLAG' : 'PLAY'
    overlay.hidden = minesweeper.status === 'playing'
    if (minesweeper.status === 'game-over') {
      overlayTitle.textContent = 'Mine Hit'
      overlayCopy.textContent = 'NEW 버튼으로 재시작'
    }
    if (minesweeper.status === 'won') {
      overlayTitle.textContent = 'Clear!'
      overlayCopy.textContent = '모든 안전 칸을 찾았습니다'
    }
    return
  }

  const state = currentGame === 'tetris' ? tetris : snake

  score.textContent = String(state.score)
  metric.textContent = currentGame === 'tetris' ? String(tetris.lines) : String(snake.snake.length)
  level.textContent = currentGame === 'tetris' ? String(tetris.level) : String(Math.floor(snake.score / 10))
  status.textContent = state.status === 'game-over' ? 'OVER' : state.status === 'paused' ? 'PAUSE' : 'PLAY'
  overlay.hidden = state.status === 'playing'

  if (state.status === 'paused') {
    overlayTitle.textContent = 'Paused'
    overlayCopy.textContent = 'PAUSE 버튼으로 계속하기'
  }
  if (state.status === 'game-over') {
    overlayTitle.textContent = 'Game Over'
    overlayCopy.textContent = 'NEW 버튼으로 재시작'
  }
}

function handleAction(action: string): void {
  if (action === 'home') {
    renderHome()
    return
  }
  if (currentGame === 'home') return
  if (action === 'restart') {
    if (currentGame === 'tetris') tetris = createTetrisGame()
    if (currentGame === 'snake') snake = createSnakeGame()
    if (currentGame === 'minesweeper') {
      minesweeper = createMinesweeperGame()
      flagMode = false
    }
    accumulator = 0
    drawCurrentGame()
    syncHud()
    return
  }
  if (action === 'pause') {
    if (currentGame === 'tetris') tetris = togglePause(tetris)
    if (currentGame === 'snake') snake = toggleSnakePause(snake)
    if (currentGame === 'minesweeper') flagMode = !flagMode
    drawCurrentGame()
    syncHud()
    return
  }
  if (currentGame === 'tetris') handleTetrisAction(action)
  if (currentGame === 'snake') handleSnakeAction(action)
  if (currentGame === 'minesweeper') handleMinesweeperAction(action)
  drawCurrentGame()
  syncHud()
}

function handleTetrisAction(action: string): void {
  if (tetris.status !== 'playing') return
  if (action === 'left') tetris = movePiece(tetris, -1)
  if (action === 'right') tetris = movePiece(tetris, 1)
  if (action === 'down') {
    tetris = softDrop(tetris)
    accumulator = 0
  }
  if (action === 'up') tetris = rotatePiece(tetris)
  if (action === 'primary') {
    tetris = hardDrop(tetris)
    accumulator = 0
  }
}

function handleSnakeAction(action: string): void {
  if (snake.status !== 'playing') return
  const directions: Record<string, Direction> = { up: 'up', down: 'down', left: 'left', right: 'right' }
  if (directions[action]) snake = changeDirection(snake, directions[action])
  if (action === 'primary') {
    snake = stepSnake(snake)
    accumulator = 0
  }
}

function handleMinesweeperAction(action: string): void {
  if (action === 'primary') flagMode = !flagMode
}

function handleMinesweeperPointer(event: PointerEvent): void {
  if (currentGame !== 'minesweeper' || !canvas || minesweeper.status !== 'playing') return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const canvasX = (event.clientX - rect.left) * scaleX
  const canvasY = (event.clientY - rect.top) * scaleY
  const cellSize = Math.floor(Math.min(canvas.width, canvas.height) / MINESWEEPER_WIDTH)
  const boardWidth = cellSize * MINESWEEPER_WIDTH
  const boardHeight = cellSize * MINESWEEPER_HEIGHT
  const offsetX = Math.floor((canvas.width - boardWidth) / 2)
  const offsetY = Math.floor((canvas.height - boardHeight) / 2)
  const x = Math.floor((canvasX - offsetX) / cellSize)
  const y = Math.floor((canvasY - offsetY) / cellSize)
  if (x < 0 || x >= MINESWEEPER_WIDTH || y < 0 || y >= MINESWEEPER_HEIGHT) return
  minesweeper = flagMode ? toggleFlag(minesweeper, x, y) : revealCell(minesweeper, x, y)
  drawCurrentGame()
  syncHud()
}

function startRepeat(action: string): void {
  stopRepeat()
  handleAction(action)
  if (currentGame === 'tetris' && !['left', 'right', 'down'].includes(action)) return
  if (currentGame === 'snake' && !['primary'].includes(action)) return
  if (currentGame === 'minesweeper') return
  repeatTimer = window.setTimeout(() => {
    repeatInterval = window.setInterval(() => handleAction(action), currentGame === 'tetris' && action === 'down' ? 70 : 105)
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

  if (currentGame === 'tetris' && tetris.status === 'playing') {
    accumulator += delta
    if (accumulator >= Math.max(TETRIS_MIN_DROP, TETRIS_DROP_BASE - (tetris.level - 1) * 58)) {
      tetris = tickTetris(tetris)
      accumulator = 0
      drawCurrentGame()
      syncHud()
    }
  }

  if (currentGame === 'snake' && snake.status === 'playing') {
    accumulator += delta
    if (accumulator >= SNAKE_INTERVAL) {
      snake = stepSnake(snake)
      accumulator = 0
      drawCurrentGame()
      syncHud()
    }
  }

  requestAnimationFrame(animationLoop)
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const gameButton = target.closest<HTMLButtonElement>('[data-select-game]')
  if (gameButton?.dataset.selectGame === 'tetris' || gameButton?.dataset.selectGame === 'snake' || gameButton?.dataset.selectGame === 'minesweeper') {
    renderGame(gameButton.dataset.selectGame)
    return
  }

  const button = target.closest<HTMLButtonElement>('[data-action]')
  if (!button || button.classList.contains('joy-btn')) return
  handleAction(button.dataset.action ?? '')
})

document.addEventListener('pointerdown', (event) => {
  if ((event.target as HTMLElement).closest<HTMLCanvasElement>('#game')) {
    handleMinesweeperPointer(event)
    return
  }
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
    ArrowUp: 'up',
    ' ': 'primary',
    p: 'pause',
    P: 'pause',
    r: 'restart',
    R: 'restart',
    Escape: 'home',
  }
  const action = keyAction[event.key]
  if (!action) return
  event.preventDefault()
  handleAction(action)
})

renderHome()
requestAnimationFrame(animationLoop)
