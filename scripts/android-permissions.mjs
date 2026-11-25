// Adds the Android permissions that Skid Marks needs to the generated
// Android project. The CI workflow runs this after `npx cap add android`.
//
// - Location: GPS run recording (asked for only when a run starts).
// - Notifications: the optional night-before reminder (Android 13+).
import { readFileSync, writeFileSync } from "node:fs";

const path = "android/app/src/main/AndroidManifest.xml";
let xml = readFileSync(path, "utf8");

const lines = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
];

const missing = lines.filter((l) => !xml.includes(l.split('"')[1]));
if (missing.length) {
  xml = xml.replace("</manifest>", "    " + missing.join("\n    ") + "\n</manifest>");
  writeFileSync(path, xml);
}
console.log(`Android permissions: ${missing.length} added.`);
