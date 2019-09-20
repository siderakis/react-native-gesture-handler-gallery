// @flow

import { State } from "react-native-gesture-handler"
import { StyleSheet } from "react-native"
import { runSpring } from "react-native-redash"
import Animated from "react-native-reanimated"
import FastImage from "react-native-fast-image"
import React from "react"

import { BASE_SPRING_CONFIG } from "./animations"
import { createValue, springBack, springTo } from "./spring"

const AnimatedFastImage = Animated.createAnimatedComponent(FastImage)

const {
  set,
  cond,
  eq,
  call,
  clockRunning,
  Value,
  Clock,
  interpolate,
  Extrapolate,
} = Animated

const springConfig = () => ({
  ...BASE_SPRING_CONFIG,
  toValue: new Value(0),
})

type Props = {
  pinchState: Value,
  pinchFocalX: Value,
  pinchFocalY: Value,
  pinchScale: Value,
  borderRadius: Value,
  translateX: Value,
  translateY: Value,
  width: Value,
  height: Value,
  rotate: Value,
  x: number,
  y: number,
  maskWidth: number,
  maskHeight: number,
  source: {
    uri: string,
  },
  closePincher: () => mixed,
}
const MaskedImage = React.memo<Props>(function({
  pinchState,
  // pinchFocalX,
  // pinchFocalY,
  pinchScale,
  borderRadius,
  translateX,
  translateY,
  width,
  height,
  rotate,
  x,
  y,
  maskWidth,
  maskHeight,
  source,
  closePincher,
}: Props) {
  const mainValue = createValue(0)
  const scale = new Value(1)
  if (!width || !maskWidth) {
    closePincher && closePincher()
    return null
  }
  const maskWidth1 = interpolate(mainValue.value, {
    inputRange: [0, 1],
    outputRange: [width, maskWidth],
    extrapolate: Extrapolate.CLAMP,
  })
  const maskHeight1 = interpolate(mainValue.value, {
    inputRange: [0, 1],
    outputRange: [height, maskHeight],
    extrapolate: Extrapolate.CLAMP,
  })
  const backgroundOpacity = interpolate(scale, {
    inputRange: [1, 1.4, 2],
    outputRange: [0, 0.4, 0.8],
    extrapolate: Extrapolate.CLAMP,
  })
  const borderRadius1 = interpolate(scale, {
    inputRange: [1, 1.2],
    outputRange: [borderRadius, 0],
    extrapolate: Extrapolate.CLAMP,
  })

  const close = new Value(0)
  Animated.useCode(cond(close, call([], closePincher)), [close, closePincher])

  Animated.useCode(
    cond(
      eq(pinchState, State.ACTIVE),
      [springTo(mainValue, 0, 1), set(scale, pinchScale)],
      [
        springBack(mainValue, 1, 0),
        set(scale, runSpring(new Clock(), pinchScale, 1), springConfig()),
        cond(eq(clockRunning(mainValue.clock), 0), set(close, 1)),
      ]
    )
  )

  //TODO: zoom to point pinched. also allow pan.
  // const scaleTopLeftFixX = divide(multiply(wWidth, add(pinchScale, -1)), 2);
  // const scaleTopLeftFixY = divide(multiply(wHeight, add(pinchScale, -1)), 2);
  // const focalDisplacementX = new Value(0);
  //
  // const relativeFocalX = sub(pinchFocalX, add(x, focalDisplacementX));
  // const focalDisplacementY = new Value(0);
  // const relativeFocalY = sub(pinchFocalY, add(y, focalDisplacementY));
  // const scale = bouncyPinch(
  //   new Value(1),
  //   pinchScale,
  //   eq(pinchState, State.ACTIVE),
  //   relativeFocalX,
  //   focalDisplacementX,
  //   relativeFocalY,
  //   focalDisplacementY
  // );

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={{
          opacity: backgroundOpacity,
          backgroundColor: "#000",
          ...StyleSheet.absoluteFillObject,
        }}
      />
      <Animated.View
        style={{
          width: maskWidth1,
          height: maskHeight1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: borderRadius1,
          transform: [
            { translateX: x },
            { translateY: y },
            { translateX },
            { translateY },
            //{ translateX: focalDisplacementX },
            //{ translateY: focalDisplacementY },
            // { translateX: scaleTopLeftFixX },
            // { translateY: scaleTopLeftFixY },
            //{ translateX: pinchFocalX },
            //{ translateY: pinchFocalY },
            { rotate },
            { scale },
          ],
        }}>
        <AnimatedFastImage
          source={source}
          style={{
            width: maskWidth1,
            height: maskHeight1,
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
      </Animated.View>
    </Animated.View>
  )
})

MaskedImage.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: "MaskedImage",
}
export default MaskedImage
