/**
 * @format
 */

import { AppRegistry } from "react-native"
import App from "./App"
import { name as appName } from "./app.json"
import React from "react"

if (__DEV__) {
  const whyDidYouRender = require("@welldone-software/why-did-you-render")
  whyDidYouRender(React)
}
AppRegistry.registerComponent(appName, () => App)
