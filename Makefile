# Export consolidated javascript files
# Licensed under GPLv3+

nextevents.js: websdrs.js tx.js events.js widget.js
	cat -- $^ >| $@

