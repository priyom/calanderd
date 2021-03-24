
var website = module.exports = {

	// Language sections
	language: {
		E: 'english',
		G: 'german',
		S: 'slavic',
		V: 'other',
		M: 'morse',
		F: 'digital',
		P: 'digital',
	},
	// Extra (non-station) info page links
	extra: {
		'meta': [ 'number', 'operators', 'russian-6', 'message-metadata' ],
		'monolith': [ 'military', 'russia', 'message-format' ],
		'alphabet': [ 'military', 'russia', 'russian-phonetic-alphabet' ],
		'dprk-arq': [ 'diplomatic', 'north-korea' ],
		'sked': [ 'number', 'station-schedule' ],
		'ns': [ 'number' ],
	},
	// Irregular station page names
	irregular: {
		'S28': 'the-buzzer',
		'S30': 'the-pip',
		'S32': 'the-squeaky-wheel',
		'S3012': 'the-goose',
		'S4020': 'the-air-horn',
		'S4524': 't-marker',
		'S4770': 'the-alarm',
		'S5292': 'd-marker',
		'M42': 'rtty',
		'MXI': 'naval-markers',
		'VC01': 'chinese-robot',
		'XSL': 'slot-machine',
		'X06': 'mazielka',
	},
	// Log pages
	logs: {
		month: [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ],
		monthly: [ 'S28', 'S30', 'S32' ],
	},
};
