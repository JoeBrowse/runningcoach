// Signs the generated phone app with the fixed test key in signing/.
// The CI workflow runs this after `npx cap add android`.
//
// Gradle does not always read ~/.android/debug.keystore on a build machine
// (for example when ANDROID_USER_HOME points elsewhere). So this script
// names the key file in the app's Gradle file. The watch app (wear/) uses
// the same file, so both apps have the same signature.
import { readFileSync, writeFileSync } from "node:fs";

const path = "android/app/build.gradle";
let gradle = readFileSync(path, "utf8");

const block = `    signingConfigs {
        debug {
            storeFile file("../../signing/debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
`;

if (!gradle.includes("signing/debug.keystore")) {
  gradle = gradle.replace(/^android \{\n/m, (m) => m + block);
  if (!gradle.includes("signing/debug.keystore")) throw new Error("Could not add the signing config.");
  writeFileSync(path, gradle);
  console.log("Signing: the app uses signing/debug.keystore.");
} else {
  console.log("Signing: already set.");
}
