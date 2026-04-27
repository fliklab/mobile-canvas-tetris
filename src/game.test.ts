import { describe, expect, it } from 'vitest'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  createGame,
  hardDrop,
  movePiece,
  rotatePiece,
  tick,
} from './game'

describe('Tetris game logic', () => {
  it('creates an empty 10x20 board with an active piece', () => {
    const game = createGame(() => 0)

    expect(game.board).toHaveLength(BOARD_HEIGHT)
    expect(game.board.every((row) => row.length === BOARD_WIDTH)).toBe(true)
    expect(game.board.flat().every((cell) => cell === null)).toBe(true)
    expect(game.active.type).toBe('I')
    expect(game.active.x).toBe(3)
    expect(game.active.y).toBe(0)
    expect(game.status).toBe('playing')
  })

  it('moves the active piece horizontally when the target cells are valid', () => {
    const game = createGame(() => 1)
    const moved = movePiece(game, -1)

    expect(moved.active.x).toBe(game.active.x - 1)
    expect(moved.board).toEqual(game.board)
  })

  it('prevents a piece from moving beyond the left wall', () => {
    let game = createGame(() => 0)

    for (let i = 0; i < 8; i += 1) {
      game = movePiece(game, -1)
    }

    expect(game.active.x).toBe(0)
  })

  it('rotates a piece when rotation remains in bounds', () => {
    const game = createGame(() => 4)
    const rotated = rotatePiece(game)

    expect(rotated.active.rotation).toBe(1)
    expect(rotated.active.cells).not.toEqual(game.active.cells)
  })

  it('locks a piece, clears a full line, and awards score', () => {
    const game = createGame(() => 0)
    const bottom = Array.from({ length: BOARD_WIDTH }, (_, x) => (x < 4 ? null : 'Z'))
    const withAlmostFullBottom = {
      ...game,
      active: { ...game.active, x: 0 },
      board: game.board.map((row, y) => (y === BOARD_HEIGHT - 1 ? bottom : row)),
    }

    const dropped = hardDrop(withAlmostFullBottom)

    expect(dropped.lines).toBe(1)
    expect(dropped.score).toBe(100)
    expect(dropped.board[BOARD_HEIGHT - 1].every((cell) => cell === null)).toBe(true)
    expect(dropped.active.type).toBe('I')
  })

  it('advances downward on tick without locking when space exists', () => {
    const game = createGame(() => 2)
    const next = tick(game)

    expect(next.active.y).toBe(game.active.y + 1)
    expect(next.status).toBe('playing')
  })
})
