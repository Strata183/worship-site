const fs = require("fs");
const path = require("path");

const dataPath = path.join(
  __dirname,
  "..",
  "src",
  "Data",
  "mastersBibleStudyWeeks.js"
);
const source = fs.readFileSync(dataPath, "utf8");
const dates = [...source.matchAll(/date:\s*"(\d{4}-\d{2}-\d{2})"/g)].map(
  (match) => match[1]
);

if (dates.length === 0) {
  throw new Error(`No study week dates found in ${dataPath}`);
}

const latestDate = dates.sort().at(-1);
const [year, month, day] = latestDate.split("-").map(Number);
const nextDate = new Date(Date.UTC(year, month - 1, day + 7));
const nextDateString = nextDate.toISOString().slice(0, 10);

if (dates.includes(nextDateString)) {
  throw new Error(`A study week for ${nextDateString} already exists.`);
}

const newWeek = `  {\n    date: "${nextDateString}",\n    songs: [\n      { title: "?", key: "Key: ?" },\n      { title: "?", key: "Key: ?" },\n    ],\n    notes: [\n      { title: "Main Passage", body: "" },\n      { title: "Big Idea", body: "" },\n      { title: "Announcements", body: "" },\n    ],\n    prayerRequests: [\n      { name: "Praise Reports", items: [""] },\n      { name: "Prayer Requests", items: [""] },\n    ],\n  },\n`;

const arrayStart = source.indexOf("[");
if (arrayStart === -1) {
  throw new Error(`Could not find the study weeks array in ${dataPath}`);
}

const updatedSource =
  source.slice(0, arrayStart + 1) + "\n" + newWeek + source.slice(arrayStart + 1);
fs.writeFileSync(dataPath, updatedSource);

console.log(`Added a blank Master's Bible Study week for ${nextDateString}.`);
console.log("Fill in its songs, notes, and prayer requests, then publish the site.");


// run: npm run new:masters-week