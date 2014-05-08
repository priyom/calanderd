// Based on original events code written by foo (UTwente-Usability/events.js)

module.exports = {
  extractFrequency: function (textToMatch) {
    var digitsRe = '([0-9]*k|[0-9]* k)';
    var exp = new RegExp(digitsRe);
    var expResult = exp.exec(textToMatch);

    if(expResult !== null) {
      return expResult[0];
    }

    return expResult;
  },
  getNextEvent: function (events, humanReadable) {
    humanReadable = typeof humanReadable !== 'undefined' ? humanReadable : true;

     var eventToCheck = events[0];
     while (eventToCheck != null && eventToCheck.eventDate < new Date()) {
        events.shift();
        eventToCheck = events[0];
     }

    var nextEvents = [];
    var prevEvent;

    for (i = 0; i < events.length; i++) {
        var thisEvent = events[i];
        if (prevEvent == null) {
            prevEvent = thisEvent;
            nextEvents.push(prevEvent);
            continue;
        }

        if (prevEvent.eventDate.toISOString() == thisEvent.eventDate.toISOString()) {
            nextEvents.push(thisEvent);
        } else {
            break;
        }
    }

    if (nextEvents.length == 0) {
        return -1;
    }

    var returnVal = "";

    if (humanReadable) {
        for (var eventId = 0; eventId < nextEvents.length; eventId++) {

            //if(eventId > 0) {
            //    returnVal += " • ";
            //}

            var moment = require('moment');

            var languages = ["ar-ma","ar","bg","br","bs","ca","cs","cv","cy","da","de","el","en-au","en-ca","en-gb","eo","es","et","eu","fa","fi","fo","fr-ca","fr","gl","he","hi","hr","hu","hy-am","id","is","it","ja","ka","km","ko","lb","lt","lv","mk","ml","mr","ms-my","nb","ne","nl","nn","pl","pt-br","pt","ro","ru","sk","sl","sq","sr-cyr","sr","sv","ta","th","tl-ph","tr","tzm-la","tzm","uk","uz","vi","zh-cn","zh-tw"];
            moment.lang(languages[Math.floor(Math.random() * languages.length)]);

            var next = moment(nextEvents[eventId].eventDate);
            returnVal += next.fromNow() + " • " + nextEvents[eventId].title + " • " + next.utc().format('H:mm') + " • http://" + nextEvents[eventId].frequency + ".t.hetmer.cz";
        }
    } else {
        // here we assume that only date parsing is needed
        returnVal = nextEvents[0].eventDate;
    }

    return returnVal;
  }
};
