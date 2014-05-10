// calanderd 0.1
// GNU GPL 3+
// Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.

var config = require('./config');
var irc = require('irc');
var moment = require('moment');

var client = new irc.Client(config.server, config.botName, {
    userName: config.userName,
    realName: config.realName,
    port: config.port,
    password: config.password,
    sasl: true,
    showErrors: true,
    autoConnect: false,
    retryDelay: 4000,
    retryCount: 1000,
    secure: config.tls,
});

client.connect(5, function (input) {
    console.log("[i] calanderd on server");

    client.join(config.room, function (input) {
        hasRoom = true;

        console.log('[i] room connection is ready');

        setInterval(function () {
            client.send('PONG', 'empty');
        }, 2 * 60 * 1000);

        if (hasRoom && hasEvents) {
            onReady();
        }
    });

});

client.addListener('message' + config.room, function (from, to, message) {
    if (message.args[1] === '!next'){
        console.log('[i] received next command from ' + from);
        cmdNext(false);
    }
});

client.addListener('pm', function (from, to, message) {
    if (message.args[1] === '!next'){
        console.log('[i] received private next command from ' + from);
        cmdNext(false, from);
    }
});

client.addListener('error', function (message) {
    console.log('[!] error: ', message);
});

var hasRoom = false;
var hasEvents = false;
var events = [];

var schedNext;
var schedAnnounce;

function main() {
    console.log('[i] Asking Google for data');

    var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/" + config.calendarId + "@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString() +
        "&fields=items(start%2Csummary)%2Csummary&key=AIzaSyCobUsCNLg2lIsBlKYtbeHsAaN_X2LjwV0&maxResults=" + config.maxResults;

    var https = require('https');

    https.get(calanderUrl, function (res) {
        console.log("[i] got statusCode: ", res.statusCode);

        res.on('data', function (d) {
            obj = JSON.parse(d);
            onHttpReturn(obj);
        });

    }).on('error', function (e) {
        console.log("[!] " + e.message);
        // it shouldn't cycle :>
        // yeah i know, it's stupid
        // why not fix it for me?
        main();
    });
}

function onHttpReturn(obj) {
    hasEvents = true;

    console.log("[i] Number of events found: " + obj.items.length);
    console.log("[i] Time of first event: " + obj.items[0].start.dateTime);

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

    if (hasRoom && hasEvents) {
        onReady();
    }
}


function onReady() {
    console.log('[i] both actions succeeded, starting main system');
    schedAnnounce = setTimeout(nextAnnouncement, 1);
}

function nextAnnouncement() {
    var next = getNextEvent(false);

    if (next === -1) {
        console.log('[i] restarting');
        hasEvents = false;
        events = [];
        clearTimeout(schedNext);
        clearTimeout(schedAnnounce);
        main();
        return false;
    }

    var time = next.getTime() - (new Date()).getTime();
    schedNext = setTimeout(cmdNext, time - config.announceEarly);

    console.log('[i] scheduler event cmdNext added for ' + next.toISOString());
}

function cmdNext(recursion, to) {
    recursion = typeof recursion !== 'undefined' ? recursion : true;
    to = typeof to !== 'undefined' ? to : false;

    var next = getNextEvent();

    if (next === -1) {
        console.log('[i] restarting');
        hasEvents = false;
        events = [];
        clearTimeout(schedNext);
        clearTimeout(schedAnnounce);
        main();
        return false;
    }

    if (to !== false) {
        client.say(to, next);
    } else {
        client.say(config.room, next);
    }

    if (recursion) {
        var next = getNextEvent(false);
        var time = next.getTime() - (new Date()).getTime();
        schedAnnounce = setTimeout(nextAnnouncement, time + 1 * 60000);

        console.log('[i] scheduler event nextAnnouncement added for ' + next.toISOString());
    }
}

function extractFrequency (textToMatch) {
    var digitsRe = '([0-9]*k|[0-9]* k)';
    var exp = new RegExp(digitsRe);
    var expResult = exp.exec(textToMatch);

    if (expResult !== null) {
      return expResult[0];
    }

    return expResult;
}

// Based on original events code written by foo (UTwente-Usability/events.js)
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
        return -1;
    }

    var returnVal = "";

    if (humanReadable) {
        for (var eventId = 0; eventId < nextEvents.length; eventId++) {

            if (eventId > 0) {
                returnVal += " • ";
            }

            var languages = ["ar-ma","ar","bg","br","bs","ca","cs","cv","cy","da","de","en","eo","es","et","eu","fi","fo","fr","gl","hr","hu","id","is","it","lt","lv","ms-my","nb","nl","nn","pl","pt","ro","ru","sk","sl","sq","sr-cyr","sr","sv","ta","tl-ph","tr","tzm-la","uk","uz"];
            moment.lang(languages[Math.floor(Math.random() * languages.length)]);

            var next = moment(nextEvents[eventId].eventDate);
            returnVal += next.utc().format('H:mm') + " " + nextEvents[eventId].title + " " + next.fromNow();

            if (nextEvents[eventId].frequency !== null) {
                returnVal += " http://" + nextEvents[eventId].frequency + ".t.hetmer.cz";
            }
        }
    } else {
        // here we assume that only date parsing is needed
        returnVal = nextEvents[0].eventDate;
    }

    return returnVal;
}

main();
