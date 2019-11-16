// (c) totoCZ 2014, Pierre Ynard 2016, 2019
// Original events.js code written by foo.
// Licensed under GPLv3+

// This widget is an alternative web frontend for calendard.
// It requires loading separately the following shared calendard modules:
// websdrs.js, tx.js, events.js, timeutils.js

var events;

function getEvents(refresh) {
  var json = null;
  if ((! refresh) && typeof(Storage) !== 'undefined') {
    json = localStorage.getItem("events");
  }
  if (! json) {
    var calanderUrl = "http://calendar.priyom.org/events?timeMin=" + (new Date()).toISOString() + "&maxResults=150";

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", calanderUrl, false);
    xmlHttp.send(null);

    // FIXME: switch to asynchronous XMLHttpRequest to avoid freezing browser
    // FIXME: handle errors, and do NOT cache unusable error responses
    // permanently into localStorage!
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
  var next = timeutils.humanizeDuration(nextEvents[0].eventDate - new Date());
  var header = "<h3>Next station " + next + "</h3>";

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

  document.getElementById("events").innerHTML = nextEvents != null ? printEvents(nextEvents) : "";
}

document.addEventListener("DOMContentLoaded", function () {
  events = new Events();
  getEvents(false);
  cmdNext();
  setInterval(cmdNext, 60 * 1000);
});
