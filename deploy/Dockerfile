
 #################################################################
###    ###    ###    #  ##  #     #     ##     #    #  ####     ###
### ##  #  ##  #  ####  #  ##  ####  ##  #  #####  ##  ####  ######
### ##  #  ##  #  ####    ###     #     ##     ##  ##  ####     ###
### ##  #  ##  #  ####  #  ##  ####  ##  #  #####  ##  ####  ######
###    ###    ###    #  ##  #     #  ##  #  ####    #     #     ###
 #################################################################

# ________-=< to get a shell on the running container >=-________ #
#/                                                               \#
#|             docker exec myContainer -it /bin/bash             |#
#\_______________________________________________________________/#

FROM google/nodejs
MAINTAINER priyom <contact@priyom.org>

RUN apt-get update
RUN apt-get install -y git

RUN mkdir -p /var/www/calendard/
RUN git clone https://github.com/priyom/calanderd.git /var/www/calendard/
WORKDIR /var/www/calendard/

RUN npm install
RUN npm install -g forever

EXPOSE 80

CMD ["forever", "/var/www/calendard/main.js"]
