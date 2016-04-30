/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

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
        response.tell("Turning receiver on");
    },
    "TurnOffIntent": function (intent, session, response) {
        response.tell("Turning receiver off");
    },
    "SwitchScene": function (intent, session, response) {
        var sceneSlot = intent.slots.Scene,
            sceneNum;
        sceneNum = sceneSlot.value;
        if (isNaN(sceneNum) || (sceneNum < 1 || sceneNum > 4)) {
            response.ask("Sorry, please select a valid scene");
            return;
        }
        response.tell("Switch scene to " + sceneNum);
    },
    "ChangeInput": function (intent, session, response) {
        var input = intent.slots.Input;
        response.tell("Changing input to " + input.value);
    },
    "ChangeVolume": function (intent, session, response) {
        var volume = intent.slots.Volume,
            volumeNum;
        volumeNum = parseInt(volume.value);
        if (isNan(volumeNum)) {
            response.ask("Sorry, what volume?")
            return;
        }
        response.tell("Setting volume to " + volumeNum);
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.tell("You can say adjust my power and control my input!",
                      "You can say adjust my power and control my input!");
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HelloWorld skill.
    var remote = new ReceiverRemote();
    remote.execute(event, context);
};
