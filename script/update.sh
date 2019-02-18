#!/bin/sh
echo MoviezTV Update        # This is a comment, too!

#move to download folder
cd download

#download new version
curl -L https://github.com/eoaranda/moviez_tv/archive/master.zip > master.zip

#unzip
unzip master.zip

#remove downloaded zip file and the unzip tmp folder
rm master.zip

#go to the newly created folder
cd moviez_tv-master

#delete unnecesary files
rm -r db
rm -r script

#go to parent folder
cd ..

#replace all the files except this script and the db
cp -R moviez_tv-master/ ..

#delte downloaded folder
rm -r moviez_tv-master

#go to parent folder moviez_tv
cd ..

#run the npm install
npm install

#restar entire pi
shutdown -r now