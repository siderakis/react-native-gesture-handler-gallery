// @flow

import { Dimensions, StyleSheet } from "react-native"
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
  TapGestureHandler,
} from "react-native-gesture-handler"
import Animated from "react-native-reanimated"
import FastImage from "react-native-fast-image"
import React, { PureComponent } from "react"

import { type SpringValue, createValue, springBack, springTo } from "./spring"
import {
  bouncy,
  bouncyPinch,
  dragDiff,
  friction,
  runSpring,
} from "./animations"

const {
  call,
  set,
  cond,
  eq,
  or,
  add,
  sub,
  max,
  multiply,
  divide,
  lessThan,
  block,
  Value,
  Clock,
  event,
  greaterThan,
  Extrapolate,
} = Animated

const WIDTH = Dimensions.get("window").width
const HEIGHT = Dimensions.get("window").height
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage)

type Props = {
  simultaneousHandlers: any[],
  source: any,
  width: number,
  height: number,

  transform: any,
  maskWidth: number,
  maskHeight: number,
  borderRadius: number,
  doubleTapRef: any,
  // 0-1 for modal animated out-in.
  mainValue: Value,
}
export default class ImageViewer extends PureComponent<Props> {
  static whyDidYouRender = true

  pinchRef = React.createRef<*>()
  panRef = React.createRef<*>()
  rotateRef = React.createRef<*>()
  _rotate: Animated.Value
  _scale: Animated.Value
  _focalDisplacementX: Animated.Value
  _focalDisplacementY: Animated.Value
  _panTransX: Animated.Value
  _panTransY: Animated.Value
  _onPanEvent: any
  _onPinchEvent: any
  _handleRotate: any
  _onDoubleTapEvent: any
  width: number
  height: number

  constructor(props: Props) {
    super(props)

    this.width = props.width
    this.height = props.height

    // image to device ratio
    const hRatio = this.height / Dimensions.get("window").height
    const wRatio = this.width / Dimensions.get("window").width

    const MAX_SIZE = 2
    // image ratio
    const widthToHeightRatio = this.width / this.height
    if (hRatio > wRatio) {
      if (hRatio > MAX_SIZE) {
        this.height = Dimensions.get("window").height * MAX_SIZE
        this.width = widthToHeightRatio * this.height
      }
    } else {
      if (wRatio > MAX_SIZE) {
        this.width = Dimensions.get("window").width * MAX_SIZE
        this.height = 1 / (widthToHeightRatio / this.width)
      }
    }
    // ROTATE
    this._rotate = new Value(0)
    this._handleRotate = event([
      {
        nativeEvent: ({ rotation: r, state, velocity }) =>
          block([
            set(this._rotate, r),
            cond(eq(state, State.END), [
              set(
                this._rotate,
                runSpring(new Clock(), this._rotate, velocity, new Value(0))
              ),
            ]),
          ]),
      },
    ])

    // DECLARE TRANSX
    const panTransX = new Value(0)
    const panTransY = new Value(0)

    // PINCH
    const pinchScale = new Value(1)
    const pinchFocalX = new Value(0)
    const pinchFocalY = new Value(0)
    const pinchState = new Value(-1)

    const zoomIn = new Value(0)
    const zoomOut = new Value(0)

    const scale: SpringValue = createValue(1)

    this._onPinchEvent = event([
      {
        nativeEvent: {
          state: pinchState,
          scale: pinchScale,
          focalX: pinchFocalX,
          focalY: pinchFocalY,
        },
      },
    ])

    // DOUBLE TAP
    // const doubleTapState = new Value(-1)
    // const doubleTapX = new Value(0)
    // const doubleTapY = new Value(0)
    this._onDoubleTapEvent = event([
      {
        nativeEvent: ({ oldState, x, y }) =>
          block([
            cond(eq(oldState, State.ACTIVE), [
              //call([], (a) => alert("TAPPED" + a)),
              set(zoomIn, cond(lessThan(scale.value, 1.1), 1)),
            ]),
          ]),
      },
    ])
    // this._onDoubleTapEvent = (event: any) => {
    //   if (event.nativeEvent.state === State.ACTIVE) {
    //     alert("TAPPED")
    // springTo(scale, 1, 2)

    // if (scale.value.__getValue() < 1.1) {
    // alert("zoom in" + scale.value.__getValue())
    // } else {
    // alert("zoom out" + scale.value.__getValue())
    // }
    //   }
    // }

    // event([
    //   {
    //     nativeEvent: {
    //       state: doubleTapState,
    //       x: doubleTapX,
    //       y: doubleTapY,
    //     },
    //   },
    // ])

    // doubleTapActive,
    // zoomTo(
    //   scale,
    //   doubleTapX,
    //   doubleTapY,
    //   panTransX,
    //   panTransY,
    //   this._focalDisplacementX,
    //   this._focalDisplacementY
    // ),

    // SCALE
    const pinchActive = eq(pinchState, State.ACTIVE)
    //const doubleTapActive = eq(doubleTapState, State.END)

    // relativeFocalX = pinchFocalX - (panTransX + _focalDisplacementX)
    this._focalDisplacementX = new Value(0)
    const relativeFocalX = sub(
      pinchFocalX,
      add(panTransX, this._focalDisplacementX)
    )
    this._focalDisplacementY = new Value(0)
    const relativeFocalY = sub(
      pinchFocalY,
      add(panTransY, this._focalDisplacementY)
    )

    // PAN
    const dragX = new Value(0)
    const dragY = new Value(0)
    const panState = new Value(-1)
    this._onPanEvent = event([
      {
        nativeEvent: {
          translationX: dragX,
          translationY: dragY,
          state: panState,
        },
      },
    ])

    const panActive = eq(panState, State.ACTIVE)
    const panFriction = (value) => friction(value)

    this._scale = set(
      scale.value,

      cond(
        zoomIn,
        springTo(scale, 1, 2),
        cond(
          zoomOut,
          springBack(scale, 2, 1),
          bouncyPinch(
            scale.value,
            pinchScale,
            pinchActive,
            relativeFocalX,
            this._focalDisplacementX,
            relativeFocalY,
            this._focalDisplacementY
          )
        )
      )
    )

    // X
    const panUpX = cond(
      lessThan(this._scale, 1),
      0,
      multiply(-1, this._focalDisplacementX)
    )
    const panLowX = add(panUpX, multiply(-WIDTH, add(max(1, this._scale), -1)))
    this._panTransX = set(
      panTransX,
      bouncy(
        panTransX,
        dragDiff(dragX, panActive),
        or(panActive, pinchActive),
        panLowX,
        panUpX,
        panFriction
      )
    )

    // Y
    const panUpY = cond(
      lessThan(this._scale, 1),
      0,
      multiply(-1, this._focalDisplacementY)
    )
    const panLowY = add(panUpY, multiply(-HEIGHT, add(max(1, this._scale), -1)))
    this._panTransY = set(
      panTransY,
      bouncy(
        panTransY,
        dragDiff(dragY, panActive),
        or(panActive, pinchActive),
        panLowY,
        panUpY,
        panFriction
      )
    )
  }
  render() {
    const { simultaneousHandlers, mainValue } = this.props
    // The below two animated values makes it so that scale appears to be done
    // from the top left corner of the image view instead of its center. This
    // is required for the "scale focal point" math to work correctly
    //
    // scaleTopLeftFixX = WIDTH * (_scale - 1) / 2
    const scaleTopLeftFixX = divide(multiply(WIDTH, add(this._scale, -1)), 2)
    const scaleTopLeftFixY = divide(multiply(HEIGHT, add(this._scale, -1)), 2)

    return (
      <TapGestureHandler
        enabled={false}
        ref={this.props.doubleTapRef}
        numberOfTaps={2}
        onHandlerStateChange={this._onDoubleTapEvent}>
        <Animated.View style={styles.wrapper}>
          <RotationGestureHandler
            ref={this.rotateRef}
            simultaneousHandlers={[
              this.panRef,
              this.pinchRef,
              ...simultaneousHandlers,
            ]}
            onGestureEvent={this._handleRotate}
            onHandlerStateChange={this._handleRotate}>
            <Animated.View style={styles.wrapper}>
              <PinchGestureHandler
                ref={this.pinchRef}
                simultaneousHandlers={[
                  this.panRef,
                  this.rotateRef,
                  ...simultaneousHandlers,
                ]}
                onGestureEvent={this._onPinchEvent}
                onHandlerStateChange={this._onPinchEvent}>
                <Animated.View style={styles.wrapper}>
                  <PanGestureHandler
                    ref={this.panRef}
                    avgTouches
                    simultaneousHandlers={[
                      this.pinchRef,
                      this.rotateRef,
                      ...simultaneousHandlers,
                    ]}
                    onGestureEvent={this._onPanEvent}
                    onHandlerStateChange={this._onPanEvent}>
                    <Animated.View
                      style={{
                        width: this.props.maskWidth,
                        height: this.props.maskHeight,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        borderRadius: this.props.borderRadius,
                        transform: [
                          { translateX: scale0(mainValue, this._panTransX) },
                          { translateY: scale0(mainValue, this._panTransY) },
                          {
                            translateX: scale0(
                              mainValue,
                              this._focalDisplacementX
                            ),
                          },
                          {
                            translateY: scale0(
                              mainValue,
                              this._focalDisplacementY
                            ),
                          },
                          { translateX: scale0(mainValue, scaleTopLeftFixX) },
                          { translateY: scale0(mainValue, scaleTopLeftFixY) },
                          ...this.props.transform,
                          { perspective: 200 },
                          { rotate: this._rotate },
                          {
                            scale: scale1(mainValue, this._scale),
                          },
                        ],
                      }}>
                      <AnimatedFastImage
                        source={this.props.source}
                        style={{
                          borderRadius: this.props.borderRadius,
                          width: this.props.width,
                          height: this.props.height,
                        }}
                        resizeMode={FastImage.resizeMode.contain}
                      />
                    </Animated.View>
                  </PanGestureHandler>
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </RotationGestureHandler>
        </Animated.View>
      </TapGestureHandler>
    )
  }
}

function scale0(mainValue: Value, value: Value) {
  return mainValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, value],
    extrapolate: Extrapolate.CLAMP,
  })
}

function scale1(mainValue: Value, value: Value) {
  return mainValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, value],
    extrapolate: Extrapolate.CLAMP,
  })
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})
