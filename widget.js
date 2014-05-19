// (c) totoCZ 2014
// Original events.js code written by foo.
// GPL 3+

var now = new Date();
var events = [];

function extractFrequency(textToMatch) {
    var digitsRe = '([0-9]*k|[0-9]* k)';
    var exp = new RegExp(digitsRe);
    var expResult = exp.exec(textToMatch);
  
    if (expResult !== null) {
      expResult = expResult[0].substring(0, expResult[0].length - 1);
      return expResult;
    }
}

function getEvents(forceLoad) {  
  forceLoad = typeof forceLoad !== 'undefined' ? forceLoad : false;
  
  var localEvents;
  if (typeof(Storage) !== 'undefined' && !forceLoad) {
    localEvents = JSON.parse(localStorage.getItem("events"));
  }
  
  if (localEvents !== null) {
    var obj = localEvents;
  }
  
  if (typeof obj === 'undefined') {
    var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/ul6joarfkgroeho84vpieeaakk@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + now.toISOString() + 
    "&fields=items(start%2Csummary)%2Csummary&key=AIzaSyARkBX_t1JfOEVk0caNk7tf5HpNIEVdcU4&maxResults=50";
  
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", calanderUrl, false);
    xmlHttp.send(null);  
    
    if (typeof(Storage) !== 'undefined') {
      var obj = JSON.parse(xmlHttp.responseText);      
      localStorage.setItem("events", xmlHttp.responseText);
    }
  }
  
  for (var i = 0; i < obj.items.length; i++) {
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

function getNextEvent(humanReadable) {
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

  if (events.length < 3) {
    if (typeof(Storage) !== 'undefined') {
    localStorage.removeItem("events");
    }
    events = getEvents(true);
    cmdNext();
    return false;
  }
  
  var returnVal = "";
  
   if (humanReadable) {
     for (var eventId = 0; eventId < nextEvents.length; eventId++) {
       returnVal += "<p>";
       
       if (nextEvents[eventId].frequency !== null && typeof nextEvents[eventId].frequency !== 'undefined') {
         returnVal += "<a href='http://websdr.ewi.utwente.nl:8901/?tune=" + nextEvents[eventId].frequency + "'> " + nextEvents[eventId].title +"</a>";
       } else {
         returnVal += nextEvents[eventId].title;
       }
       
       returnVal += "</p>";
     }
  
    } else {
      // here we assume that only date parsing is needed
      returnVal = nextEvents[0].eventDate;
  }
  
  return returnVal;
  
}

function cmdNext() {
  var next = moment(getNextEvent(false));
  $("#events").html("<h3><b>Next station " + next.fromNow() + "</b></h3>" + getNextEvent());
}

$(document).ready(function() {
  events = getEvents();
  cmdNext();
  setInterval(cmdNext, 60 * 1000);
});
