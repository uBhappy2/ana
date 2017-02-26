'use strict';
const _ = require('lodash');
const util = require('./util');
const Config = require('./config/skill.config');

module.exports = (function () {
    return {

        getDrugByIndex: function (index, isNewSession) {

            let list = this.t('drugs');
            let item = list[index];
            let reprompt = ' ';

            if (!isNewSession) {
                reprompt = ' <break time=\"500ms\"/> ' + _.sample(this.t('reprompts'));
            }

            let title = this.t('getDrug.title', index + 1);

            let drugList = this.t('drugList.speechOutput');

            // TO DO: Refactor
            let speechOutput = title + ': ' + item + reprompt;
            let cardContent = util.replaceTags(item);
            let cardImages = this.t('getDrug.cardImages', Config.s3.bucketName);


            let response = {
                speechOutput: speechOutput,
                reprompt: reprompt,
                cardTitle: title,
                cardContent: cardContent,
                cardImages: cardImages
            };

            return response;
        },

        getDrugNotFound: function(value, isNewSession) {

            let list = this.t('drugs');
            let reprompt = ' ';

            if (!isNewSession) {
                reprompt = ' <break time=\"500ms\"/> ' + _.sample(this.t('reprompts'));
            }
            let speechOutput = this.t('getDrug.invalidIndex', value, list.length) + ' ' + reprompt;


            let response = { 
                speechOutput: speechOutput,
                reprompt: reprompt
            };

            return response;
        }        
    };
})();
