// (c) totoCZ 2014, Pierre Ynard 2016
// Original events.js code written by foo.
// GPL 3+

// This code requires loading separately: jquery, moment, and
// tx.js and events.js from calanderd

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

var events;

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
  events.load(obj.items.map(function(evt) {
    return new TX(evt.summary, new Date(evt.start.dateTime), websdrs, null);
  }));
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
  var nextEvents = events.getNext(null);
  if (nextEvents == null || events.count() < 3) {
    getEvents(true);
    nextEvents = events.getNext(null);
  }
  
  $("#events").html(nextEvents.length > 0 ? printEvents(nextEvents) : "");
}

$(document).ready(function() {
  events = new Events();
  getEvents(false);
  cmdNext();
  setInterval(cmdNext, 60 * 1000);
});
