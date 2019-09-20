// @flow

import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated from "react-native-reanimated"
import React, { Component } from "react"

import { GalleryList, GalleryProvider, GallerySwiper } from "./src"
import type { OverlayProps } from "./src/types"

type Props = {}
type State = {
  images: any[],
}

const WIDTH = Dimensions.get("window").width

// setInterval(() => {
//   let iters = 1e8,
//     sum = 0;
//   while (iters-- > 0) sum += iters;
// }, 300);
const topInitialLayout = { height: 200, width: WIDTH }

export default class App extends Component<Props, State> {
  images: any = [0, 1, 2, 3, 4, 5].map((i) => ({
    id: i,
    source: { uri: `http://placekitten.com/8${i}0/800` },
  }))

  renderOverlay = ({ overlayActive, index }: OverlayProps): mixed => (
    <Animated.View
      style={{
        padding: 10,
        backgroundColor: "#665544",
        height: 100,
        width: 100,
        opacity: overlayActive,
        alignItems: "center",
        justifyContent: "center",
      }}>
      <Text>{index}</Text>
    </Animated.View>
  )

  render() {
    return (
      <>
        <StatusBar translucent={true} backgroundColor={"transparent"} />
        <GalleryProvider>
          <SafeAreaView style={styles.container}>
            <View style={{ height: 200 }}>
              <GallerySwiper
                stories={this.images}
                style={styles.gallerySwiper}
                initialLayout={topInitialLayout}
                renderOverlay={this.renderOverlay}
                selectedIndex={0}
              />
            </View>
            <ScrollView style={{ flex: 1 }}>
              <GalleryList
                stories={this.images}
                style={styles.galleryList}
                renderOverlay={this.renderOverlay}
              />
            </ScrollView>
          </SafeAreaView>
        </GalleryProvider>
      </>
    )
  }
}

const styles = StyleSheet.create({
  gallerySwiper: {
    margin: 10,
    height: 200,
  },
  galleryList: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
})
