//@flow

import { runSpring } from "react-native-redash"
import Animated from "react-native-reanimated"

import { BASE_SPRING_CONFIG } from "./animations"

const { Value, Clock, cond, eq, stopClock, set, clockRunning } = Animated

export type SpringValue = {
  value: Value,
  clock: Clock,
  hasSprung: Value,
  hasSprungBack: Value,
}
export const createValue = (val: number): SpringValue => ({
  value: new Value(val),
  clock: new Clock(),
  hasSprung: new Value(0),
  hasSprungBack: new Value(0),
})

export const springBack = (v: SpringValue, from: number, to: number): Value => [
  cond(eq(v.hasSprung, 0), [stopClock(v.clock), set(v.hasSprung, 1)]),
  springTo(v, from, to, "hasSprungBack"),
]
const springConfig = () => ({
  ...BASE_SPRING_CONFIG,
  toValue: new Value(0),
})
export const springTo = (
  v: SpringValue,
  from: number,
  to: number,
  back: "hasSprung" | "hasSprungBack" = "hasSprung"
): Value =>
  cond(eq(v[back], 0), [
    set(v.value, runSpring(v.clock, from, to, springConfig())),
    cond(eq(clockRunning(v.clock), 0), set(v[back], 1)),
  ])

export const spring = (
  v: SpringValue,
  from: number,
  to: number,
  back: "hasSprung" | "hasSprungBack" = "hasSprung"
): typeof Value =>
  cond(eq(v[back], 0), [
    set(v.value, runSpring(v.clock, from, to, springConfig())),
    cond(eq(clockRunning(v.clock), 0), set(v[back], 1)),
  ])
