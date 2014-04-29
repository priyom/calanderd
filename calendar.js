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
