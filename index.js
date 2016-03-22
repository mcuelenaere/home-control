'use strict';

const
  AndroidDetector = require('./android_detector'),
  Api = require('./api'),
  later = require('later'),
  moment = require('moment'),
  suncalc = require('suncalc');

const MY_LOCATION = process.env['MY_LOCATION'].split(',').map(x => parseFloat(x));

function getSunset() {
  return moment(suncalc.getTimes(new Date(), MY_LOCATION[0], MY_LOCATION[1]).sunset);
}

function getSleepyTime() {
  // 1h at the next day
  return moment().startOf('day').add(1, 'days').hour(1);
}

function calculateBrightness() {
  var now = moment(),
      sunset = getSunset(),
      sleepyTime = getSleepyTime();

  // calculate brightness value
  var brightness = 1 - (now.diff(sunset) / sleepyTime.diff(sunset));

  // clamp it to [0; 1]
  brightness = Math.min(Math.max(0, brightness), 1);

  return brightness;
}

function shouldLightsBeOn() {
  var now = moment(),
      sunset = getSunset(),
      sleepyTime = getSleepyTime();

  return now.isBetween(sunset, sleepyTime);
}

var det = new AndroidDetector('eth0');
var api = new Api('localhost:8000');

// enable lights when Android device is detected and it's between sunset and sleepy time
det.on('discover', (device) => {
  if (shouldLightsBeOn()) {
    console.log("Detected presence, turning on lights");

    api.enableLamps('lamp beneden').then(() =>
      api.changeBrightness('lamp beneden', calculateBrightness())
    ).then(() =>
      api.enableLamps('zetel')
    ).then(() =>
      api.changeBrightness('zetel', .4)
    );
  }
});

// disable all lamps every day at 1h
later.setInterval(() => {
  console.log("It's late, turning off all lights...");
  api.disableLamps();
}, later.parse.recur().on(1).hour());

// decrease lamp brightness over time
later.setInterval(() => {
  if (shouldLightsBeOn()) {
    var brightness = calculateBrightness();
    console.log("Setting brightness to " + brightness);
    api.changeBrightness('lamp beneden', brightness);
  }
}, later.parse.recur().every(15).minute());

// print when the sun will set at 12h
later.setInterval(() => {
  console.log("Today the sun will set at " + getSunset().format());
}, later.parse.recur().on(12).hour());
