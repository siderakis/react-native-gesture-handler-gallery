/* @flow */

import * as React from "react"

import type {
  Layout,
  NavigationState,
  PagerCommonProps,
  Route,
  SceneRendererProps,
} from "./types"
import { StyleSheet, View } from "react-native"

import type { LayoutEvent } from "react-native/Libraries/Types/CoreEventTypes"
import Pager from "./Pager"
import SceneView from "./SceneView"
import type { ViewStyleProp } from "react-native/Libraries/StyleSheet/StyleSheet"

type Props<T: Route> = {|
  ...PagerCommonProps,
  onIndexChange: (index: number) => mixed,
  navigationState: NavigationState<T>,
  renderScene: (props: {|
    ...SceneRendererProps,
    route: T,
  |}) => React.Node,
  renderLazyPlaceholder: (props: {| route: T |}) => React.Node,
  initialLayout?: { width?: number, height?: number },
  lazy: boolean,
  removeClippedSubviews?: boolean,
  sceneContainerStyle?: ViewStyleProp,
  style?: ViewStyleProp,
  simultaneousHandlers: null | any | any[],
  waitFor?: any[],
  pagerPanRef: any,
|}

type State = {|
  layout: Layout,
|}

export default class TabView<T: Route> extends React.PureComponent<
  Props<T>,
  State
> {
  static whyDidYouRender = true

  static defaultProps = {
    renderLazyPlaceholder: () => null,
    keyboardDismissMode: "on-drag",
    swipeEnabled: true,
    lazy: false,
    removeClippedSubviews: false,
    springConfig: {},
    timingConfig: {},
  }

  state = {
    layout: { width: 0, height: 0, ...this.props.initialLayout },
  }

  _jumpToIndex = (index: number) => {
    if (index !== this.props.navigationState.index) {
      this.props.onIndexChange(index)
    }
  }

  _handleLayout = (e: LayoutEvent) => {
    const { height, width } = e.nativeEvent.layout

    if (
      Math.abs(this.state.layout.width - width) < 0.01 &&
      Math.abs(this.state.layout.height - height) < 0.01
    ) {
      return
    }

    // alert('tabview layout'+width+":"+height+"::"+this.state.layout.width+":"+this.state.layout.height)
    this.setState({
      layout: {
        height,
        width,
      },
    })
  }

  render() {
    const {
      onSwipeStart,
      onSwipeEnd,
      navigationState,
      lazy,
      removeClippedSubviews,
      keyboardDismissMode,
      swipeEnabled,
      swipeDistanceThreshold,
      swipeVelocityThreshold,
      timingConfig,
      springConfig,
      renderScene,
      renderLazyPlaceholder,
      sceneContainerStyle,
      style,
      simultaneousHandlers,
      waitFor,
      pagerPanRef,
    } = this.props
    const { layout } = this.state

    return (
      <View onLayout={this._handleLayout} style={[styles.pager, style]}>
        <Pager
          navigationState={navigationState}
          layout={layout}
          keyboardDismissMode={keyboardDismissMode}
          swipeEnabled={swipeEnabled}
          swipeDistanceThreshold={swipeDistanceThreshold}
          swipeVelocityThreshold={swipeVelocityThreshold}
          timingConfig={timingConfig}
          springConfig={springConfig}
          onSwipeStart={onSwipeStart}
          onSwipeEnd={onSwipeEnd}
          onIndexChange={this._jumpToIndex}
          removeClippedSubviews={removeClippedSubviews}
          panRef={pagerPanRef}
          simultaneousHandlers={simultaneousHandlers}
          waitFor={waitFor}>
          {({ position, render, addListener, removeListener, jumpTo }) => {
            // All of the props here must not change between re-renders
            // This is crucial to optimizing the routes with PureComponent
            const sceneRendererProps = {
              position,
              layout,
              jumpTo,
              addListener,
              removeListener,
            }

            return (
              <React.Fragment>
                {render(
                  navigationState.routes.map((route, i) => {
                    return (
                      <SceneView
                        {...sceneRendererProps}
                        key={route.key}
                        index={i}
                        lazy={lazy}
                        navigationState={navigationState}
                        style={sceneContainerStyle}>
                        {({ loading }) =>
                          loading
                            ? renderLazyPlaceholder({ route })
                            : renderScene({
                                ...sceneRendererProps,
                                route,
                              })
                        }
                      </SceneView>
                    )
                  })
                )}
              </React.Fragment>
            )
          }}
        </Pager>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
    overflow: "hidden",
  },
})
