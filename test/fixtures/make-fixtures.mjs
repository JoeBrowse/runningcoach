// Makes the binary test fixtures (gzipped GPX, zip archives, FIT file).
// Run: node test/fixtures/make-fixtures.mjs
// The text fixtures (run.gpx, ride.tcx) are written by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, zipSync, strToU8 } from "fflate";
import { FitBaseType, FitEncoder } from "fit-file-parser/encoder";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, name));

const SEMI = 2 ** 31 / 180;

/* A FIT activity: 5 records 60 s apart, 1 lap, 1 session.
   Start 2024-03-10T08:00:00Z, 1.2 km, running, heart rate 140-150. */
export function makeActivityFit(startIso = "2024-03-10T08:00:00Z") {
  const start = new Date(startIso);
  const ts = (sec) => FitEncoder.toFitTimestamp(new Date(start.getTime() + sec * 1000));
  const enc = new FitEncoder();
  enc.writeMessage(0, [
    { number: 0, size: 1, baseType: FitBaseType.Enum, value: 4 }, // type: activity
    { number: 1, size: 2, baseType: FitBaseType.Uint16, value: 255 }, // manufacturer: development
    { number: 2, size: 2, baseType: FitBaseType.Uint16, value: 1 },
    { number: 4, size: 4, baseType: FitBaseType.Uint32, value: ts(0) },
  ]);
  const hrs = [140, 144, 148, 150, 146];
  for (let i = 0; i < 5; i++) {
    enc.writeMessage(20, [
      { number: 253, size: 4, baseType: FitBaseType.Uint32, value: ts(i * 60) },
      { number: 0, size: 4, baseType: FitBaseType.Sint32, value: Math.round((51.5 + i * 0.0027) * SEMI) },
      { number: 1, size: 4, baseType: FitBaseType.Sint32, value: Math.round(-0.12 * SEMI) },
      { number: 5, size: 4, baseType: FitBaseType.Uint32, value: i * 30000 }, // distance, cm (300 m per step)
      { number: 3, size: 1, baseType: FitBaseType.Uint8, value: hrs[i] },
    ], 1);
  }
  enc.writeMessage(19, [
    { number: 253, size: 4, baseType: FitBaseType.Uint32, value: ts(240) },
    { number: 2, size: 4, baseType: FitBaseType.Uint32, value: ts(0) },
    { number: 7, size: 4, baseType: FitBaseType.Uint32, value: 240000 },
    { number: 8, size: 4, baseType: FitBaseType.Uint32, value: 240000 },
    { number: 9, size: 4, baseType: FitBaseType.Uint32, value: 120000 },
    { number: 15, size: 1, baseType: FitBaseType.Uint8, value: 146 },
    { number: 16, size: 1, baseType: FitBaseType.Uint8, value: 150 },
  ], 2);
  enc.writeMessage(18, [
    { number: 253, size: 4, baseType: FitBaseType.Uint32, value: ts(240) },
    { number: 2, size: 4, baseType: FitBaseType.Uint32, value: ts(0) },
    { number: 7, size: 4, baseType: FitBaseType.Uint32, value: 240000 },
    { number: 8, size: 4, baseType: FitBaseType.Uint32, value: 240000 },
    { number: 9, size: 4, baseType: FitBaseType.Uint32, value: 120000 },
    { number: 5, size: 1, baseType: FitBaseType.Enum, value: 1 }, // running
    { number: 6, size: 1, baseType: FitBaseType.Enum, value: 0 },
    { number: 16, size: 1, baseType: FitBaseType.Uint8, value: 146 },
    { number: 17, size: 1, baseType: FitBaseType.Uint8, value: 150 },
  ], 3);
  return enc.close();
}

const STRAVA_CSV = [
  "Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Activity Private Note,Activity Gear,Filename,Athlete Weight,Bike Weight,Elapsed Time,Moving Time,Distance,Max Speed,Average Speed,Elevation Gain,Elevation Loss,Average Heart Rate",
  '1001,"Jun 1, 2024, 6:00:00 AM",Morning Run,Run,"Easy run, felt good",125,"0.50",160,12,false,,,activities/1001.gpx.gz,,,125,120,"502.3",4.1,4.0,3,3,150',
  '1002,"Jun 2, 2024, 5:00:00 PM",Evening Ride,Ride,,3600,"20.10",150,30,false,,,activities/1002.tcx.gz,,,3600,3500,"20100.0",12.0,5.7,120,120,135',
  '1003,"Jun 3, 2024, 7:15:00 AM",Pool swim,Swim,"Line one\nline two",1800,"1.50",,5,false,,,,,,1800,1700,"1500.0",,,,,',
].join("\n");

function main() {
  const gpx = read("run.gpx");
  const tcx = read("ride.tcx");
  writeFileSync(join(here, "run.gpx.gz"), gzipSync(gpx));
  const fit = makeActivityFit();
  writeFileSync(join(here, "run.fit"), fit);
  // Strava bulk export: activities.csv, activities/<id>.gpx.gz, .tcx.gz.
  // The GPX in the zip has a different start time from run.gpx, so it is
  // not a duplicate of it.
  const gpx2 = strToU8(gpx.toString("utf8").replace(/2024-05-04T07:/g, "2024-06-01T06:"));
  const tcx2 = strToU8(tcx.toString("utf8").replace(/2024-05-05T/g, "2024-06-02T").replace(/T09:/g, "T17:"));
  writeFileSync(
    join(here, "strava-export.zip"),
    zipSync({
      "export_123/activities.csv": strToU8(STRAVA_CSV),
      "export_123/activities/1001.gpx.gz": gzipSync(gpx2),
      "export_123/activities/1002.tcx.gz": gzipSync(tcx2),
      "export_123/profile.csv": strToU8("Athlete ID\n1\n"),
    })
  );
  // Garmin account export: FIT files inside a zip inside the zip.
  const inner = zipSync({ "123_ACTIVITY.fit": makeActivityFit("2024-04-01T10:00:00Z") });
  writeFileSync(
    join(here, "garmin-export.zip"),
    zipSync({
      "DI_CONNECT/DI-Connect-Uploaded-Files/UploadedFiles_0-_Part1.zip": inner,
      "DI_CONNECT/DI-Connect-User/user_profile.json": strToU8("{}"),
    })
  );
  console.log("fixtures written");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
