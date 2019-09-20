// @flow

import {
  BackHandler,
  Dimensions,
  StatusBar,
  StyleSheet,
  View,
} from "react-native"
import {
  PanGestureHandler,
  State,
  TapGestureHandler,
} from "react-native-gesture-handler"
import { runSpring, runTiming } from "react-native-redash"
import Animated, { Easing } from "react-native-reanimated"
import React, { PureComponent } from "react"

import { type NavigationState, TabView } from "./tabview"
import type { OverlayProps, Story, ThumbnailImageData } from "./types"
import type { Route, SceneRendererProps } from "./tabview/types"
import ImageViewer from "./ImageViewer"

const {
  Value,
  Clock,
  cond,
  eq,
  set,
  block,
  clockRunning,
  startClock,
  event,
  multiply,
  and,
  or,
  not,
  lessOrEq,
  greaterThan,
  call,
  interpolate,
  Extrapolate,
  timing,
} = Animated
const { width: wWidth, height: wHeight } = Dimensions.get("window")

function closeModal(clock, finished) {
  const state = {
    finished,
    position: new Value(1),
    time: new Value(0),
    frameTime: new Value(0),
  }

  const config = {
    duration: 300,
    toValue: new Value(0),
    easing: Easing.inOut(Easing.ease),
  }

  return block([
    cond(clockRunning(clock), 0, startClock(clock)),
    timing(clock, state, config),
    state.position,
  ])
}

const Page = React.memo<*>(
  ({
    pagerPanRef,
    modalPanRef,
    route,
    width,
    height,
    transform,
    maskWidth,
    maskHeight,
    borderRadius,
    doubleTapRef,
    mainValue,
  }: any) => (
    <ImageViewer
      {...{
        width,
        height,
        transform,
        maskWidth,
        maskHeight,
        borderRadius,
        mainValue,
      }}
      source={route.source}
      simultaneousHandlers={[pagerPanRef, modalPanRef]}
      doubleTapRef={doubleTapRef}
    />
  )
)

Page.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: "Page",
}

type ModalProps = {
  stories: Story[],
  selectedIndex: number,
  position: ThumbnailImageData,
  onRequestClose: () => void,
  goToStory: (number) => mixed,
  renderOverlay: (OverlayProps) => React$Node,
}
type ModalState = NavigationState<{
  key: string,
  id: string,
  source: any,
}>

export default class GalleryModal extends PureComponent<
  ModalProps,
  ModalState
> {
  static whyDidYouRender = true

  pagerPanRef = React.createRef<*>()
  modalPanRef = React.createRef<*>()

  //so that the single tap can waitFor the double tap
  doubleTapRefs: any[]
  overlayActive = new Value(0)
  overlayClock = new Clock()
  close = new Value(0)
  closingActive = new Value(0)
  closedFinished = new Value(0)
  clock = new Clock()
  panState = new Value(State.UNDETERMINED)
  velocityY = new Value(0)
  mainValue: Value
  translateX: Value
  translateY: Value
  width: Value
  height: Value
  onGestureEvent: any
  onTapStateChange: any
  maskWidth: Value
  maskHeight: Value

  thumbnailX: Value
  thumbnailY: Value
  thumbnailWidth: Value
  thumbnailHeight: Value
  thumbnailMaskWidth: Value
  thumbnailMaskHeight: Value

  initialLayout = {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  }

  backgroundOpacity: Value
  borderRadius: Value
  transform: Value
  constructor(props: ModalProps) {
    super(props)
    const {
      x,
      y,
      width,
      height,
      // fullWidth,
      // fullHeight,
      containWidth,
      containHeight,
    } = this.props.position
    this.translateX = new Value(x)
    this.translateY = new Value(y)
    this.width = new Value(containWidth)
    this.height = new Value(containHeight)
    this.maskWidth = new Value(width)
    this.maskHeight = new Value(height)

    this.thumbnailX = new Value(x)
    this.thumbnailY = new Value(y)
    this.thumbnailWidth = new Value(containWidth)
    this.thumbnailHeight = new Value(containHeight)
    this.thumbnailMaskWidth = new Value(width)
    this.thumbnailMaskHeight = new Value(height)

    const translationX = new Value(0)
    const translationY = new Value(0)

    this.doubleTapRefs = props.stories.map(() => React.createRef())

    this.state = {
      index: props.selectedIndex || 0,
      routes: props.stories.map((s, index) => ({
        ...s,
        key: s.id,
        doubleTapRef: this.doubleTapRefs[index],
      })),
    }

    this.onGestureEvent = event([
      {
        nativeEvent: {
          translationX: translationX,
          translationY: translationY,
          velocityY: this.velocityY,
          state: this.panState,
        },
      },
    ])

    const panIsActive = eq(this.panState, State.ACTIVE)
    this.mainValue = new Animated.Value(0)
    //cross scene animation

    // TODO: close animation should start from the current panned location, not
    // the full screen location.
    this.translateX = cond(
      panIsActive,
      translationX,
      interpolate(this.mainValue, {
        inputRange: [0, 1],
        outputRange: [
          this.thumbnailX,
          cond(this.closingActive, translationX, 0),
        ],
      })
    )

    this.translateY = cond(
      panIsActive,
      translationY,
      interpolate(this.mainValue, {
        inputRange: [0, 1],
        outputRange: [
          this.thumbnailY,
          cond(this.closingActive, translationY, 0),
        ],
      })
    )

    this.width = cond(
      panIsActive,
      interpolate(translationY, {
        inputRange: [0, 20],
        outputRange: [wWidth, multiply(wWidth, 0.8)],
        extrapolate: Extrapolate.CLAMP,
      }),
      interpolate(this.mainValue, {
        inputRange: [0, 1],
        outputRange: [this.thumbnailWidth, wWidth],
      })
    )
    this.height = cond(
      panIsActive,
      interpolate(translationY, {
        inputRange: [0, 20],
        outputRange: [wHeight, multiply(wHeight, 0.8)],
        extrapolate: Extrapolate.CLAMP,
      }),
      interpolate(this.mainValue, {
        inputRange: [0, 1],
        outputRange: [this.thumbnailHeight, wHeight],
      })
    )

    this.maskWidth = cond(
      panIsActive,
      interpolate(translationY, {
        inputRange: [0, 20],
        outputRange: [wWidth, multiply(wWidth, 0.8)],
        extrapolate: Extrapolate.CLAMP,
      }),
      interpolate(this.mainValue, {
        inputRange: [0, 1],
        outputRange: [this.thumbnailMaskWidth, wWidth],
      })
    )
    this.maskHeight = cond(
      panIsActive,
      interpolate(translationY, {
        inputRange: [0, 20],
        outputRange: [wHeight, multiply(wHeight, 0.8)],
        extrapolate: Extrapolate.CLAMP,
      }),
      interpolate(this.mainValue, {
        inputRange: [0, 1],
        outputRange: [this.thumbnailMaskHeight, wHeight],
      })
    )
    this.backgroundOpacity = cond(
      panIsActive,
      interpolate(translationY, {
        inputRange: [1, 100],
        outputRange: [1, 0],
        extrapolate: Extrapolate.CLAMP,
      }),
      cond(
        this.closingActive,
        0,
        interpolate(this.mainValue, {
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 0, 1, 1],
          extrapolate: Extrapolate.CLAMP,
        })
      )
    )
    this.borderRadius = interpolate(this.mainValue, {
      inputRange: [0.5, 1],
      // make this an input
      outputRange: [5, 0],
      extrapolate: Extrapolate.CLAMP,
    })

    this.transform = [
      { translateX: this.translateX },
      { translateY: this.translateY },
    ]

    const showOverlay = new Value(1)
    this.overlayActive = cond(
      and(not(this.closingActive), showOverlay),
      runTiming(this.overlayClock, this.overlayActive, {
        duration: 1000,
        toValue: 1,
        easing: Easing.elastic(),
      }),
      runTiming(this.overlayClock, this.overlayActive, {
        duration: 1000,
        toValue: 0,
        easing: Easing.elastic(),
      })
    )

    this.onTapStateChange = event([
      {
        nativeEvent: ({ oldState }) =>
          block([
            cond(
              eq(oldState, State.ACTIVE),
              set(showOverlay, not(showOverlay))
            ),
          ]),
      },
    ])
  }

  componentDidMount() {
    BackHandler.addEventListener("hardwareBackPress", this.handleBackPress)
  }

  componentWillUnmount() {
    BackHandler.removeEventListener("hardwareBackPress", this.handleBackPress)
  }

  handleBackPress = () => {
    this.onRequestClose()
    return true
  }
  onIndexChange = (index: number) => {
    this.setState({ index })
    this.props.goToStory(index)
  }
  onRequestClose = () => this.close.setValue(1)

  renderScene = ({ route }: { ...SceneRendererProps, route: Route }) => {
    const {
      width,
      height,
      maskWidth,
      maskHeight,
      borderRadius,
      transform,
      mainValue,
    } = this

    return (
      <Page
        pagerPanRef={this.pagerPanRef}
        modalPanRef={this.modalPanRef}
        route={route}
        doubleTapRef={route.doubleTapRef}
        {...{
          width,
          height,
          transform,
          maskWidth,
          maskHeight,
          borderRadius,
          mainValue,
        }}
      />
    )
  }
  render() {
    const {
      onGestureEvent,
      backgroundOpacity,
      initialLayout,
      overlayActive,
    } = this

    return (
      <React.Fragment>
        <StatusBar hidden />
        <Animated.Code
          key={this.props.selectedIndex}
          exec={() => {
            const {
              x,
              y,
              width,
              height,
              containWidth,
              containHeight,
            } = this.props.position
            return block([
              set(this.thumbnailX, x),
              set(this.thumbnailY, y),
              set(this.thumbnailWidth, containWidth),
              set(this.thumbnailHeight, containHeight),
              set(this.thumbnailMaskWidth, width),
              set(this.thumbnailMaskHeight, height),
            ])
          }}
        />
        <Animated.Code
          exec={() =>
            block([
              set(this.mainValue, runSpring(this.clock, this.mainValue, 1)),
              cond(
                or(
                  this.close,
                  and(
                    eq(this.panState, State.END),
                    greaterThan(this.velocityY, 0)
                  )
                ),
                [
                  set(this.closingActive, 1),
                  set(
                    this.mainValue,
                    closeModal(this.clock, this.closedFinished)
                  ),
                ]
              ),

              cond(
                and(eq(this.panState, State.END), lessOrEq(this.velocityY, 0)),
                set(this.mainValue, runSpring(this.clock, this.mainValue, 1))
              ),
              cond(this.closedFinished, call([], this.props.onRequestClose)),
            ])
          }
        />
        <TapGestureHandler
          numberOfTaps={1}
          waitFor={this.doubleTapRefs}
          onHandlerStateChange={this.onTapStateChange}>
          <Animated.View style={StyleSheet.absoluteFill}>
            <Animated.View
              style={{
                opacity: backgroundOpacity,
                backgroundColor: "#000",
                ...StyleSheet.absoluteFillObject,
              }}
            />
            <PanGestureHandler
              ref={this.modalPanRef}
              simultaneousHandlers={this.pagerPanRef}
              maxPointers={1}
              activeOffsetY={20}
              failOffsetY={-20}
              failOffsetX={[-20, 20]}
              onHandlerStateChange={onGestureEvent}
              {...{ onGestureEvent }}>
              <Animated.View style={StyleSheet.absoluteFill}>
                <TabView
                  pagerPanRef={this.pagerPanRef}
                  simultaneousHandlers={this.modalPanRef}
                  navigationState={this.state}
                  lazy
                  renderScene={this.renderScene}
                  onIndexChange={this.onIndexChange}
                  initialLayout={initialLayout}
                />
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </TapGestureHandler>
        <View style={styles.overlay} pointerEvents="box-none">
          {!!this.props.renderOverlay &&
            this.props.renderOverlay({
              overlayActive,
              index: this.state.index,
              close: this.onRequestClose,
            })}
        </View>
      </React.Fragment>
    )
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
})
