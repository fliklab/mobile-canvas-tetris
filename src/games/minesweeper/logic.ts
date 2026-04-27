export const MINESWEEPER_WIDTH = 10
export const MINESWEEPER_HEIGHT = 10
export const MINESWEEPER_MINES = 18

export type MinesweeperStatus = 'playing' | 'game-over' | 'won'

export interface MineCell {
  x: number
  y: number
  hasMine: boolean
  adjacentMines: number
  isRevealed: boolean
  isFlagged: boolean
}

export interface MinesweeperState {
  board: MineCell[][]
  status: MinesweeperStatus
  flagsRemaining: number
  revealedSafeCells: number
  safeCellCount: number
}

type RandomFn = () => number

export function createMinesweeperGame(random: RandomFn = Math.random): MinesweeperState {
  const minePositions = pickMinePositions(random)
  const board = Array.from({ length: MINESWEEPER_HEIGHT }, (_, y) =>
    Array.from({ length: MINESWEEPER_WIDTH }, (_, x) => ({
      x,
      y,
      hasMine: minePositions.has(key(x, y)),
      adjacentMines: 0,
      isRevealed: false,
      isFlagged: false,
    })),
  )

  for (const row of board) {
    for (const cell of row) {
      cell.adjacentMines = neighbors(cell.x, cell.y).filter((point) => board[point.y][point.x].hasMine).length
    }
  }

  return {
    board,
    status: 'playing',
    flagsRemaining: MINESWEEPER_MINES,
    revealedSafeCells: 0,
    safeCellCount: MINESWEEPER_WIDTH * MINESWEEPER_HEIGHT - MINESWEEPER_MINES,
  }
}

export function revealCell(game: MinesweeperState, x: number, y: number): MinesweeperState {
  if (game.status !== 'playing' || !isInBounds(x, y)) return game
  const sourceCell = game.board[y][x]
  if (sourceCell.isFlagged || sourceCell.isRevealed) return game

  const board = cloneBoard(game.board)
  const cell = board[y][x]

  if (cell.hasMine) {
    cell.isRevealed = true
    return { ...game, board, status: 'game-over' }
  }

  let revealedSafeCells = game.revealedSafeCells
  const queue = [cell]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.isRevealed || current.isFlagged) continue
    current.isRevealed = true
    revealedSafeCells += 1

    if (current.adjacentMines !== 0) continue
    for (const point of neighbors(current.x, current.y)) {
      const neighbor = board[point.y][point.x]
      if (!neighbor.hasMine && !neighbor.isRevealed && !neighbor.isFlagged) queue.push(neighbor)
    }
  }

  return {
    ...game,
    board,
    revealedSafeCells,
    status: revealedSafeCells === game.safeCellCount ? 'won' : 'playing',
  }
}

export function toggleFlag(game: MinesweeperState, x: number, y: number): MinesweeperState {
  if (game.status !== 'playing' || !isInBounds(x, y)) return game
  const cell = game.board[y][x]
  if (cell.isRevealed) return game
  if (!cell.isFlagged && game.flagsRemaining <= 0) return game

  const board = cloneBoard(game.board)
  const target = board[y][x]
  target.isFlagged = !target.isFlagged

  return {
    ...game,
    board,
    flagsRemaining: game.flagsRemaining + (target.isFlagged ? -1 : 1),
  }
}

function pickMinePositions(random: RandomFn): Set<string> {
  const available = Array.from({ length: MINESWEEPER_WIDTH * MINESWEEPER_HEIGHT }, (_, index) => index)
  const mines = new Set<string>()

  for (let i = 0; i < MINESWEEPER_MINES; i += 1) {
    const index = Math.max(0, Math.min(available.length - 1, Math.floor(random() * available.length)))
    const [picked] = available.splice(index, 1)
    mines.add(key(picked % MINESWEEPER_WIDTH, Math.floor(picked / MINESWEEPER_WIDTH)))
  }

  return mines
}

function cloneBoard(board: MineCell[][]): MineCell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })))
}

function neighbors(x: number, y: number): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (isInBounds(nx, ny)) result.push({ x: nx, y: ny })
    }
  }
  return result
}

function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < MINESWEEPER_WIDTH && y >= 0 && y < MINESWEEPER_HEIGHT
}

function key(x: number, y: number): string {
  return `${x},${y}`
}
