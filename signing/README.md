# Test signing key

`debug.keystore` is the **test** signing key for Skid Marks builds.

- Every build (phone APK and watch APK) is signed with this key. So a new build installs over an old one, and the phone and watch apps can send data to each other.
- It uses the standard Android debug values: alias `androiddebugkey`, passwords `android`.
- **This key is public.** Anyone can sign an app with it. Use it only for test builds. A Play Store release must use a private key that is kept out of the repository (for example in a GitHub Actions secret).

`scripts/android-signing.mjs` names this file in the phone app's Gradle file, and `wear/app/build.gradle.kts` names it for the watch app. So both apps always have the same signature, on any build machine.
