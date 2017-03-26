
var util = require('util');
var http = require('http');

/**
 * Constants required for receiver control
 */
const RECEIVER_HOST = "ekelly.duckdns.org";
const RECEIVER_PORT = 426;
const RECEIVER_PATH = "/YamahaRemoteControl/ctrl";

const SWITCH_INPUT = "<YAMAHA_AV cmd=\"PUT\"><Main_Zone><Input><Input_Sel>%s" +
                     "</Input_Sel></Input></Main_Zone></YAMAHA_AV>\nName\n";

const SWITCH_SCENE = "<YAMAHA_AV cmd=\"PUT\"><Main_Zone><Scene><Scene_Load>" +
                     "Scene %d</Scene_Load></Scene></Main_Zone></YAMAHA_AV>" +
                     "\nName\n";

const CHNGE_VOLUME = "<YAMAHA_AV cmd=\"PUT\"><Main_Zone><Volume><Lvl><Val>%d" +
                     "</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume>" +
                     "</Main_Zone></YAMAHA_AV>\nName\n";

const POWER_DATA = "<YAMAHA_AV cmd=\"PUT\"><Main_Zone>" +
              "<Power_Control><Power>%s</Power></Power_Control></Main_Zone>" +
              "</YAMAHA_AV>\nName\n";

const GET_STATUS = "<YAMAHA_AV cmd=\"GET\"><Main_Zone><Basic_Status>GetParam" +
                   "</Basic_Status></Main_Zone></YAMAHA_AV>\nName\n";

const inputMapping = {
    "bluetooth": "Bluetooth",
    "pandora": "Pandora",
    "hdmi1": "HDMI1",
    "hdmi2": "HDMI2",
    "hdmi3": "HDMI3",
    "hdmi4": "HDMI4",
    "hdmi5": "HDMI5",
    "pc": "HDMI5",
    "computer": "HDMI5",
    "chromecast": "HDMI2",
    "fire tv": "HDMI1",
    "wii u": "HDMI3",
    "we u": "HDMI3",
    "we you": "HDMI3",
    "wii": "HDMI4",
    "we": "HDMI4",
    "bluray": "HDMI5",
    "dvd": "HDMI5",
    "movie": "HDMI5"
};

const powerMapping = {
  "on": "On",
  "off": "Standby"
};

// Power "on" or "off"
function power(status, successCallback, errorCallback) {
  var data = util.format(POWER_DATA, powerMapping[status.toLowerCase()]);
  sendCommand(data, successCallback, errorCallback);
}

// Returns a string corresponding to the sanitized input, or false if it
// can't be resolved
function resolveInput(rawInput) {
  var input = rawInput.toLowerCase();
  var re = /h(\.*\s*)d(\.*\s*)m(\.*\s*)i/;
  if (input.match(re)) {
    if (input.indexOf(" one") != -1 || input.indexOf("1") != -1) {
      return "HDMI1";
    }
    if (input.indexOf(" two") != -1 || input.indexOf("2") != -1) {
      return "HDMI2";
    }
    if (input.indexOf(" three") != -1 || input.indexOf("3") != -1) {
      return "HDMI3";
    }
    if (input.indexOf(" four") != -1 || input.indexOf("4") != -1) {
      return "HDMI4";
    }
    if (input.indexOf(" five") != -1 || input.indexOf("5") != -1) {
      return "HDMI5";
    }
  } else if(inputMapping.hasOwnProperty(input)) {
    return inputMapping[input];
  } else if(input == "u" || input == "you") {
    return inputMapping["wii u"];
  } else {
    return false;
  }
}

// Valid inputs are keys in the inputMapping. Any other
// input will trigger the error callback with the error
// "Unrecognized input"
function switchInput(input, successCallback, errorCallback) {
  var potentialInput = resolveInput(input);
  if (!potentialInput) {
    errorCallback("Unrecognized input");
  } else {
    var data = util.format(SWITCH_INPUT, potentialInput);
    sendCommand(data, successCallback, errorCallback);
  }
}

// Scene should be a number [1-4]
function switchScene(scene, successCallback, errorCallback) {
  var data = util.format(SWITCH_SCENE, scene);
  sendCommand(data, successCallback, errorCallback);
}

// Retrieve the current volume from the receiver
function getVolume(successCallback, errorCallback) {
  sendCommand(GET_STATUS, function(data) {
    var volume = parseVolumeResponse(data);
    if (successCallback) {
      successCallback(volume);
    }
  }, errorCallback);
}

// Volume should be an integer [0-100]
function setVolume(volumePercentage, successCallback, errorCallback) {
  var volume = convertPercentVolumeToDecibels(volumePercentage);
  console.log("Setting volume to " + volume);
  var data = util.format(CHNGE_VOLUME, volume);
  sendCommand(data, successCallback, errorCallback);
}

function convertPercentVolumeToDecibels(volumePercentage) {
  return -800 + Math.ceil(volumePercentage * 8/5) * 5
}

// Convert the volume returned by the receiver to a percentage
function parseVolumeResponse(data) {
  var re = /<Volume>.*<Lvl>.*<Val>(\-?\d+)<\/Val>.*<\/Lvl>.*<\/Volume>/;
  var decibel_level = parseInt(re.exec(data)[1]);
  console.log("Current volume: " + decibel_level + "db");
  var volume = Math.ceil(((decibel_level + 800) * 5/8) / 5);
  console.log("Current volume: " + volume + "%");
  return volume;
}

function volumeUp(successCallback, errorCallback) {
  getVolume(function(volume) {
    setVolume(Math.min(volume + 10, 100), successCallback, errorCallback);
  });
}

function volumeDown(successCallback, errorCallback) {
  getVolume(function(volume) {
    setVolume(Math.max(volume - 10, 0), successCallback, errorCallback);
  });
}

function sendCommand(data, successCallback, errorCallback) {
  var options = {
    hostname: RECEIVER_HOST,
    port: RECEIVER_PORT,
    path: RECEIVER_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  console.log(options);
  console.log(data);
  var responseData = "";
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log('Response: ' + chunk);
      responseData += chunk;
    });
    res.on('end', function () {
      if (successCallback) {
        successCallback(responseData);
      }
    });
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    if (errorCallback) {
      errorCallback(e);
    }
  });
  // write data to request body
  req.write(data);
  req.end();
  console.log("Request sent");
}

function turnOn(successCallback, errorCallback) {
  power("on", successCallback, errorCallback);
}

function turnOff(successCallback, errorCallback) {
  power("off", successCallback, errorCallback);
}

exports.turnOn       = turnOn;
exports.turnOff      = turnOff;
exports.switchInput  = switchInput;
exports.switchScene  = switchScene;
exports.setVolume    = setVolume;
exports.getVolume    = getVolume;
exports.volumeUp     = volumeUp;
exports.volumeDown   = volumeDown;

