# Skid Marks on a Wear OS watch

The Skid Marks watch app lets you run with only the watch and Bluetooth headphones. The phone can stay at home. The watch speaks the coach cues. After the run, the watch sends the run to the phone app.

This is a test build. It is free, like the phone app. It has no account and no ads.

## What the watch app does

- **Today.** The watch shows the planned run for today from the phone: the title, the distance or time and a bar of the steps. With no plan, you can start a free run.
- **Warm-up.** Before a planned run, you can turn the warm-up on or off. The warm-up is the same as on the phone.
- **Run.** The watch shows the time, the distance, the current pace (or an effort word in Simple mode), the heart rate, the current step, the time or distance left in the step and the next step. Swipe right for Pause, Resume, Lap, Skip and End. End asks you to confirm.
- **Voice cues.** The watch speaks the same cues as the phone app: each step, "Rep 2 of 6", each kilometre or mile, half-way, "Workout complete", and "speed up" or "slow down" when your pace is off the target for 20 seconds. Easy steps get only "slow down". Each cue also shows as a caption.
- **Screen off.** The run continues when the screen is off or when you open another app. Touch the run icon on the watch face to go back to the run.
- **Summary.** After the run: distance, time, pace, splits and average heart rate. Tell the app how hard the run was (1 to 10). Then select Save or Discard.
- **Sync.** The watch keeps each run until the phone confirms it. The summary shows "Waiting for phone" or "Synced". The phone app saves the run once and marks the planned day as done.
- **Settings.** Voice, pace guidance, splits and auto-pause. The phone sends its settings and units with the plan. A change on the watch wins.

The watch gets the plan for the next 7 days. It works with no phone near. Open the phone app once a week to send a new plan.

## Which watches

The app needs Wear OS 3 or later and GPS.

- OnePlus Watch 2, OnePlus Watch 2R, OnePlus Watch 3
- Samsung Galaxy Watch 4 and later
- Google Pixel Watch (all models)
- Other Wear OS 3+ watches with GPS (not tested)

The 2021 OnePlus Watch does not use Wear OS. The app does not work on it.

## What you need

- The phone app and the watch app from **the same build** (the same GitHub release). Both are signed with the same test key. The watch and the phone can send data to each other only when the key is the same.
- A computer with `adb` (Android platform tools) on the same Wi-Fi network as the watch. You need it once, to install the watch app.
- Bluetooth headphones that you pair with the **watch**, not with the phone.
- A text-to-speech engine on the watch for the voice. Most watches have one. If the watch has no voice, it vibrates and shows each cue as a caption: a short vibration for a new step, two short vibrations for "speed up" and a long vibration for "slow down".

## Install the test build

1. Download `skid-marks.apk` and `skid-marks-wear.apk` from the same release: https://github.com/JoeBrowse/skidmarks/releases/latest
2. Install `skid-marks.apk` on the phone (see the README). If the phone has an older build, install the new build over it.
3. On the watch, turn on Developer options: open **Settings > System > About** and tap the **build number** 7 times. (On some watches: **Settings > System > About > Versions**.)
4. Open **Settings > Developer options**. Turn on **ADB debugging** and **Wireless debugging**. Connect the watch to the same Wi-Fi network as the computer.
5. In **Wireless debugging**, select **Pair new device**. The watch shows an IP address, a port and a pairing code.
6. On the computer, pair with the watch:
   ```bash
   adb pair <ip:port>
   ```
   Type the pairing code when `adb` asks for it.
7. In **Wireless debugging**, the watch shows a second IP address and port (not the pairing port). Connect to it:
   ```bash
   adb connect <ip:port>
   ```
8. Install the watch app:
   ```bash
   adb install skid-marks-wear.apk
   ```
   For a new build, use `adb install -r skid-marks-wear.apk`. Your runs on the watch stay.
9. Turn off Wireless debugging when you are done. It uses battery.

## First run

1. Open Skid Marks on the phone. The phone sends the plan to the watch. To send it again, open **Data > Wear OS watch > Send Plan to Watch Now**. The same card shows if the phone can find the watch.
2. Open Skid Marks on the watch. The Today screen shows "Plan synced" and the time.
3. Pair your Bluetooth headphones with the watch (**Settings > Connectivity > Bluetooth** on the watch).
4. Select **Start** (or **Free run**). The first time, allow **location**, **sensors** (heart rate), **physical activity** and **notifications**. Without location, the watch has no GPS track and the distance is less accurate. Without sensors, it has no heart rate.
5. Go outside and wait for "GPS" on the run screen before you run, when possible.
6. After the run, select **Save**. Open the phone app near the watch. The run comes to the phone, also when the phone app is closed. It shows in the run history and the planned day shows as done.

## How the sync works

The phone and the watch use the Wear OS Data Layer, which is part of Google Play services. Skid Marks has no server. When the watch and the phone are not near each other, Google Play services can send the data through its own encrypted cloud sync. The phone sends the plan automatically only when a paired watch has the Skid Marks app.

- The phone puts the plan at `/skidmarks/plan`: the run days of the next 7 days, the units, Simple or Advanced mode, the voice settings, auto-pause and the warm-ups. It sends the plan when the app starts and after each plan change.
- The watch puts each saved run at `/skidmarks/run/<id>`. The phone saves the run (and skips a run that it already has), marks the plan day as done, deletes the item and sends `/skidmarks/ack/<id>`. Then the watch marks the run as synced.
- A run that does not reach the phone stays on the watch. The watch sends it again each time you open the app.

## Problems

- **"No plan on this watch."** Open the phone app with the watch near. Check that both apps come from the same build. Open **Data > Wear OS watch** on the phone: it must say "Connected".
- **"No voice on this watch."** Install a text-to-speech engine on the watch (for example Speech Recognition and Synthesis from Google, from the Play Store on the watch). Until then, the watch vibrates.
- **No sound in the headphones.** Pair the headphones with the watch, not with the phone. Turn up the media volume on the watch.
- **The app does not install.** Uninstall the old watch app first if it came from a different build key: `adb uninstall com.skidmarks.app`. This removes the runs on the watch that the phone did not get.

## Limits of this test build

- The voice speaks English.
- Treadmill runs, the workout builder and run/walk changes are on the phone only.
- The watch does not show the plan after the next 7 days.
- Load values and paces are information only. They cannot predict injury. If you have pain, stop and see a physio or a doctor.
