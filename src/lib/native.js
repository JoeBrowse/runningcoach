/* Native plugin bootstrap.

   Older code reaches native plugins through window.Capacitor.Plugins.
   Capacitor 8 registers plugins through imports. This file imports the
   plugins that the app uses and puts them on window.Capacitor.Plugins,
   so the older lookups (capPrefs, capPlugin) find them in the APK.
   In a browser this file does nothing. */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { Filesystem } from "@capacitor/filesystem";

export function installNativePlugins() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const C = window.Capacitor || (window.Capacitor = Capacitor);
    C.Plugins = C.Plugins || {};
    if (!C.Plugins.Preferences) C.Plugins.Preferences = Preferences;
    if (!C.Plugins.Filesystem) C.Plugins.Filesystem = Filesystem;
  } catch (e) {
    // Never fatal: without plugins the app falls back to browser storage.
  }
}
