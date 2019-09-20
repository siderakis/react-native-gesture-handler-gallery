// @flow

import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
  TapGestureHandler,
} from "react-native-gesture-handler"
import { Platform, StyleSheet, View } from "react-native"
import Animated from "react-native-reanimated"
import FastImage from "react-native-fast-image"
import * as React from "react"

import type { Story } from "./types"
import { runSpring } from "./animations"

const {
  set,
  cond,
  eq,
  sub,
  min,
  max,
  multiply,
  call,
  onChange,
  block,
  Value,
  Clock,
  event,
} = Animated
const offset = (v: number) =>
  Platform.OS === "android" ? v + 20 /**Constants.statusBarHeight*/ : v

type ThumbnailProps = {
  story: Story,
  id: any,
  onPress: (key: any) => mixed,
  selected: boolean,
  style: any,
  setPinchState: (mixed) => mixed,
  waitFor?: any[] | any,
}

interface Size {
  width: number;
  height: number;
}

export default class Thumbnail extends React.PureComponent<
  ThumbnailProps,
  Size
> {
  static whyDidYouRender = true

  rotateRef = React.createRef<*>()
  pinchRef = React.createRef<*>()
  panRef = React.createRef<*>()
  pinchScale = new Value(1)
  pinchFocalX = new Value(0)
  pinchFocalY = new Value(0)
  translateX = new Value(0)
  translateY = new Value(0)
  pinchState = new Value(-1)
  _rotate = new Value(0)
  _onLongPressStateChange: any
  _onPinchEvent: any
  _handleRotate: any
  _onPanEvent: any
  constructor(props: ThumbnailProps) {
    super(props)
    this._onPinchEvent = event([
      {
        nativeEvent: {
          state: this.pinchState,
          scale: this.pinchScale,
          focalX: this.pinchFocalX,
          focalY: this.pinchFocalY,
        },
      },
    ])
    this._onPanEvent = event([
      {
        nativeEvent: ({ translationX, translationY, state }) =>
          block([
            cond(
              eq(state, State.END),
              [
                set(
                  this.translateX,
                  runSpring(new Clock(), this.translateX, 0, new Value(0))
                ),
                set(
                  this.translateY,
                  runSpring(new Clock(), this.translateY, 0, new Value(0))
                ),
              ],
              [
                set(this.translateX, translationX),
                set(this.translateY, translationY),
              ]
            ),
          ]),
      },
    ])

    this._handleRotate = event([
      {
        nativeEvent: ({ rotation: r, state, velocity }) =>
          block([
            cond(
              eq(state, State.END),
              [
                set(
                  this._rotate,
                  runSpring(new Clock(), this._rotate, velocity, new Value(0))
                ),
              ],
              [
                set(
                  this._rotate,
                  // scale down rotation until zoom'ed
                  multiply(r, max(0.1, min(1, sub(this.pinchScale, 1))))
                ),
              ]
            ),
          ]),
      },
    ])
  }
  ref = React.createRef<*>()

  onLoad = ({ nativeEvent }: any) => {
    this.setState({ width: nativeEvent.width, height: nativeEvent.height })
  }
  measure = async () =>
    new Promise(
      (resolve) =>
        this.ref.current &&
        this.ref.current.measureInWindow((x, y, width, height) => {
          const { width: fullWidth, height: fullHeight } = this.state
          const hRatio = height / fullHeight
          const wRatio = width / fullWidth

          const containRatio = hRatio < wRatio ? wRatio : hRatio
          const containHeight = fullHeight * containRatio
          const containWidth = fullWidth * containRatio

          return resolve({
            x,
            y: offset(y),
            width,
            height,
            fullWidth,
            fullHeight,
            containWidth,
            containHeight,
          })
        })
    )

  onSingleTap = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      this.props.onPress(this.props.id)
    }
  }

  showPincher = async () => {
    if (this.props.selected) {
      return
    }
    try {
      const measured = await this.measure()
      this.props.setPinchState({
        source: this.props.story.source,
        pinchState: this.pinchState,
        pinchScale: this.pinchScale,
        pinchFocalX: this.pinchFocalX,
        pinchFocalY: this.pinchFocalY,
        width: measured.width,
        height: measured.height,
        x: measured.x,
        y: measured.y,
        maskWidth: measured.containWidth,
        maskHeight: measured.containHeight,
        borderRadius: 5,
        selectedIndex: this.props.id,
        rotate: this._rotate,
        translateY: this.translateY,
        translateX: this.translateX,
      })
    } catch (e) {
      this.props.setPinchState(null)
      //console.warn(e)
    }
  }

  render() {
    const ref: any = this.ref
    const { story, onPress, selected, id, style } = this.props

    //  console.log("RENDERING Thumbnail");
    return (
      <>
        <Animated.Code
          exec={() =>
            onChange(
              this.pinchState,
              cond(
                eq(this.pinchState, State.ACTIVE),
                call([], this.showPincher)
              )
            )
          }
        />

        <PinchGestureHandler
          ref={this.pinchRef}
          simultaneousHandlers={[this.rotateRef, this.panRef]}
          onGestureEvent={this._onPinchEvent}
          onHandlerStateChange={this._onPinchEvent}
          shouldCancelWhenOutside={false}>
          <Animated.View style={[style, styles.container]}>
            <RotationGestureHandler
              enabled={false}
              ref={this.rotateRef}
              simultaneousHandlers={[this.pinchRef, this.panRef]}
              onGestureEvent={this._handleRotate}
              onHandlerStateChange={this._handleRotate}>
              <Animated.View style={{ flex: 1 }}>
                <PanGestureHandler
                  ref={this.panRef}
                  waitFor={this.props.waitFor}
                  minDeltaX={10}
                  minDeltaY={10}
                  minPointers={2}
                  onHandlerStateChange={this._onPanEvent}
                  onGestureEvent={this._onPanEvent}>
                  <Animated.View style={{ flex: 1 }}>
                    <TapGestureHandler
                      onHandlerStateChange={this.onSingleTap}
                      maxDeltaX={10}
                      maxDeltaY={10}>
                      <Animated.View style={{ flex: 1 }}>
                        {selected ? (
                          <View ref={ref} style={{ flex: 1 }} />
                        ) : (
                          <FastImage
                            ref={ref}
                            source={story.source}
                            style={styles.image}
                            onLoad={this.onLoad}
                          />
                        )}
                      </Animated.View>
                    </TapGestureHandler>
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </RotationGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
})
