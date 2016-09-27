
// TX event manager and accessor
// Based on original events code written by foo (UTwente-Usability/events.js)
// Licensed under GPLv3+

var Events = function() {
	this.events = [];
};

Events.prototype = {
	load: function( events ) {
		// Events are assumed to all have a valid date and to be already sorted by date
		this.events = events;
	},
	count: function() {
		return this.events.length;
	},
	search: function( filters ) {
		// Remove past events
		var now = new Date();
		while (this.events[0] != null && this.events[0].eventDate < now) {
			this.events.shift();
		}

		// Search future events
		for (var i = 0; i < this.events.length; i++) {

			if (filters) {
				var match = filters.every(function(ftr) {
					return ftr.match(this.events[i]);
				}, this);
				if (! match) continue;
			}

			// Make sure we have all the events for that date
			var date = this.events[i].eventDate;
			for (var j = i + 1; j < this.events.length; j++) {
				if (this.events[j].eventDate > date) {
					return date;
				}
			}
			break;
		}

		// More events needed
		return null;
	},
	getByDate: function( date ) {
		var events = [];
		this.events.every(function(evt) {
			if (evt.eventDate > date)
				return false;
			if (evt.eventDate.getTime() == date.getTime())
				events.push(evt);
			return true;
		});
		return events;
	},
	getNext: function( filters ) {
		var date = this.search(filters);
		if (date == null) return null;

		var events = this.getByDate(date);
		if (events.length == 0) return null; // Just in case of concurrent modification

		return events;
	},
};

if (typeof module != "undefined" && module) module.exports = Events;
