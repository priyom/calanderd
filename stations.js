
var stations = module.exports = {

	regex: {
		type: {
			digital: /^(X(0?6|SL|P[A-Z]*\d*)|(F|HM|DP|SK)\d+)[a-z]?$/,
			morse: /^M(\d+|X[A-Z]*)[a-z]?$/,
			voice: /^([EGSV]\d+[a-z]?|HFGCS)$/,
		},
		family: {
			GRU: /^(([EFGV]0?6|E20|S25|V23|M[12]4|F0?[126])[a-z]?|E17[a-y]?|S0?6[a-rt-z]?)$/,
			SVR: /^([EGSV]0?7|M12|DP0?1|XP[A-Z]*\d*)[a-z]?$/,
			poland: /^([EFGS]11|G10|S(12|26)|M(0?3|20))[a-z]?$/,
			ukraine: /^(E17z|S0?6s)$/,
			DGI: /^(V0?2|M0?8|HM0?1|SK0?1)[a-z]?$/,
		},
		military: {
			russia: /^(S(28|30|32|\d{4,})|XG|[A-Za-z]+-\d{2}|M(32|XI))[a-z]?$/,
			USA: /^HFGCS$/,
			china: /^VC\d+[a-z]?$/,
			france: /^M51[a-z]?$/,
			japan: /^XSL$/,
		},
		diplomatic: {
			russia: /^X0?6[a-z]?$/,
		},
	},
	alias: {
		'M14': [ 'M24' ],
		'F01': [ '200/500', 'FSK-200500' ],
		'F06': [ '200/1000', 'FSK-2001000' ],
		'F11': [ 'POL FSK' ],
		'S28': [ 'buzzer', 'XB', 'UVB-76', 'UZB-76', 'MDZhB', 'ZhUOZ' ],
		'S30': [ 'pip', 'XT' ],
		'S32': [ 'wheel', 'squeaky wheel', 'XSW' ],
		'XG': [ 'goose' ],
		'S4020': [ 'air horn', 'XAH' ],
		'S4325': [ 'Plovets-41' ],
		'S6930': [ 'Katok-65' ],
		'MXI': [ 'cluster' ],
		'Russian Air Force': [ 'Russian AF', 'RuAF' ],
		'HFGCS': [ 'HF-GCS' ],
		'X06': [ 'mazielka' ],
	},

	// Static transmissions, with no particular scheduling
	tx: [
		'S28 4625kHz USB',
		'S28 6998kHz USB',
		'S30 3756kHz USB',
		'S30 5448kHz USB',
		'S32 3828kHz USB',
		'S32 5473kHz USB',
		'RWM 4996kHz CW',
		'RWM 9996kHz CW',
		'RWM 14996kHz CW',
		'Russian Air Force 11354kHz USB',
		'HFGCS 4724kHz USB',
		'HFGCS 6712kHz USB',
		'HFGCS 6739kHz USB',
		'HFGCS 8992kHz USB',
		'HFGCS 11175kHz USB',
		'HFGCS 13200kHz USB',
		'HFGCS 15016kHz USB',
	],
};
