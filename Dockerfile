FROM mhart/alpine-node:14.16.1

# need to install Bash as it doenst port with this image
RUN apk add --no-cache bash

RUN npm install yarn -g

#change to tmp folder this helps caching npm pakages for faster build next time
WORKDIR /tmp
COPY package.json /tmp/
COPY yarn.lock /tmp/
RUN npm config set registry http://registry.npmjs.org/ && yarn

#SET working dir and copy files to it
WORKDIR /usr/src/app
COPY . /usr/src/app/

# LOGS VOLUME
VOLUME ["/var/log/cmaCgmTetrisApi", "/usr/src/cmaCgmTetrisApi/public"]

#copy node_modules folder from tmp
RUN cp -a /tmp/node_modules /usr/src/app/

#BUILD ARGUMENT FOR REACT BUILD AND LABEL JOB
#DEFAULT IS SET TO PRODUCTION
ARG NODE_ENV=production
ARG APP_ENV=production
ARG APP_URL=https://cma-cgm-tetris-api-staging.eu-staging.kacdn.net
RUN echo ${NODE_ENV} ${APP_URL}

#expose port
EXPOSE 3000

# Run migration
ENTRYPOINT ["/usr/src/app/conf/entrypoint.sh"]

#strat the app
CMD [ "node", "./server.js" ]
