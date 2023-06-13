#!/bin/sh

rsync -rpv --exclude=uploads public package.json server.js ohshima@tinlizzie.org:public_html/koya-server

