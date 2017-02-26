'use strict';
const Alexa = require('alexa-sdk');
const _ = require('lodash');
const VoiceInsights = require('voice-insights-sdk');

const Translations = require('./translations');
const Config = require('./config/skill.config');
const DrugsHelper = require('./drugsHelper');
const AttributesHelper = require('./attributesHelper');
const ListUtility = require('./listUtility');

module.exports.handler = (event, context, callback) => {
    // used for testing and debugging only; not a real request parameter
    let useLocalTranslations = event.request.useLocalTranslations || false;

    // get translation resources from translations.json which could be:
    // 1) json file deployed with lambda function
    // 2) json file deployed to s3 bucket
    // 3) one of the above cached in memory with this instance of the lambda function
    Translations.getResources(useLocalTranslations)
        .then(function (data) {

            const alexa = Alexa.handler(event, context);            
            alexa.appId = Config.skillAppID;

            VoiceInsights.initialize(event.session, Config.trackingToken);
            
            // uncomment to save user values to DynamoDB
            alexa.dynamoDBTableName = Config.dynamoDBTableName;

            alexa.resources = data; //translations
            alexa.registerHandlers( newSessionHandlers, mainHandlers);
            alexa.execute();
        })
        .catch(function (err) {

            console.log(err.message);
            callback(err.message, null);
        });
};

var states = {
    SESSIONMODE: '_SESSIONMODE', // User is engaged in a session.
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the session.
};

var newSessionHandlers = {

    'LaunchRequest': function () {

        if(Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
            this.attributes['sessionsLogged'] = 0;
        }

        this.handler.state = states.SESSIONMODE;

        let ssmlResponse = this.t('welcome', this.t('skill.name')); // example of passing a parameter to a string in translations.json

        AttributesHelper.setRepeat.call(this, ssmlResponse.speechOutput, ssmlResponse.reprompt);

        VoiceInsights.track('LaunchRequest', null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':ask', ssmlResponse.speechOutput, ssmlResponse.reprompt);
        });
    },

    'Unhandled': function () {

        let ssmlResponse = this.t('unhandled');

        AttributesHelper.setRepeat.call(this, ssmlResponse.speechOutput, ssmlResponse.reprompt);

        VoiceInsights.track('Unhandled', null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':ask', ssmlResponse.speechOutput, ssmlResponse.reprompt);
        });
    },

    'NewSession': function () {

        this.handler.state = states.SESSIONMODE;

        let ssmlResponse = this.t('welcome', this.t('skill.name')); // example of passing a parameter to a string in translations.json

        AttributesHelper.setRepeat.call(this, ssmlResponse.speechOutput, ssmlResponse.reprompt);

        VoiceInsights.track('NewSession', null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':ask', ssmlResponse.speechOutput, ssmlResponse.reprompt);
        });
    },

    'GetDrugInfoIntent': function () {

        this.handler.state = states.SESSIONMODE;

        let intent = this.event.request.intent;
        let drugs = this.t('drugs');
        let visited = AttributesHelper.getVisitedDrugs.call(this);
        AttributesHelper.clearRepeat.call(this);

        let isNewSession = this.event.session.new;

        let options = {
            sourceListSize: drugs.length,
            visitedIndexes: visited
        };

        try {

            let listUtility = new ListUtility(options);
            let result = listUtility.getRandomIndex();

            AttributesHelper.setVisitedDrugs.call(this, result.newVisitedIndexes);

            let ssmlResponse = DrugsHelper.getDrugByIndex.call(this, result.index, isNewSession);

            AttributesHelper.setRepeat.call(this, ssmlResponse.speechOutput, ssmlResponse.reprompt);

            if (isNewSession) {

                VoiceInsights.track(intent.name, null, ssmlResponse.speechOutput, (error, response) => {
                    this.emit(':tellWithCard', ssmlResponse.speechOutput, ssmlResponse.cardTitle, ssmlResponse.cardContent, ssmlResponse.cardImages);
                });
            }
            else {

                VoiceInsights.track(intent.name, null, ssmlResponse.speechOutput, (error, response) => {
                    this.emit(':askWithCard', ssmlResponse.speechOutput, ssmlResponse.reprompt, ssmlResponse.cardTitle, ssmlResponse.cardContent, ssmlResponse.cardImages);
                });
            }
        }
        catch(err) {

            this.emit('Unhandled');
        }
    },

    'AMAZON.RepeatIntent': function () {

        let intent = this.event.request.intent;
        let ssmlResponse = AttributesHelper.getRepeat.call(this);

        VoiceInsights.track(intent.name, null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':ask', ssmlResponse.speechOutput, ssmlResponse.reprompt)
        });
    },

    'AMAZON.HelpIntent': function () {

        let intent = this.event.request.intent;
        let sampleCommands = this.t('sampleCommands');
        let text = _.sampleSize(sampleCommands, 4).join(' ');
        let speechOutput = this.t('help.speechOutput', text);
        let reprompt = this.t('help.reprompt');

        AttributesHelper.setRepeat.call(this, speechOutput, reprompt);

        VoiceInsights.track(intent.name, null, speechOutput, (error, response) => {
            this.emit(':ask', speechOutput, reprompt);
        });
    },

    'AMAZON.CancelIntent': function () {

        let intent = this.event.request.intent;

        VoiceInsights.track(intent.name, null, null, (error, response) => {
            this.emit('SessionEndedRequest');
        });
    },

    'AMAZON.StopIntent': function () {

        let intent = this.event.request.intent;

        VoiceInsights.track(intent.name, null, null, (error, response) => {
            this.emit('SessionEndedRequest');
        });
    },

    'SessionEndedRequest': function () {

        let ssmlResponse = this.t('goodbye', Config.s3.bucketName);

        AttributesHelper.clearRepeat.call(this);
        this.attributes['endedSessionCount'] += 1;

        VoiceInsights.track('SessionEnd', null, null, (error, response) => {
        this.emit(':saveState', true); // :tell* or :saveState handler required here to save attributes to DynamoDB
        });
    }
};

var mainHandlers = Alexa.CreateStateHandler(states.SESSIONMODE, {

    'NewSession': function () {

        this.handler.state = '';

        this.emitWithState('NewSession');
    },

    'Unhandled': function () {

       this.handler.state = '';

        this.emitWithState('Unhandled');
    },

    'GetDrugInfoIntent': function () {

        this.handler.state = '';

        this.emitWithState('GetDrugInfoIntent');
    },

    'ScheduleDrugInfoIntent': function() {

        let ssmlResponse = this.t('reminder', this.attributes['sessionsLogged']);

        VoiceInsights.track('ScheduleDrugInfoIntent', null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':tell', ssmlResponse.speechOutput, ssmlResponse.reprompt);
        });
    },

    'LogInfoIntent': function () {

    let ssmlResponse = this.t('logs', this.attributes['sessionsLogged']);
        VoiceInsights.track('LogInfoIntent', null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':ask', ssmlResponse.speechOutput, ssmlResponse.reprompt);
        });
    },

    'AMAZON.RepeatIntent': function () {
        
        let intent = this.event.request.intent;
        let ssmlResponse = AttributesHelper.getRepeat.call(this);

        VoiceInsights.track(intent.name, null, ssmlResponse.speechOutput, (error, response) => {
            this.emit(':ask', ssmlResponse.speechOutput, ssmlResponse.reprompt)
        });
    },

    'AMAZON.HelpIntent': function () {

    this.handler.state = '';

    this.emitWithState('HelpIntent');
    },

    'AMAZON.CancelIntent': function () {

        let intent = this.event.request.intent;

        VoiceInsights.track(intent.name, null, null, (error, response) => {
            this.emit('SessionEndedRequest');
        });
    },

    'AMAZON.StopIntent': function () {

        let intent = this.event.request.intent;

        VoiceInsights.track(intent.name, null, null, (error, response) => {
            this.emit('SessionEndedRequest');
        });
    },

    'SessionEndedRequest': function () {

        let ssmlResponse = this.t('goodbye', Config.s3.bucketName);

        AttributesHelper.clearRepeat.call(this);
        this.attributes['endedSessionCount'] += 1;

        VoiceInsights.track('SessionEnd', null, null, (error, response) => {
        this.emit(':saveState', true); // :tell* or :saveState handler required here to save attributes to DynamoDB
        });
    },
});