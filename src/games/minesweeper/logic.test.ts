import { describe, expect, it } from 'vitest'
import {
  MINESWEEPER_HEIGHT,
  MINESWEEPER_WIDTH,
  createMinesweeperGame,
  revealCell,
  toggleFlag,
  type MinesweeperState,
} from './logic'

describe('Minesweeper game logic', () => {
  it('creates a board with the requested mine count and hidden cells', () => {
    const game = createMinesweeperGame(() => 0.1)
    const cells = game.board.flat()

    expect(game.board).toHaveLength(MINESWEEPER_HEIGHT)
    expect(game.board.every((row) => row.length === MINESWEEPER_WIDTH)).toBe(true)
    expect(cells.filter((cell) => cell.hasMine)).toHaveLength(18)
    expect(cells.every((cell) => !cell.isRevealed && !cell.isFlagged)).toBe(true)
    expect(game.status).toBe('playing')
  })

  it('calculates adjacent mine counts', () => {
    const game = createMinesweeperGame(() => 0)
    const mineCells = game.board.flat().filter((cell) => cell.hasMine)

    expect(mineCells).toHaveLength(18)
    expect(game.board[1][8].adjacentMines).toBe(4)
    expect(game.board[3][0].adjacentMines).toBe(0)
  })

  it('reveals a safe numbered cell', () => {
    const game = createMinesweeperGame(() => 0)
    const next = revealCell(game, 8, 1)

    expect(next.board[1][8].isRevealed).toBe(true)
    expect(next.status).toBe('playing')
  })

  it('flood reveals connected blank cells and their border numbers', () => {
    const game = createMinesweeperGame(() => 0)
    const next = revealCell(game, 0, 3)

    expect(next.board[3][0].isRevealed).toBe(true)
    expect(next.board[3][1].isRevealed).toBe(true)
    expect(next.board[2][8].isRevealed).toBe(true)
  })

  it('toggles flags and prevents revealing flagged cells', () => {
    const game = createMinesweeperGame(() => 0)
    const flagged = toggleFlag(game, 0, 0)
    const revealed = revealCell(flagged, 0, 0)

    expect(flagged.board[0][0].isFlagged).toBe(true)
    expect(flagged.flagsRemaining).toBe(17)
    expect(revealed.board[0][0].isRevealed).toBe(false)
  })

  it('loses when revealing a mine', () => {
    const game = createMinesweeperGame(() => 0)
    const next = revealCell(game, 0, 0)

    expect(next.status).toBe('game-over')
    expect(next.board[0][0].isRevealed).toBe(true)
  })

  it('wins when every safe cell is revealed', () => {
    let game: MinesweeperState = createMinesweeperGame(() => 0)
    for (let y = 0; y < MINESWEEPER_HEIGHT; y += 1) {
      for (let x = 0; x < MINESWEEPER_WIDTH; x += 1) {
        if (!game.board[y][x].hasMine) game = revealCell(game, x, y)
      }
    }

    expect(game.status).toBe('won')
  })
})
