// (c) totoCZ 2014
// Original events.js code written by foo.
// GPL 3+

var now = new Date();
var events = [];

function extractFrequency (textToMatch) {
    var digitsRe = '([0-9]*k|[0-9]* k)';
    var exp = new RegExp(digitsRe);
    var expResult = exp.exec(textToMatch);

    if (expResult !== null) {
      return expResult[0];
    }

    return expResult;
}

function getEvents() {  
  calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/ul6joarfkgroeho84vpieeaakk@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + now.toISOString() + 
  "&fields=items(start%2Csummary)%2Csummary&key=AIzaSyCobUsCNLg2lIsBlKYtbeHsAaN_X2LjwV0&maxResults=15");
  
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open( "GET", calanderUrl, false );
  xmlHttp.send( null );  
  
  obj = JSON.parse(xmlHttp.responseText);

  for (var i = 0; i < obj.items.length; i++)
  {
      var title = obj.items[i].summary;
      var time = obj.items[i].start.dateTime;
      var eventDate = new Date(time);
      var frequency = extractFrequency(title);
      var theEvent = {
          "eventDate": eventDate,
          "title": title,
          "frequency": frequency
      };
      events.push(theEvent);    
  }
  return events;
}

function getNextEvent(humanReadable)
{
  humanReadable = typeof humanReadable !== 'undefined' ? humanReadable : true;

  var eventToCheck = events[0];
  while(eventToCheck != null && eventToCheck.eventDate < new Date()) {
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

  var returnVal = "";
  
   if (humanReadable) {
     for(var eventId = 0; eventId < nextEvents.length; eventId++) {
      
       if (eventId > 0) {
         returnVal += "<br>";
       }
      
       var next = moment(nextEvents[eventId].eventDate);
       freqOrTitle = nextEvents[eventId].title;
    
       if (nextEvents[eventId].frequency !== null) {
         freqOrTitle =  "<a href='http://websdr.ewi.utwente.nl:8901/?tune=" + nextEvents[eventId].frequency + "'> " + freqOrTitle +"</a>";
       }
    
       returnVal += freqOrTitle;
     }
  
    } else {
      // here we assume that only date parsing is needed
      returnVal = nextEvents[0].eventDate;
  }
  
  return returnVal;
}

function cmdNext() {
  var events = getEvents();
  var next = moment(getNextEvent(false));
  $("#events").html("<b>Next station in " + next.fromNow() + "</b><br>" + getNextEvent());
}

$(document).ready(function() {
  cmdNext();
  setInterval(cmdNext, 30000);
});
