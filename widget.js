var consoleLine = "<p class=\"console-line\"></p>";
// Log helper function for jsfiddle
console = {
    log: function (text) {
        $("#console-log").append($(consoleLine).html(text));
    }
};

function httpGet(theUrl)
{
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

Date.prototype.addDays = function(days)
{
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

Date.daysBetween = function( date1, date2 ) {
  //Get 1 day in milliseconds
  var one_day=1000*60*60*24;

  // Convert both dates to milliseconds
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();

  // Calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms;
  //take out milliseconds
  difference_ms = difference_ms/1000;
  var seconds = Math.floor(difference_ms % 60);
  difference_ms = difference_ms/60; 
  var minutes = Math.floor(difference_ms % 60);
  difference_ms = difference_ms/60; 
  var hours = Math.floor(difference_ms % 24);  
  var days = Math.floor(difference_ms/24);
  
  return days + ' days, ' + hours + ' hours, ' + minutes + ' minutes, and ' + seconds + ' seconds';
}

var now = new Date();
var numberOfDaysToFetch = 1;
var endDate = now.addDays(numberOfDaysToFetch);

//var json = '{"summary": "ENIGMA 2000 Numbers Station Schedule", "items": [{"start": {"dateTime": "2014-01-19T01:00:00Z"}}]}',

json=httpGet("https://www.googleapis.com/calendar/v3/calendars/us9gvp2nqjuf4nk4df49sfji4o@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMax=" + endDate.toISOString() + "&timeMin=" + now.toISOString() + 
"&fields=items(start%2Csummary)%2Csummary&key=AIzaSyCobUsCNLg2lIsBlKYtbeHsAaN_X2LjwV0");

// Parse the data that we got back from the calendar call
obj = JSON.parse(json);

console.log(obj.summary);
console.log("Grabbing events from " + now.toISOString() + " to " + endDate.toISOString());
console.log("Number of events found: " + obj.items.length);
console.log("Time of first event: " + obj.items[0].start.dateTime);


var events = [];

for (var i = 0; i < obj.items.length; i++)
{
    var title = obj.items[i].summary;
    var time = obj.items[i].start.dateTime;
    var eventDate = new Date(time);
    console.log(time + " ** " + title + "- " + Date.daysBetween(now, eventDate));
    var theEvent = {"eventDate":time, "title":title};
    events.push(theEvent);    
}
var consoleLine = "<p class=\"console-line\"></p>";
// Log helper function for jsfiddle
console = {
    log: function (text) {
        $("#console-log").append($(consoleLine).html(text));
    }
};

function httpGet(theUrl)
{
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

Date.prototype.addDays = function(days)
{
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

Date.daysBetween = function( date1, date2 ) {
  //Get 1 day in milliseconds
  var one_day=1000*60*60*24;

  // Convert both dates to milliseconds
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();

  // Calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms;
  //take out milliseconds
  difference_ms = difference_ms/1000;
  var seconds = Math.floor(difference_ms % 60);
  difference_ms = difference_ms/60; 
  var minutes = Math.floor(difference_ms % 60);
  difference_ms = difference_ms/60; 
  var hours = Math.floor(difference_ms % 24);  
  var days = Math.floor(difference_ms/24);
  
  return days + ' days, ' + hours + ' hours, ' + minutes + ' minutes, and ' + seconds + ' seconds';
}

var now = new Date();
var numberOfDaysToFetch = 1;
var endDate = now.addDays(numberOfDaysToFetch);

//var json = '{"summary": "ENIGMA 2000 Numbers Station Schedule", "items": [{"start": {"dateTime": "2014-01-19T01:00:00Z"}}]}',

json=httpGet("https://www.googleapis.com/calendar/v3/calendars/us9gvp2nqjuf4nk4df49sfji4o@group.calendar.google.com/events?orderBy=startTime&singleEvents=true&timeMax=" + endDate.toISOString() + "&timeMin=" + now.toISOString() + 
"&fields=items(start%2Csummary)%2Csummary&key=AIzaSyCobUsCNLg2lIsBlKYtbeHsAaN_X2LjwV0");

// Parse the data that we got back from the calendar call
obj = JSON.parse(json);

console.log(obj.summary);
console.log("Grabbing events from " + now.toISOString() + " to " + endDate.toISOString());
console.log("Number of events found: " + obj.items.length);
console.log("Time of first event: " + obj.items[0].start.dateTime);
var events = [];

for (var i = 0; i < obj.items.length; i++)
{
    var title = obj.items[i].summary;
    var time = obj.items[i].start.dateTime;
    var eventDate = new Date(time);
    var theEvent = {"eventDate":eventDate, "title":title};
    events.push(theEvent);
    console.log(time + " ** " + title + "- " + Date.daysBetween(now, eventDate));
}

debugger; 
var eventToCheck = events.pop();
while(eventToCheck != null && eventToCheck.eventDate < new Date())
{
    console.log("Removing event.");
    eventToCheck = events.pop();
}

var nextEvents = [];
var firstEvent = events.pop();
nextEvents.push(firstEvent);
var thisEvent = events.pop();
while(thisEvent.eventDate == firstEvent.eventDate)
{
    nextEvents.push(thisEvent);
}