FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# RUN apk update
# RUN apk add tor
# RUN apk add bash

# RUN echo "Log notice stdout" >> /etc/torrc
# RUN echo "SocksPort 0.0.0.0:9050" >> /etc/torrc

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production

# Bundle app source
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]