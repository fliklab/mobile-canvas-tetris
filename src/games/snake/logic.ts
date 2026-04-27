export const SNAKE_BOARD_SIZE = 15

export type Direction = 'up' | 'down' | 'left' | 'right'
export type SnakeStatus = 'playing' | 'paused' | 'game-over'

export interface Point {
  x: number
  y: number
}

export interface SnakeState {
  snake: Point[]
  food: Point
  direction: Direction
  nextDirection: Direction
  score: number
  status: SnakeStatus
}

type RandomFn = () => number

export function createSnakeGame(random: RandomFn = Math.random): SnakeState {
  const snake = [
    { x: 6, y: 7 },
    { x: 5, y: 7 },
    { x: 4, y: 7 },
  ]

  return {
    snake,
    food: placeFood(snake, random),
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    status: 'playing',
  }
}

export function changeDirection(game: SnakeState, direction: Direction): SnakeState {
  if (isOpposite(game.direction, direction)) return game
  return { ...game, nextDirection: direction }
}

export function stepSnake(game: SnakeState, random: RandomFn = Math.random): SnakeState {
  if (game.status !== 'playing') return game

  const direction = game.nextDirection
  const head = game.snake[0]
  const nextHead = movePoint(head, direction)

  if (isOutside(nextHead)) return { ...game, direction, nextDirection: direction, status: 'game-over' }

  const eatsFood = samePoint(nextHead, game.food)
  const bodyToCheck = eatsFood ? game.snake : game.snake.slice(0, -1)
  if (bodyToCheck.some((point) => samePoint(point, nextHead))) {
    return { ...game, direction, nextDirection: direction, status: 'game-over' }
  }

  const snake = [nextHead, ...game.snake]
  if (!eatsFood) snake.pop()

  return {
    ...game,
    snake,
    direction,
    nextDirection: direction,
    food: eatsFood ? placeFood(snake, random) : game.food,
    score: eatsFood ? game.score + 10 : game.score,
  }
}

export function toggleSnakePause(game: SnakeState): SnakeState {
  if (game.status === 'game-over') return game
  return { ...game, status: game.status === 'paused' ? 'playing' : 'paused' }
}

function movePoint(point: Point, direction: Direction): Point {
  if (direction === 'up') return { x: point.x, y: point.y - 1 }
  if (direction === 'down') return { x: point.x, y: point.y + 1 }
  if (direction === 'left') return { x: point.x - 1, y: point.y }
  return { x: point.x + 1, y: point.y }
}

function isOutside(point: Point): boolean {
  return point.x < 0 || point.x >= SNAKE_BOARD_SIZE || point.y < 0 || point.y >= SNAKE_BOARD_SIZE
}

function isOpposite(current: Direction, next: Direction): boolean {
  return (
    (current === 'up' && next === 'down') ||
    (current === 'down' && next === 'up') ||
    (current === 'left' && next === 'right') ||
    (current === 'right' && next === 'left')
  )
}

function placeFood(snake: Point[], random: RandomFn): Point {
  const empty: Point[] = []
  for (let y = 0; y < SNAKE_BOARD_SIZE; y += 1) {
    for (let x = 0; x < SNAKE_BOARD_SIZE; x += 1) {
      if (!snake.some((point) => point.x === x && point.y === y)) empty.push({ x, y })
    }
  }

  const index = Math.max(0, Math.min(empty.length - 1, Math.floor(random() * empty.length)))
  return empty[index] ?? { x: 0, y: 0 }
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}
