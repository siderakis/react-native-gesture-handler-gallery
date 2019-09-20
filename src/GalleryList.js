// @flow

import { Dimensions, StyleSheet, View, LayoutAnimation } from "react-native"
import React, { useContext, useMemo, useEffect, useState } from "react"

import { GalleryContext } from "./GalleryProvider"
import type { OverlayProps, Story } from "./types"
import Thumbnail from "./Thumbnail"

type ImageListProps = {
  stories: Story[],
  style?: any,
  renderOverlay: (OverlayProps) => mixed,
}

const GalleryList = React.memo<ImageListProps>(function({
  stories,
  style,
  renderOverlay,
}: ImageListProps) {
  const { state, setState, setPinchState, pinchState } = useContext(
    GalleryContext
  )
  const thumbnailRefs = useMemo(() => stories.map(() => React.createRef()), [
    stories,
  ])

  // for LayoutAnimation to work
  const [localStories, setLocalStories] = useState(stories)

  useEffect(
    () => {
      //LayoutAnimation.configureNext(CUSTOM_LAYOUT_ANIMATION)
      setLocalStories(stories)
    },
    [stories]
  )

  const goToStory = useMemo(
    () => async (id: any) => {
      const selectedRef = thumbnailRefs[id]
      const position = await (selectedRef.current &&
        selectedRef.current.measure())
      await setState({
        goToStory,
        stories,
        position,
        selectedIndex: id,
        renderOverlay,
        //borderRadius
      })
    },
    [stories, renderOverlay, setState, thumbnailRefs]
  )
  return (
    <View style={[style, styles.container]}>
      {localStories.map((s, i) => (
        <Thumbnail
          ref={thumbnailRefs[i]}
          key={s.source.uri}
          id={i}
          selected={
            (state && state.selectedIndex === i) ||
            (pinchState && pinchState.selectedIndex === i)
          }
          onPress={goToStory}
          story={s}
          style={styles.image}
          setPinchState={setPinchState}
        />
      ))}
    </View>
  )
})

GalleryList.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: "GalleryList",
}
export default GalleryList

const margin = 16
const borderRadius = 5
const width = Dimensions.get("window").width / 2 - margin * 2

const styles = StyleSheet.create({
  image: {
    width,
    height: width * 1.77,
    marginTop: 16,
    borderRadius,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
  },
})
