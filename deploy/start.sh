#!/bin/bash

if [ -z ${APIKEY} ]; then
	echo -e "you must supply the API key to start ivo: \n  APIKEY=foobarbaz start.sh"
	exit
fi

docker run -d \
	--name="calendard" \
	-p 80:80 \
	-e "APIKEY=${APIKEY}" \
	calendard
