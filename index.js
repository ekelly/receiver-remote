/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

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
                   "</Basic_Status></Main_Zone></YAMAHA_AV>\nName\n"

<YAMAHA_AV rsp="GET" RC="0"><Main_Zone><Basic_Status><Power_Control><Power>On</Power><Sleep>Off</Sleep></Power_Control><Volume><Lvl><Val>-220</Val><Exp>1</Exp><Unit>dB</Unit></Lvl><Mute>Off</Mute><Subwoofer_Trim><Val>0</Val><Exp>1</Exp><Unit>dB</Unit></Subwoofer_Trim></Volume><Input><Input_Sel>HDMI1</Input_Sel><Input_Sel_Item_Info><Param>HDMI1</Param><RW>RW</RW><Title>HDMI1</Title><Icon><On>/YamahaRemoteControl/Icons/icon004.png</On><Off></Off></Icon><Src_Name></Src_Name><Src_Number>1</Src_Number></Input_Sel_Item_Info></Input><Surround><Program_Sel><Current><Straight>Off</Straight><Enhancer>Off</Enhancer><Sound_Program>Standard</Sound_Program></Current></Program_Sel><_3D_Cinema_DSP>Auto</_3D_Cinema_DSP></Surround><Party_Info>Off</Party_Info><Sound_Video><Tone><Bass><Val>0</Val><Exp>1</Exp><Unit>dB</Unit></Bass><Treble><Val>0</Val><Exp>1</Exp><Unit>dB</Unit></Treble></Tone><Pure_Direct><Mode>Off</Mode></Pure_Direct><HDMI><Standby_Through_Info>Off</Standby_Through_Info><Output><OUT_1>On</OUT_1></Output></HDMI><YPAO_Volume>Auto</YPAO_Volume><Extra_Bass>Off</Extra_Bass><Adaptive_DRC>Off</Adaptive_DRC><Dialogue_Adjust><Dialogue_Lift>0</Dialogue_Lift><Dialogue_Lvl>0</Dialogue_Lvl></Dialogue_Adjust></Sound_Video></Basic_Status></Main_Zone></YAMAHA_AV>

const inputMapping = {
    "bluetooth": "Bluetooth",
    "pandora": "Pandora",
    "hdmi1": "HDMI1",
    "hdmi2": "HDMI2",
    "hdmi3": "HDMI3",
    "hdmi4": "HDMI4",
    "hdmi5": "HDMI5",
    "pc": "HDMI1",
    "computer": "HDMI1",
    "chromecast": "HDMI2",
    "wii u": "HDMI3",
    "wii": "HDMI4"
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
    var speechOutput = "Welcome to the Alexa Skills Kit, you can say hello";
    var repromptText = "You can say hello";
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
        power("on", response, "Turning receiver on");
    },
    "TurnOffIntent": function (intent, session, response) {
        power("off", response, "Turning receiver off");
    },
    "SwitchScene": function (intent, session, response) {
        var sceneSlot = intent.slots.Scene,
            sceneNum;
        sceneNum = sceneSlot.value;
        if (isNaN(sceneNum) || (sceneNum < 1 || sceneNum > 4)) {
            response.ask("Sorry, please select a valid scene");
            return;
        }
        switchScene(sceneNum, response, "Switching scene to " + sceneNum);
    },
    "ChangeInput": function (intent, session, response) {
        var input = intent.slots.Input;
        switchInput(input.value, response, "Changing input to " + input.value);
    },
    "ChangeVolume": function (intent, session, response) {
        var volume = intent.slots.Volume,
            volumeNum;
        volumeNum = parseInt(volume.value);
        if (isNaN(volumeNum) || (volume < 0 || volume > 100)) {
            response.ask("Sorry, what volume?");
            return;
        }
        setVolume(volumeNum, response, "Setting volume to " + volumeNum);
    },
    "IncreaseVolume": function (intent, session, response) {
        getVolume(function(volume) {
          setVolume(math.min(volume + 5, 100), response, "");
        });
    },
    "DecreaseVolume": function (intent, session, response) {
        getVolume(function(volume) {
          setVolume(math.max(volume - 5, 0), response, "");
        });
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.tell("You can say adjust my power and control my input!",
                      "You can say adjust my power and control my input!");
    }
};

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
      var decibel_level = re.exec(data)[1];
      console.log("Current volume: " + decibel_level + "db");
      var volume = 800 + Math.floor(decibel_lebel * 5/8) / 5;
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
  sendCommand(data, response, successText);
}

function sendCommand(data, response, successText) {
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
    response.tell(successText);
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
  // Create an instance of the HelloWorld skill.
  var remote = new ReceiverRemote();
  remote.execute(event, context);
};
