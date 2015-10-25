// calanderd 0.2
// GNU GPL 3+
// Written for #priyom on freenode (priyom.org) by Tomáš Hetmer.
// With additions by danix111, MilesPrower, linkfanel.

var config = require('./config');
var irc = require('irc');
var moment = require('moment');
var colors;
if (config.color) {
    colors = require('irc-colors');
}

var events = [];

var nextAnnouncement;

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

function padString(input, char, len){
        if(input.length>len)return input;
        input=(new Array(len+1).join(char))+input;
        return input.substr(input.length-len,input.length);
}

var timestamp = function(){
        var d = new Date();
        return "("+padString(d.getUTCHours(),"0",2)+":"+padString(d.getUTCMinutes(),"0",2)+":"+padString(d.getUTCSeconds(),"0",2)+") | ";
};


client.connect(5, function (input) {
    console.log(timestamp()+"[i] calanderd on server");

    client.join(config.room, function (input) {
        console.log(timestamp()+'[i] room connection is ready');

        setInterval(function () {
            client.send('PONG', 'empty');
        }, 2 * 60 * 1000);

        fetchEvents();
    });

});

function stationPageLink(station) {
    // avoid pissing people off, veryu
    station = station.toLowerCase();

    var milBase = 'http://priyom.org/military-stations/';
    var diploBase = 'http://priyom.org/diplomatic-stations/';
    var numberBase = 'http://priyom.org/number-stations/';

    // mil/diplo/digi aliases
    switch (station) {
    case 'katok65':
        station = 'katok-65';
        break;
    case 'plovets41':
        station = 'plovets-41';
        break;
    case 'hf-gcs':
        station = 'hfgcs';
        break;
    case 'mazielka':
        station = 'x06';
        break;
    case 'polfsk':
    case 'pol-fsk':
        station = 'f11';
        break;
    case '200/1000':
    case 'fsk-2001000':
        station = 'f06';
        break;
    case '200/500':
    case 'fsk-200500':
        station = 'f01';
        break;
    }

    // yep mil/diplo/digi stuff is special
    switch (station) {
    case 'buzzer':
    case 's28':
        return milBase + 'russia/the-buzzer';
    case 'pip':
    case 's30':
        return milBase + 'russia/the-pip';
    case 'wheel':
    case 's32':
        return milBase + 'russia/the-squeaky-wheel';
    case 's5292':
    case 's4790':
    case 's5426':
    case 'katok-65':
    case 'plovets-41':
    case 'm32':
        return milBase + 'russia/' + station;
    case 'mxi':
    case 'cluster':
        return milBase + 'russia/naval-markers';
    case 'monolith':
        return milBase + 'russia/monolyth-messages-description';
    case 'alphabet':
        return milBase + 'russia/russian-phonetic-alphabet-and-numbers';
    case 'hfgcs':
        return milBase + 'united-states/' + station;
    case 'vc01':
        return milBase + 'china/chinese-robot';
    case 'm51':
        return milBase + 'france/' + station;
    case 'xsl':
        return milBase + 'japan/slot-machine';
    case 'x06':
    case 'x06a':
    case 'x06b':
    case 'x06c':
        return diploBase + 'russia/' + station;
    case 'dp01': // fo, e!
    case 'hm01':
    case 'xpa':
    case 'xpa2':
    case 'sk01':
    case 'xp':
        return numberBase + 'digital/' + station;
    case 'sked':
        return numberBase + 'station-schedule';
    }

    // the rest should be ok to do this way
    var languages = {
        'e': 'english',
        'g': 'german',
        's': 'slavic',
        'v': 'other',
        'm': 'morse',
        'f': 'digital',
    };
    var language = languages[station[0]];
    if (language) {
        return numberBase + language + '/' + station;
    }

    return 'u wot m8';
}

client.addListener('message' + config.room, function (from, to, message) {
    if(message.args[1].indexOf("!link ") === 0) {
       var re = / (.*)/;
       var match = re.exec(message.args[1]);
       client.say(config.room, stationPageLink(match[0].trim()));
       return true;
    }

    switch(message.args[1]) {
        case '!next':
        case '!n':
            console.log(timestamp()+'[i] received next command from ' + from);
            cmdNext();
            break;
        case '!stream':
            client.say(config.room, 'http://stream.priyom.org:8000/buzzer.ogg.m3u');
            break;
        case '!listen':
            client.say(config.room, 'http://websdr.ewi.utwente.nl:8901/');
            break;
        case '!reload':
            client.say(config.room, 'Reloading...');
            fetchEvents();
            break;
        case '!why':
            client.say(config.room, 'The Buzzer is not audible at this time of the day due to HF propagation characteristics. Try again later in the local evening.');
            break;
        case '!rules':
            client.say(config.room, 'http://priyom.org/about/irc-rules');
            break;
        case '!link':
            client.say(config.room, 'http://priyom.org');
            break;
        case '!rivet':
            client.say(config.room, 'http://www.apul64.dsl.pipex.com/enigma2000/rivet/index.html');
            break;
        case '!utc':
            client.say(config.room, (new Date()).toUTCString());
            break;
    }

});

client.addListener('error', function (message) {
    console.log(timestamp()+'[!] error: ', message);
});

function fetchEvents() {
    console.log(timestamp()+'[i] (re)starting, asking Google for data');

    var calanderUrl = "https://www.googleapis.com/calendar/v3/calendars/" + config.calendarId + "@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString() +
        "&fields=items(start%2Csummary)%2Csummary&key=" + config.apiKey + "&maxResults=" + config.maxResults;

    var https = require('https');

    https.get(calanderUrl, function (res) {
        console.log(timestamp()+"[i] got statusCode: ", res.statusCode);

        var data = '';

        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function () {
            var obj = JSON.parse(data);
            onHttpReturn(obj);
        });

    }).on('error', function (e) {
        console.log(timestamp()+"[!] " + e.message);
        // it shouldn't cycle :> Maybe there should be a counter to give up
        // after N consecutive failures
        fetchEvents();
    });
}

function onHttpReturn(obj) {
    console.log(timestamp()+"[i] Number of events found: " + obj.items.length);
    console.log(timestamp()+"[i] Time of first event: " + obj.items[0].start.dateTime);

    var ev = [];
    for (var i = 0; i < obj.items.length; i++) {
        var title = obj.items[i].summary;
        var time = obj.items[i].start.dateTime;
        var eventDate = new Date(time);
        var info = extractInfo(title);
        var theEvent = {
            "eventDate": eventDate,
            "title": title,
            "frequency": info[0],
            "mode": info[1],
        };
        ev.push(theEvent);
    }

    clearTimeout(nextAnnouncement);
    events = ev;

    scheduleNext();
}

function scheduleNext() {
    // Find next event that isn't supposed to have already been announced
    var limit = (new Date()).getTime() + config.announceEarly;

    var next = searchEvents(limit + 1000);
    if (next == null) return false;

    clearTimeout(nextAnnouncement); // Safety net against race conditions
    nextAnnouncement = setTimeout(announceNext, next.getTime() - limit);

    console.log(timestamp()+'[i] scheduler event announceNext added for ' + next.toISOString());
}

function announceNext() {

    if (! cmdNext()) return false;
    scheduleNext();
}

function cmdNext() {

    var next = getNextEvent();
    if (next === -1) return false;

    client.say(config.room, next);
    return true;
}

function extractInfo(textToMatch) {
    // Without this the frequency marked as "last used" is given as a link.
    // Which is misleading as fuck.
    if (textToMatch.indexOf(" Search ") !== -1) {
        return [ undefined, undefined ];
    }

    var exp = new RegExp(/(\d+) ?[kK][hH][zZ]((.*?[kK][hH][zZ])?? ([A-Z][A-Z/]+))?/);
    var expResult = exp.exec(textToMatch);
    if (expResult === null) {
        return [ undefined, undefined ];
    }

    return [ expResult[1], expResult[4] ];
}

var digitalExp = new RegExp(/^(XP[A-Z]*\d*|(F|HM)\d+)[a-z]?$/);
var morseExp = new RegExp(/^M\d+[a-z]?$/);
var voiceExp = new RegExp(/^[EGSV]\d+[a-z]?$/);

function formatStation(match, name, rest) {
    if (! config.color) {
        return match;
    }

    var cname;

    if (digitalExp.test(name))
        cname = colors.red(name);
    else if (morseExp.test(name))
        cname = colors.purple(name);
    else if (voiceExp.test(name))
        cname = colors.green(name);
    else
        cname = colors.brown(name);

    return (cname + " " + rest);
}

function formatSearch(match, search) {
    return config.color ? (" " + colors.bold(search) + " ") : match;
}

function formatFrequency(freq) {
    return config.color ? colors.olive(freq) : freq;
}

function formatEvent(title) {
    if (! config.color) {
        return title;
    }

    title = title.replace(/^([\w /]+?) (\d+ ?kHz|Search)/i, formatStation);
    title = title.replace(/ (Search) /i, formatSearch);
    title = title.replace(/\d+ ?[kK][hH][zZ]( [A-Z][A-Z/]+)?/g, formatFrequency);
    return title;
}

function searchEvents(after) {

    // Remove past events
    var now = new Date();
    while (events[0] != null && events[0].eventDate < now) {
        events.shift();
    }

    // Search future events
    for (var i = 0; i < events.length; i++) {

        var date = events[i].eventDate;
        if (date.getTime() < after)
            continue;

        // Legacy check for running out of events
        if (events.length - i < 3)
            break;

        // Make sure we have all the events for that date
        for (var j = i + 1; j < events.length; j++) {
            if (events[j].eventDate > date) {
                return date;
            }
        }
        break;
    }

    // More events needed
    fetchEvents();
    return null;
}

// Based on original events code written by foo (UTwente-Usability/events.js)
function getNextEvent() {

    if (searchEvents(-1) == null) return -1;

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

    var first = moment(nextEvents[0].eventDate);
    var h = first.utc().format('H:mm');
    var header = (config.color ? colors.bold(h) : h) + " " + first.fromNow() + " ";
    var e = [];

    for (var eventId = 0; eventId < nextEvents.length; eventId++) {

        var returnVal = formatEvent(nextEvents[eventId].title);

        // Don't give a link for "Target", as "Target" implies that the TX
        // can NOT be heard on UTwente (most of the time at least)
        if (typeof nextEvents[eventId].frequency !== 'undefined' && nextEvents[eventId].frequency.length > 3 && nextEvents[eventId].title.indexOf('Target') === -1) {
            var frequency = nextEvents[eventId].frequency;
            var mode = "";
            switch(nextEvents[eventId].mode) {
                case "RTTY":
                case "RTTY/CW":
                    // Give it as USB with the center frequency at +2 kHz
                    frequency = frequency - 2;
                    break;

                case "CW":
                    // This makes the CW stations +1000 Hz on USB.
                    frequency = frequency - 1;
                case "LSB":
                case "AM":
                    // Especially for M08a.
                    // For HM01 too... veryu
                    mode = nextEvents[eventId].mode.toLowerCase();
                    break;
            }
            returnVal += " http://freq.ml/" + frequency + mode;
        }

        e.push(returnVal);
    }

    return (header + e.join(" • "));
}
