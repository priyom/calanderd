# Export consolidated javascript files
# Licensed under GPLv3+

nextevents.js: websdrs.js tx.js events.js timeutils.js widget.js
	cat -- $^ >| $@

