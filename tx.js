
var TX = function( description, eventDate, websdrUrl, formatter ) {
	this.websdrUrl = websdrUrl; // WebSDR configuration
	this.formatter = formatter; // Formatting service object

	this.description = description;
	this.eventDate = eventDate;

	// Don't match a frequency marked as "last used", otherwise it is given as a link.
	// Which is misleading as fuck.
	var result = description.match(/^([\w /-]+?) (?:Search|(\d+) ?[kK][hH][zZ](?:(?:.*?[kK][hH][zZ])?? ([A-Z][A-Z/]+))?)/);

	if (result != null) {
		this.station = result[1];
		this.frequency = Number(result[2]);
		this.mode = result[3];
	} else {
		this.frequency = NaN;
	}
};

TX.prototype = {
	link: function() {
		// Don't give a link for "Target", as "Target" implies that the TX can NOT be heard on UTwente. (most of the time at least)
		if ((! this.frequency) || this.description.indexOf('Target') > -1) return null;

		var freq = this.frequency;
		var mode = '';
		switch (this.mode) {
			case 'RTTY':
			case 'RTTY/CW':
				// Give it as USB with the center frequency at +2 kHz
				freq = freq - 2;
				break;

			case 'CW':
				// WebSDR software gratuitiously shifts CW tuning by +750 Hz, so we compensate for this.
				freq = freq - 0.75;
			case 'LSB':
			case 'AM':
				// Especially for M08a, and for HM01 too... veryu
				mode = this.mode.toLowerCase();
				break;
		}
		return this.websdrUrl + freq + mode;
	},
	format: function() {
		if (! this.formatter) return this.description;

		// This seems needed to make a proper closure with the anonymous functions below...
		var formatter = this.formatter;

		var dsc = this.description;
		dsc = dsc.replace(/^([\w /-]+?) (\d+ ?kHz|Search)/i, function( match, name, rest ) {
			return (formatter.station(name) + ' ' + rest);
		});
		dsc = dsc.replace(/ (Search) /i, function( match, search ) {
			return (' ' + formatter.search(search) + ' ');
		});
		dsc = dsc.replace(/\d+(-\d+)? ?[kKmM][hH][zZ]( [A-Z][A-Z/]+)?/g, this.formatter.frequency);
		return dsc;
	},
};

module.exports = TX;
