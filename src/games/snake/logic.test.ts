import { describe, expect, it } from 'vitest'
import {
  createSnakeGame,
  changeDirection,
  stepSnake,
  SNAKE_BOARD_SIZE,
  type SnakeState,
} from './logic'

describe('Snake game logic', () => {
  it('creates a centered snake with food on the board', () => {
    const game = createSnakeGame(() => 0.1)

    expect(game.snake).toEqual([
      { x: 6, y: 7 },
      { x: 5, y: 7 },
      { x: 4, y: 7 },
    ])
    expect(game.food.x).toBeGreaterThanOrEqual(0)
    expect(game.food.x).toBeLessThan(SNAKE_BOARD_SIZE)
    expect(game.food.y).toBeGreaterThanOrEqual(0)
    expect(game.food.y).toBeLessThan(SNAKE_BOARD_SIZE)
    expect(game.status).toBe('playing')
  })

  it('moves forward by one cell and keeps length when food is not eaten', () => {
    const game: SnakeState = { ...createSnakeGame(), food: { x: 0, y: 0 } }
    const next = stepSnake(game)

    expect(next.snake[0]).toEqual({ x: 7, y: 7 })
    expect(next.snake).toHaveLength(3)
    expect(next.score).toBe(0)
  })

  it('grows, scores, and places new food after eating', () => {
    const game: SnakeState = { ...createSnakeGame(() => 0.9), food: { x: 7, y: 7 } }
    const next = stepSnake(game, () => 0.2)

    expect(next.snake).toHaveLength(4)
    expect(next.score).toBe(10)
    expect(next.food).not.toEqual({ x: 7, y: 7 })
  })

  it('rejects direct reverse direction while allowing perpendicular turns', () => {
    const game = createSnakeGame()

    expect(changeDirection(game, 'left').nextDirection).toBe('right')
    expect(changeDirection(game, 'up').nextDirection).toBe('up')
  })

  it('ends the game when snake hits a wall', () => {
    const game: SnakeState = {
      ...createSnakeGame(),
      snake: [{ x: SNAKE_BOARD_SIZE - 1, y: 7 }, { x: SNAKE_BOARD_SIZE - 2, y: 7 }],
      direction: 'right',
      nextDirection: 'right',
    }

    expect(stepSnake(game).status).toBe('game-over')
  })

  it('ends the game when snake collides with itself', () => {
    const game: SnakeState = {
      ...createSnakeGame(),
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 4, y: 5 },
      ],
      direction: 'left',
      nextDirection: 'down',
      food: { x: 0, y: 0 },
    }

    expect(stepSnake(game).status).toBe('game-over')
  })
})
