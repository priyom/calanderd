
var website = module.exports = {

	// Language sections
	language: {
		E: 'english',
		G: 'german',
		S: 'slavic',
		V: 'other',
		M: 'morse',
		F: 'digital',
	},
	// Extra (non-station) info page links
	extra: {
		'meta': [ 'number', 'operators', 'russian-6', 'message-metadata' ],
		'monolith': [ 'military', 'russia', 'monolyth-messages-description' ],
		'alphabet': [ 'military', 'russia', 'russian-phonetic-alphabet-and-numbers' ],
		'sked': [ 'number', 'station-schedule' ],
		'ns': [ 'number' ],
	},
	// Irregular station page names
	irregular: {
		'S28': 'the-buzzer',
		'S30': 'the-pip',
		'S32': 'the-squeaky-wheel',
		'XG': 'the-goose',
		'S4020': 's4020-the-air-horn',
		'S4110': 'zaliv-52',
		'S4325': 'plovets-41',
		'S6930': 'katok-65',
		'MXI': 'naval-markers',
		'VC01': 'chinese-robot',
		'XSL': 'slot-machine',
	},
	// Log pages
	logs: {
		month: [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ],
		monthly: [ 'F06', 'S28', 'S30', 'S32', 'XG', 'S3850', 'S4020', 'S4110', 'S4467', 'S5292', 'S6930' ],
	},
};
