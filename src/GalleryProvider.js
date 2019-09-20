/**
 * @format
 * @flow
 */

import { StyleSheet, View } from "react-native"
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { type Ref } from "react"
import GalleryModal from "./GalleryModal"
import MaskedImage from "./MaskedImage"

type ContextType = {
  state: any,
  setState: (any) => mixed,
  setPinchState: (any) => mixed,
  pinchState: any,
  stateRef: any, //Ref<any>,
  pinchStateRef: any, //Ref<any>,
}
export const GalleryContext = React.createContext<ContextType>({})

type Props = {
  children: any,
}
const GalleryProvider = React.memo<Props>(({ children }: any) => {
  const [state, setState] = useState(null)
  const [pinchState, setPinchState] = useState(null)

  const onRequestClose = useCallback(() => setState(null), [])
  const closePincher = useCallback(() => setPinchState(null), [])

  const pinchStateRef = useRef()
  const stateRef = useRef()
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.
  useEffect(
    () => {
      pinchStateRef.current = pinchState
    },
    [pinchState]
  )
  useEffect(
    () => {
      stateRef.current = state
    },
    [state]
  )

  const value = useMemo(
    () => ({
      state,
      setState,
      stateRef,
      setPinchState,
      pinchState,
      pinchStateRef,
    }),
    [state, pinchState]
  )

  //TODO: only allow setState and setPinchState when both states are null.

  return (
    <GalleryContext.Provider value={value}>
      {children}
      {pinchState !== null && (
        <MaskedImage {...pinchState} closePincher={closePincher} />
      )}
      {state !== null && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
          }}>
          <GalleryModal
            {...{
              onRequestClose,
              stories: state.stories,
              selectedIndex: state.selectedIndex,
              position: state.position,
              goToStory: state.goToStory,
              renderOverlay: state.renderOverlay,
            }}
          />
        </View>
      )}
    </GalleryContext.Provider>
  )
})

GalleryProvider.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: "GalleryProvider",
}

export default GalleryProvider
export const withGallery = (Component: any) => (props: any) => (
  <GalleryProvider>
    <Component {...props} />
  </GalleryProvider>
)
