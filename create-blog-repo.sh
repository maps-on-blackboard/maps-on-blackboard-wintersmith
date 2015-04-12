#!/bin/bash
echo "source blog: "
read source
echo "new blog name: "
read dest
mkdir $dest
rsync -av \
  --exclude='**/node_modules' \
  --exclude=$source'/js/*build*' \
  --exclude=$source'/.git' \
  $source/* $dest;
cd $dest;
find . -type f -print0 \
  | xargs -0 sed -i "s/$source/$dest/g"

echo "created: $dest"

echo "creating git repo '$dest' in maps-on-blackboard .."

#read -p "Description for this repo: " -e -i \
#  "This repository is part of my blog maps-on-blackboard" desc
#read -p "Homepage along description: " -e -i \
#  "http://maps-on-blackboard.com" homepage

git init;
echo "node_modules" > .gitignore

curl -s -u 'gaganbansal123@gmail.com' \
  https://api.github.com/orgs/maps-on-blackboard/repos \
  -d '{ "name":"'$dest'", "description": "This repository is part of my blog maps-on-blackboard.", "homepage": "http://maps-onblackboard.com/" }'

repo=$dest'.git'
git remote add origin https://github.com/maps-on-blackboard/$repo

echo "Installing npm modules .."
npm install

echo "Create an interesting map for new blog"
echo " and push your changes to github."
