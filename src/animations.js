// @flow

import { Dimensions } from "react-native"
import Animated, { Easing } from "react-native-reanimated"

const WIDTH = Dimensions.get("window").width
const HEIGHT = Dimensions.get("window").height

const {
  set,
  cond,
  eq,
  or,
  add,
  sub,
  min,
  max,
  multiply,
  divide,
  lessThan,
  greaterThan,
  spring,
  decay,
  timing,
  diff,
  not,
  abs,
  startClock,
  stopClock,
  clockRunning,
  Value,
  Clock,
} = Animated

export function scaleDiff(value: Value) {
  const tmp = new Value(1)
  const prev = new Value(1)
  return [set(tmp, divide(value, prev)), set(prev, value), tmp]
}

export function dragDiff(value: Value, updating: Value) {
  const tmp = new Value(0)
  const prev = new Value(0)
  return cond(
    updating,
    [set(tmp, sub(value, prev)), set(prev, value), tmp],
    set(prev, 0)
  )
}

export function runSpring(
  clock: Clock,
  value: Value,
  velocity: Value,
  dest: Value
) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  }

  const config = {
    ...BASE_SPRING_CONFIG,
    toValue: new Value(0),
  }

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ]
}
// http://chenglou.github.io/react-motion/demos/demo5-spring-parameters-chooser/
export const BASE_SPRING_CONFIG = {
  // mass: The mass of the object attached to the end of the spring.
  // Default 1.
  mass: 1,
  // stiffness: The spring stiffness coefficient.
  // Default 100.
  stiffness: 120,
  // damping: Defines how the spring’s motion should be damped due to the forces of friction.
  // Default 10.
  damping: 14,
  overshootClamping: false,
  restSpeedThreshold: 0.01,
  restDisplacementThreshold: 0.01,
}
export function runSpringWithFinish(
  clock: Clock,
  value: Value,
  dest: Value,
  finished: Value = new Value(0)
) {
  const state = {
    finished,
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  }

  const config = {
    ...BASE_SPRING_CONFIG,
    toValue: new Value(0),
  }

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.time, 0),
      set(state.velocity, 0),
      set(state.position, value),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ]
}

// returns linear friction coeff. When `value` is 0 coeff is 1 (no friction), then
// it grows linearly until it reaches `MAX_FRICTION` when `value` is equal
// to `MAX_VALUE`
export function friction(value: Value) {
  const MAX_FRICTION = 5
  const MAX_VALUE = 100
  return max(
    1,
    min(MAX_FRICTION, add(1, multiply(value, (MAX_FRICTION - 1) / MAX_VALUE)))
  )
}

function speed(value) {
  const clock = new Clock()
  const dt = diff(clock)
  // if dt < 1 return 0
  // otherwise return 1000 * dv / dt
  return cond(lessThan(dt, 1), 0, multiply(1000, divide(diff(value), dt)))
}

const MIN_SCALE = 1
const MAX_SCALE = 2

// clamp
function scaleRest(value) {
  return cond(
    lessThan(value, MIN_SCALE),
    MIN_SCALE,
    cond(lessThan(MAX_SCALE, value), MAX_SCALE, value)
  )
}

export function scaleFriction(value: Value, rest: number, delta: Value) {
  const MAX_FRICTION = 20
  const MAX_VALUE = 0.5
  const res = multiply(value, delta)
  const howFar = abs(sub(rest, value))
  const friction = max(
    1,
    min(MAX_FRICTION, add(1, multiply(howFar, (MAX_FRICTION - 1) / MAX_VALUE)))
  )
  return cond(
    lessThan(0, howFar),
    multiply(value, add(1, divide(add(delta, -1), friction))),
    res
  )
}

export function runTiming(
  clock: Clock,
  value: Value,
  dest: Value,
  startStopClock: boolean = true
) {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    frameTime: new Value(0),
    time: new Value(0),
  }

  const config = {
    toValue: new Value(0),
    duration: 300,
    easing: Easing.inOut(Easing.cubic),
  }

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.frameTime, 0),
      set(state.time, 0),
      set(state.position, value),
      set(config.toValue, dest),
      startStopClock && startClock(clock),
    ]),
    timing(clock, state, config),
    cond(state.finished, startStopClock && stopClock(clock)),
    state.position,
  ]
}

export function runDecay(clock: Clock, value: Value, velocity: Value) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  }

  const config = { deceleration: 0.99 }

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(state.time, 0),
      startClock(clock),
    ]),
    set(state.position, value),
    decay(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ]
}

export function bouncyPinch(
  value: Value /** input */,
  gesture: Value /** input */,
  gestureActive: Value /** input */,
  focalX: Value /** input */,
  displacementX: Value /** input & output */,
  focalY: Value /** input */,
  displacementY: Value /** input */
) {
  const clock = new Clock()

  const delta = scaleDiff(gesture)
  const rest = scaleRest(value)
  const focalXRest = cond(
    lessThan(value, 1),
    0,
    sub(displacementX, multiply(focalX, add(-1, divide(rest, value))))
  )
  const focalYRest = cond(
    lessThan(value, 1),
    0,
    sub(displacementY, multiply(focalY, add(-1, divide(rest, value))))
  )
  const nextScale = new Value(1)

  return cond(
    [delta, gestureActive],
    [
      stopClock(clock),
      set(nextScale, scaleFriction(value, rest, delta)),
      set(
        displacementX,
        sub(displacementX, multiply(focalX, add(-1, divide(nextScale, value))))
      ),
      set(
        displacementY,
        sub(displacementY, multiply(focalY, add(-1, divide(nextScale, value))))
      ),
      nextScale,
    ],
    cond(
      or(clockRunning(clock), not(eq(rest, value))),
      [
        set(displacementX, runTiming(clock, displacementX, focalXRest, false)),
        set(displacementY, runTiming(clock, displacementY, focalYRest, false)),
        runTiming(clock, value, rest),
      ],
      value
    )
  )
}

export function bouncy(
  value: Value /** input */,
  gestureDiv: Value,
  gestureActive: Value,
  lowerBound: Value,
  upperBound: Value,
  friction: Value
) {
  const timingClock = new Clock()
  const decayClock = new Clock()

  const velocity = speed(value)

  // did value go beyond the limits (lower, upper)
  const isOutOfBounds = or(
    lessThan(value, lowerBound),
    lessThan(upperBound, value)
  )
  // position to snap to (upper or lower is beyond or the current value elsewhere)
  const rest = cond(
    lessThan(value, lowerBound),
    lowerBound,
    cond(lessThan(upperBound, value), upperBound, value)
  )
  // how much the value exceeds the bounds, this is used to calculate friction
  const outOfBounds = abs(sub(rest, value))

  return cond(
    [gestureDiv, velocity, gestureActive],
    [
      stopClock(timingClock),
      stopClock(decayClock),
      add(value, divide(gestureDiv, friction(outOfBounds))),
    ],
    cond(
      or(clockRunning(timingClock), isOutOfBounds),
      [stopClock(decayClock), runTiming(timingClock, value, rest)],
      cond(
        or(clockRunning(decayClock), lessThan(5, abs(velocity))),
        runDecay(decayClock, value, velocity),
        value
      )
    )
  )
}

/** Zooms out if already zoomed, otherwise maximally zooms to tap point. */
export function zoomTo(
  scale: Value,
  doubleTapX: Value,
  doubleTapY: Value,
  panTransX: Value,
  panTransY: Value,
  focalDisplacementX: Value,
  focalDisplacementY: Value
) {
  //const scaleDoubleTapClock = new Clock();
  //const animatedValue = new Value(1);

  // x,y starts from TOP LEFT and are positive values

  // 0,0 -> want to center top left corner -> displace +1/2 screen
  // center,ceenter -> want to center img -> don't displace

  // tap is relative to the dimensions of the screen.
  // the image will be smaller than the screen on one dimension.
  // the coordinates of the touch event need to be scaled down to fit the image.
  return [
    //  debug("x", doubleTapX),
    //  debug("y", doubleTapY),
    //set(focalDisplacementY, new Value(0)),
    //set(focalDisplacementX, new Value(0)),
    set(panTransY, new Value(0)),
    set(panTransX, new Value(0)),
    set(
      // panTransY,
      focalDisplacementY,
      cond(greaterThan(scale, 1), new Value(0), sub(HEIGHT, doubleTapY))
      //cond(greaterThan(scale, 1), new Value(0), sub(HEIGHT,doubleTapY))
    ),
    set(
      //panTransX,
      focalDisplacementX,
      cond(greaterThan(scale, 1), new Value(0), sub(WIDTH, doubleTapX))
      // cond(greaterThan(scale, 1), new Value(0), sub(WIDTH, doubleTapX))
    ),
    set(scale, cond(greaterThan(scale, 1), new Value(1), new Value(2))),
    // runSpring(
    //   scaleDoubleTapClock,
    //   scale,
    //   new Value(1),
    //   cond(greaterThan(scale, 1), new Value(1), new Value(2))
    // )
  ]
}
