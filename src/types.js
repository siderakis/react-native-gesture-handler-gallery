// @flow

import Animated from "react-native-reanimated"

const { Value } = Animated

export type Story = {
  id: string,
  source: {
    uri: string,
  },
  height: number,
  width: number,
}

export type ThumbnailImageData = {
  x: number,
  y: number,
  width: number,
  height: number,
  fullWidth: number,
  fullHeight: number,
  containWidth: number,
  containHeight: number,
}

export type OverlayProps = {
  overlayActive: Value,
  index: number,
  close: () => mixed,
}
