'use strict';

const visitedDrugsKey = 'visitedDrugIndexes';

module.exports = (function () {
    return {

        getRepeat: function () {
            let response = { 
                speechOutput: this.attributes.speechOutput,
                reprompt: this.attributes.repromptSpeech
            };

            return response;            
        },        

        setRepeat: function (speechOutput, reprompt) {
            this.attributes.speechOutput = speechOutput;
            this.attributes.repromptSpeech = reprompt;            
        },

        clearRepeat: function () {
            this.attributes.speechOutput = ' ';
            this.attributes.repromptSpeech = ' ';
        },

        getVisitedDrugs: function () {
            if (this.attributes[visitedDrugsKey] === undefined) {
                this.attributes[visitedDrugsKey] = [];
            }

            return this.attributes[visitedDrugsKey];
        },

        setVisitedDrugs: function (value) {
            this.attributes[visitedDrugsKey] = value;
        }
    };
})();
