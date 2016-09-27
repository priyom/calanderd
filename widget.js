// (c) totoCZ 2014, Pierre Ynard 2016
// Original events.js code written by foo.
// GPL 3+

// This code requires loading separately: jquery, moment, and
// tx.js from calanderd

// Configuration of WebSDRs to link to
var websdrs = [
	{ // utwente, Netherlands
		url: 'http://websdr.ewi.utwente.nl:8901/?tune=',
		target: null,
		min: 0,
		max: 29160,
		fixCW: true,
	},
];

var events = [];

function getEvents(refresh) {
  var json = null;
  if ((! refresh) && typeof(Storage) !== 'undefined') {
    json = localStorage.getItem("events");
  }
  if (json === null) {
    var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/ul6joarfkgroeho84vpieeaakk@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + (new Date()).toISOString() +
    "&fields=items(start%2Csummary)%2Csummary&key=AIzaSyARkBX_t1JfOEVk0caNk7tf5HpNIEVdcU4&maxResults=150";
  
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", calanderUrl, false);
    xmlHttp.send(null);  
    
    json = xmlHttp.responseText;
    
    if (typeof(Storage) !== 'undefined') {
      localStorage.setItem("events", json);
    }
  }
  
  var obj = JSON.parse(json);
  events = obj.items.map(function(evt) {
    return new TX(evt.summary, new Date(evt.start.dateTime), websdrs, null);
  });
}

function getNextEvent() {

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

  return nextEvents;
}

function printEvents(nextEvents) {
  var next = moment(nextEvents[0].eventDate);
  var header = "<h3>Next station " + next.fromNow() + "</h3>";

  var items = nextEvents.map(function(evt) {
    var format = evt.format();
    var link = evt.link();
    if (link) {
      format = "<a href='" + link + "'>" + format + "</a>";
    }
    return ("<li>" + format + "</li>");
  });

  return (header + "<ul>" + items.join("") + "</ul>");
}

function cmdNext() {
  var nextEvents = getNextEvent();
  
  if (events.length < 3) {
    getEvents(true);
    nextEvents = getNextEvent();
  }
  
  $("#events").html(nextEvents.length > 0 ? printEvents(nextEvents) : "");
}

$(document).ready(function() {
  getEvents(false);
  cmdNext();
  setInterval(cmdNext, 60 * 1000);
});
