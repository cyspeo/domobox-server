FROM node:6


ADD package.json /app/

WORKDIR /app

RUN npm install

ADD . /app/

EXPOSE 3001

VOLUME /app/log

CMD node index.js
