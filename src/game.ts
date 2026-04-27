export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'
export type Cell = TetrominoType | null
export type Board = Cell[][]
export type GameStatus = 'playing' | 'paused' | 'game-over'

export interface ActivePiece {
  type: TetrominoType
  x: number
  y: number
  rotation: number
  cells: number[][]
}

export interface GameState {
  board: Board
  active: ActivePiece
  next: TetrominoType
  score: number
  lines: number
  level: number
  status: GameStatus
}

type RandomFn = () => number

const TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

const SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]],
  ],
  O: [
    [[1, 1], [1, 1]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
  ],
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null))
}

export function pickType(random: RandomFn = Math.random): TetrominoType {
  const index = Math.max(0, Math.min(TYPES.length - 1, Math.floor(random() * TYPES.length)))
  return TYPES[index]
}

export function createPiece(type: TetrominoType): ActivePiece {
  const cells = SHAPES[type][0]
  return {
    type,
    x: Math.floor((BOARD_WIDTH - cells[0].length) / 2),
    y: 0,
    rotation: 0,
    cells,
  }
}

export function createGame(random: RandomFn = Math.random): GameState {
  const activeType = pickType(random)
  const next = pickType(random)
  return {
    board: createEmptyBoard(),
    active: createPiece(activeType),
    next,
    score: 0,
    lines: 0,
    level: 1,
    status: 'playing',
  }
}

export function collides(board: Board, piece: ActivePiece): boolean {
  for (let y = 0; y < piece.cells.length; y += 1) {
    for (let x = 0; x < piece.cells[y].length; x += 1) {
      if (piece.cells[y][x] === 0) continue
      const boardX = piece.x + x
      const boardY = piece.y + y
      if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) return true
      if (boardY >= 0 && board[boardY][boardX] !== null) return true
    }
  }
  return false
}

export function movePiece(game: GameState, dx: number): GameState {
  if (game.status !== 'playing') return game
  const active = { ...game.active, x: game.active.x + dx }
  return collides(game.board, active) ? game : { ...game, active }
}

export function softDrop(game: GameState, random: RandomFn = Math.random): GameState {
  if (game.status !== 'playing') return game
  const active = { ...game.active, y: game.active.y + 1 }
  return collides(game.board, active) ? lockPiece(game, random) : { ...game, active }
}

export function rotatePiece(game: GameState): GameState {
  if (game.status !== 'playing') return game
  const rotations = SHAPES[game.active.type]
  const rotation = (game.active.rotation + 1) % rotations.length
  const rotated = { ...game.active, rotation, cells: rotations[rotation] }

  for (const offset of [0, -1, 1, -2, 2]) {
    const kicked = { ...rotated, x: rotated.x + offset }
    if (!collides(game.board, kicked)) return { ...game, active: kicked }
  }

  return game
}

export function hardDrop(game: GameState, random: RandomFn = Math.random): GameState {
  if (game.status !== 'playing') return game
  let active = game.active
  while (!collides(game.board, { ...active, y: active.y + 1 })) {
    active = { ...active, y: active.y + 1 }
  }
  return lockPiece({ ...game, active }, random)
}

export function tick(game: GameState, random: RandomFn = Math.random): GameState {
  return softDrop(game, random)
}

function lockPiece(game: GameState, random: RandomFn): GameState {
  const merged = game.board.map((row) => [...row])

  for (let y = 0; y < game.active.cells.length; y += 1) {
    for (let x = 0; x < game.active.cells[y].length; x += 1) {
      if (game.active.cells[y][x] === 0) continue
      const boardX = game.active.x + x
      const boardY = game.active.y + y
      if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
        merged[boardY][boardX] = game.active.type
      }
    }
  }

  const { board, cleared } = clearLines(merged)
  const totalLines = game.lines + cleared
  const level = Math.floor(totalLines / 10) + 1
  const active = createPiece(game.next)
  const next = pickType(random)
  const status: GameStatus = collides(board, active) ? 'game-over' : 'playing'

  return {
    ...game,
    board,
    active,
    next,
    lines: totalLines,
    level,
    score: game.score + scoreForLines(cleared, game.level),
    status,
  }
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null))
  const cleared = BOARD_HEIGHT - remaining.length
  const emptyRows = Array.from({ length: cleared }, () => Array<Cell>(BOARD_WIDTH).fill(null))
  return { board: [...emptyRows, ...remaining], cleared }
}

function scoreForLines(lines: number, level: number): number {
  const table = [0, 100, 300, 500, 800]
  return (table[lines] ?? 0) * level
}

export function renderBoardWithPiece(game: GameState): Board {
  const board = game.board.map((row) => [...row])
  for (let y = 0; y < game.active.cells.length; y += 1) {
    for (let x = 0; x < game.active.cells[y].length; x += 1) {
      if (game.active.cells[y][x] === 0) continue
      const boardX = game.active.x + x
      const boardY = game.active.y + y
      if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
        board[boardY][boardX] = game.active.type
      }
    }
  }
  return board
}

export function togglePause(game: GameState): GameState {
  if (game.status === 'game-over') return game
  return { ...game, status: game.status === 'paused' ? 'playing' : 'paused' }
}
