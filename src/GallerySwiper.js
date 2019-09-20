// @flow

import { StyleSheet } from "react-native"
import React, {
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react"

import { GalleryContext } from "./GalleryProvider"
import type { OverlayProps, Story } from "./types"
import { TabView } from "./tabview"
import Thumbnail from "./Thumbnail"

type ImageListProps = {
  stories: Story[],
  selectedIndex: null | number,
  style: any,
  renderOverlay: (OverlayProps) => mixed,
  initialLayout: {
    width?: number,
    height?: number,
  },
}

// type ImageListState = {
//   position: ThumbnailImageData | null,
// }

const tabViewSimultaneousHandlers = []
const GallerySwiper = React.memo<ImageListProps>(function({
  stories,
  style,
  initialLayout,
  renderOverlay,
}: ImageListProps) {
  const pagerPanRef = useRef()
  const { stateRef, setState, setPinchState, pinchStateRef } = useContext(
    GalleryContext
  )

  const [navStateIndex, setNavStateIndex] = useState<number>(0)

  const thumbnailRefs = useMemo(() => stories.map(() => React.createRef()), [
    stories,
  ])

  const navigationState = useMemo(
    () => ({
      index: navStateIndex,
      routes: stories.map((s) => ({ ...s, key: s.id })),
    }),
    [stories, navStateIndex]
  )

  const goToStory = useCallback(
    async (id: any) => {
      const selectedIndex = id
      const selectedRef = thumbnailRefs[selectedIndex]
      const position = await (selectedRef.current &&
        selectedRef.current.measure())
      await setState({
        goToStory,
        stories,
        position,
        selectedIndex,
        renderOverlay,
      })
    },
    [thumbnailRefs, renderOverlay, setState, stories]
  )

  const renderScene = useCallback(
    ({ route }: any) => (
      <Thumbnail
        ref={thumbnailRefs[route.key]}
        id={route.key}
        selected={
          (stateRef.current && stateRef.current.selectedIndex === route.key) ||
          (pinchStateRef.current &&
            pinchStateRef.current.selectedIndex === route.key)
        }
        onPress={goToStory}
        story={route}
        style={styles.flex}
        setPinchState={setPinchState}
        waitFor={pagerPanRef}
      />
    ),
    [goToStory, pinchStateRef, setPinchState, stateRef, thumbnailRefs]
  )

  return (
    <TabView
      pagerPanRef={pagerPanRef}
      simultaneousHandlers={tabViewSimultaneousHandlers}
      navigationState={navigationState}
      renderScene={renderScene}
      onIndexChange={setNavStateIndex}
      initialLayout={initialLayout}
      style={style}
    />
  )
})

GallerySwiper.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: "GallerySwiper",
}
export default GallerySwiper

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
})
