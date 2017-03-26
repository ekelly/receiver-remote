
var receiver = require('./receiver.js');

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
    receiver.turnOn(respondSuccess(response, "Turning receiver on"),
                    errorResponse(response));
  },
  "TurnOffIntent": function (intent, session, response) {
    receiver.turnOff(respondSuccess(response, "Turning receiver off"),
                     errorResponse(response));
  },
  "SwitchScene": function (intent, session, response) {
    var sceneSlot = intent.slots.Scene,
        sceneNum;
    sceneNum = sceneSlot.value;
    if (isNaN(sceneNum) || (sceneNum < 1 || sceneNum > 4)) {
      response.ask("Sorry, please select a valid scene");
      return;
    }
    receiver.switchScene(sceneNum,
                         respondSuccess(response, "Switching scene to " + sceneNum),
                         errorResponse(response));
  },
  "StartInput": function (intent, session, response) {
    var input = intent.slots.Input;
    console.log("Input: " + input.value);
    receiver.turnOn(function() {
      receiver.switchInput(input.value,
                           respondSuccess(response, "Starting " + input.value),
                           errorResponse(response));
    }, errorResponse(response));
  },
  "ChangeInput": function (intent, session, response) {
    var input = intent.slots.Input;
    console.log("Input: " + input.value);
    receiver.switchInput(input.value,
                         respondSuccess(response, "Changing input to " + input.value),
                         errorSwitchingInputResponse(response, input.value));
  },
  "ChangeVolume": function (intent, session, response) {
    var volume = intent.slots.Volume,
        volumeNum;
    volumeNum = parseInt(volume.value);
    if (isNaN(volumeNum) || (volume < 0 || volume > 100)) {
      response.ask("Sorry, what volume?");
      return;
    }
    receiver.setVolume(volumeNum,
                       respondSuccess(response, "Setting volume to " + volumeNum),
                       errorResponse(response));
  },
  "IncreaseVolume": function (intent, session, response) {
    receiver.volumeUp(respondSuccess(response, "Done"),
                      errorResponse(response));
  },
  "DecreaseVolume": function (intent, session, response) {
    receiver.volumeDown(respondSuccess(response, "Done"),
                        errorResponse(response));
  },
  "AMAZON.HelpIntent": function (intent, session, response) {
    response.tell("You can turn the receiver on and off, adjust the volume, and change input!");
  },
  "AMAZON.CancelIntent": function (intent, session, response) {
    response.tell("");
  }
};

// Generates a response callback function for a successful action
function respondSuccess(response, successText) {
  return function() {
    response.tell(successText);
  };
}

// Generates a response callback function for a failed action
function errorResponse(response) {
  return function() {
    response.tell("Sorry, something went wrong");
  }
}

function errorSwitchingInputResponse(response, input) {
  return function() {
    response.tell("Sorry, I couldn't find an input labeled " + input);
  }
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
  // Create an instance of the ReceiverRemote skill.
  var remote = new ReceiverRemote();
  remote.execute(event, context);
};
