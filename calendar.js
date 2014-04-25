// Based on original events code written by foo (UTwente-Usability/events.js)

module.exports = {
  extractFrequency: function (textToMatch) {
    var re1 = '.*?'; // Non-greedy match on filler
    var re2 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])'; // Float 1

    var floatExp = new RegExp(re1 + re2, ["i"]);
    var floatResult = floatExp.exec(textToMatch);
    if (floatResult != null) {
        var float1 = floatResult[1];
        return float1;
    }

    var re3 = '.*?'; // Non-greedy match on filler
    var re4 = '\\d+'; // Uninteresting: int
    var re5 = '.*?'; // Non-greedy match on filler
    var re6 = '(\\d+)'; // Integer Number 1

    var integerExp = new RegExp(re3 + re4 + re5 + re6, ["i"]);
    var integerResult = integerExp.exec(textToMatch);
    if (integerResult != null) {
        var int1 = integerResult[1];
        return int1;
    }
  },
  getNextEvent: function (events, humanReadable) {
    humanReadable = typeof humanReadable !== 'undefined' ? humanReadable : true;

    // var eventToCheck = events[0];
    // while (eventToCheck != null && eventToCheck.eventDate < new Date()) {
    //    events.shift();
    //    eventToCheck = events[0];
    // }

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

            if(eventId > 0) {
                returnVal += " • And another one: ";
            }

            var frequency = nextEvents[eventId].frequency;
            returnVal += nextEvents[eventId].title + " in " + Date.daysBetween(new Date(), nextEvents[eventId].eventDate) + ". http://websdr.ewi.utwente.nl:8901/?tune=" + frequency;
        }
    } else {
        // here we assume that only date parsing is needed
        returnVal = nextEvents[0].eventDate;
    }

    return returnVal;
  }
};