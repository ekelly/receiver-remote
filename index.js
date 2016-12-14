
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
    "wii u": "HDMI3",
    "wii": "HDMI4",
    "bluray": "HDMI1",
    "dvd": "HDMI1",
    "movie": "HDMI1"
};

const powerMapping = {
    "on": "On",
    "off": "Standby"
};

/**
 * App ID for the skill
 */
var APP_ID = "amzn1.echo-sdk-ams.app.c866f3f6-bc9e-414d-a221-f13ddab2228c";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var ReceiverRemote = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
ReceiverRemote.prototype = Object.create(AlexaSkill.prototype);
ReceiverRemote.prototype.constructor = ReceiverRemote;

ReceiverRemote.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("ReceiverRemote onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

ReceiverRemote.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("ReceiverRemote onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "What would you like the receiver to do?";
    var repromptText = "You can turn it on, change the volume, or switch inputs";
    response.ask(speechOutput, repromptText);
};

ReceiverRemote.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("ReceiverRemote onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

ReceiverRemote.prototype.intentHandlers = {
    // register custom intent handlers
    "TurnOnIntent": function (intent, session, response) {
        power("on", response, respondSuccess("Turning receiver on"));
    },
    "TurnOffIntent": function (intent, session, response) {
        power("off", response, respondSuccess("Turning receiver off"));
    },
    "SwitchScene": function (intent, session, response) {
        var sceneSlot = intent.slots.Scene,
            sceneNum;
        sceneNum = sceneSlot.value;
        if (isNaN(sceneNum) || (sceneNum < 1 || sceneNum > 4)) {
            response.ask("Sorry, please select a valid scene");
            return;
        }
        switchScene(sceneNum, response, respondSuccess("Switching scene to " + sceneNum));
    },
    "StartInput": function (intent, session, response) {
        var input = intent.slots.Input;
        console.log("Input: " + input.value);
        power("on", response, function(response) {
          switchInput(input.value, response, respondSuccess("Starting " + input.value));
        });
    },
    "ChangeInput": function (intent, session, response) {
        var input = intent.slots.Input;
        console.log("Input: " + input.value);
        switchInput(input.value, response, respondSuccess("Changing input to " + input.value));
    },
    "ChangeVolume": function (intent, session, response) {
        var volume = intent.slots.Volume,
            volumeNum;
        volumeNum = parseInt(volume.value);
        if (isNaN(volumeNum) || (volume < 0 || volume > 100)) {
            response.ask("Sorry, what volume?");
            return;
        }
        setVolume(volumeNum, response, respondSuccess("Setting volume to " + volumeNum));
    },
    "IncreaseVolume": function (intent, session, response) {
        getVolume(function(volume) {
          setVolume(Math.min(volume + 10, 100), response, respondSuccess("Done"));
        });
    },
    "DecreaseVolume": function (intent, session, response) {
        getVolume(function(volume) {
          setVolume(Math.max(volume - 10, 0), response, respondSuccess("Done"));
        });
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.tell("You can turn it on and off, adjust the volume, and change input!");
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        response.tell("");
    }
};
// Generates a response callback function for a successful action
function respondSuccess(successText) {
  return function(response) {
    response.tell(successText);
  };
}

function getVolume(callback) {
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
  var data = "";
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on('end', function () {
      var re = /<Volume>.*<Lvl>.*<Val>(\-?\d+)<\/Val>.*<\/Lvl>.*<\/Volume>/;
      var decibel_level = parseInt(re.exec(data)[1]);
      console.log("Current volume: " + decibel_level + "db");
      var volume = Math.ceil(((decibel_level + 800) * 5/8) / 5);
      console.log("Current volume: " + volume + "%");
      callback(volume);
    });
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  // write data to request body
  req.write(GET_STATUS);
  req.end();
  console.log("Request sent");
}

function power(status, response, successText) {
  var data = util.format(POWER_DATA, powerMapping[status.toLowerCase()]);
  sendCommand(data, response, successText);
}

function switchInput(input, response, successText) {
  var data = util.format(SWITCH_INPUT, inputMapping[input.toLowerCase()]);
  sendCommand(data, response, successText);
}

function switchScene(scene, response, successText) {
  var data = util.format(SWITCH_SCENE, scene);
  sendCommand(data, response, successText);
}

function setVolume(volumePercentage, response, successText) {
  var volume = -800 + Math.ceil(volumePercentage * 8/5) * 5;
  var data = util.format(CHNGE_VOLUME, volume);
  console.log("Setting volume to " + volume);
  sendCommand(data, response, successText);
}

function sendCommand(data, response, successCallback) {
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
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log('Response: ' + chunk);
    });
    successCallback(response);
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  // write data to request body
  req.write(data);
  req.end();
  console.log("Request sent");
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
  // Create an instance of the ReceiverRemote skill.
  var remote = new ReceiverRemote();
  remote.execute(event, context);
};
