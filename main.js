// calanderd 0.1
// GNU GPL 3+
// Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.
// Based on original events code written by foo (UTwente-Usability/events.js)

// Config
var room = '#priyom';
var server = 'adams.freenode.net';
var botName = 'Autototo';

var calendarId = 'ul6joarfkgroeho84vpieeaakk' // this is in your iCal, html, etc. URLs

var announceEarly = 2 * 60000;


// IRC login
var irc = require('irc');

var client = new irc.Client(server, botName, {
    realName: 'calanderd 0.1',
    autoConnect: false
});

client.connect(5, function (input) {
    console.log("[i] calanderd on server");
    // you could add nickserv here, etc.
    client.join(room, function (input) {
        onJoin();
    });
});

client.addListener('error', function (message) {
    console.log('[!] error: ', message);
});


// EXTENDS
String.prototype.startsWith = function (prefix) {
    return this.indexOf(prefix) === 0;
}
// Extend our date
Date.prototype.addDays = function (days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

Date.daysBetween = function (date1, date2) {
    //Get 1 day in milliseconds
    var one_day = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = date2_ms - date1_ms;
    //take out milliseconds
    difference_ms = difference_ms / 1000;
    var seconds = Math.floor(difference_ms % 60);
    difference_ms = difference_ms / 60;
    var minutes = Math.floor(difference_ms % 60);
    difference_ms = difference_ms / 60;
    var hours = Math.floor(difference_ms % 24);
    var days = Math.floor(difference_ms / 24);

    //return days + 'd, ' + hours + 'h, ' + minutes + 'm, and ' + seconds + 's';
    if (hours == 0) {
        return hours + 'h and ' + minutes + 'm';
    } else {
        return minutes + ' minutes';
    }
}


// GLOBALS
var now = new Date();
var numberOfDaysToFetch = 1;
var endDate = now.addDays(numberOfDaysToFetch);
var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/" + calendarId + "@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMax=" + endDate.toISOString() + "&timeMin=" + now.toISOString() +
    "&fields=items(start%2Csummary)%2Csummary&key=AIzaSyCobUsCNLg2lIsBlKYtbeHsAaN_X2LjwV0";

var hasRoom = false;
var hasEvents = false;

// global events
var events = [];


// FUNCS
function extractFrequency(textToMatch) {
    var re1 = '.*?'; // Non-greedy match on filler
    var re2 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])'; // Float 1

    var floatExp = new RegExp(re1 + re2, ["i"]);
    //console.log(floatExp.toString());
    var floatResult = floatExp.exec(textToMatch);
    if (floatResult != null) {
        var float1 = floatResult[1];
        return float1;
        //console.log("(" + float1.replace(/</, "&lt;") + ")" + "\n");
    }

    var re3 = '.*?'; // Non-greedy match on filler
    var re4 = '\\d+'; // Uninteresting: int
    var re5 = '.*?'; // Non-greedy match on filler
    var re6 = '(\\d+)'; // Integer Number 1

    var integerExp = new RegExp(re3 + re4 + re5 + re6, ["i"]);
    var integerResult = integerExp.exec(textToMatch);
    if (integerResult != null) {
        var int1 = integerResult[1];
        //console.log("(" + int1.replace(/</, "&lt;") + ")" + "\n");
        return int1;
    }
}



function getNextEvent(events, humanReadable) {
    humanReadable = typeof humanReadable !== 'undefined' ? humanReadable : true;

    //debugger;
    var eventToCheck = events[0];
    while (eventToCheck != null && eventToCheck.eventDate < new Date()) {
        //console.log("Removing event.");
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

    // TODO: Get the next few events?
    var returnVal = "";

    if (humanReadable) {

        for (var eventId = 0; eventId < nextEvents.length; eventId++) {
            var frequency = nextEvents[eventId].frequency;
            returnVal += nextEvents[eventId].title + " in " + Date.daysBetween(new Date(), nextEvents[eventId].eventDate) + ". http://websdr.ewi.utwente.nl:8901/?tune=" + frequency;
        }
    } else {
        // here we assume that only date parsing is needed
        returnVal = nextEvents[0].eventDate;
    }

    return returnVal;

}


// MAIN

function main() {

    console.log('[i] Asking Google for data');

    getEvents();
}

function getEvents() {

    var https = require('https');

    https.get(calanderUrl, function (res) {
        console.log("[dbg] got statusCode: ", res.statusCode);

        res.on('data', function (d) {
            obj = JSON.parse(d);
            onHttpReturn(obj);
        });

    }).on('error', function (e) {
        console.log("[!] " + e.message);
    });
}


function onHttpReturn(obj) {

    console.log("[i] Grabbing events from " + now.toISOString() + " to " + endDate.toISOString());
    console.log("[i] Number of events found: " + obj.items.length);
    console.log("[i] Time of first event: " + obj.items[0].start.dateTime);

    for (var i = 0; i < obj.items.length; i++) {
        var title = obj.items[i].summary;
        var time = obj.items[i].start.dateTime;
        var eventDate = new Date(time);
        // console.log(time + " ** " + title + "- " + Date.daysBetween(now, eventDate));
        var frequency = extractFrequency(title);
        var theEvent = {
            "eventDate": eventDate,
            "title": title,
            "frequency": frequency
        };
        events.push(theEvent);
    }

    onEvents(events);
}


function onEvents(myEvents) {

    hasEvents = true;
    events = myEvents;

    client.addListener('message', function (from, to, message) {
        //console.log('[i] ' + from + ': ' + message);

        if (message.startsWith('!next')) {
            console.log('[i] received next command from ' + from);
            cmdNext(from);
        }
    });

    if (hasRoom && hasEvents) {
        onReady();
    }
}

function onJoin() {
    hasRoom = true;

    console.log('[i] room connection is ready');

    if (hasRoom && hasEvents) {
        onReady();
    }
}

function onReady() {
    console.log('[i] both actions succeeded, starting main system');

    // announce when time comes
    nextAnnouncement();

    setInterval(function () {
        client.send('PONG', 'empty');
    }, 5 * 60 * 1000);
}

function nextAnnouncement() {

    var next = getNextEvent(events, false);

    if (next === '-1') {
        hasEvents = false;
        getEvents();
        console.log('[i] restarting');
        return false;
    }

    // channel announcement
    var nextTime = next.getTime() - (new Date()).getTime();
    time = nextTime - announceEarly;
    setTimeout(cmdNext, time);

    console.log('[i] scheduler event cmdNext added for ' + time);

}

function cmdNext(hilit) {

    hilit = typeof hilit !== 'undefined' ? hilit : false;

    var next = getNextEvent(events);

    if (!hilit) {
        client.say(room, 'Soon on air: ' + next);

        var next = getNextEvent(events, false);
        var time = next.getTime() - (new Date()).getTime();
        setTimeout(nextAnnouncement, time);

        console.log('[i] scheduler event nextAnnouncement added for ' + time);

    } else {
        client.say(room, hilit + ", next lotto: " + next);
    }
}


main();
