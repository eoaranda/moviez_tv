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

#go to parent download folder 
cd ..

#replace all the files on the parent folder
cp -R moviez_tv-master/* ..

#delete downloaded folder
rm -R moviez_tv-master

#run the npm install
#cd ..
#npm install #not for now

#restar entire pi
shutdown -r now