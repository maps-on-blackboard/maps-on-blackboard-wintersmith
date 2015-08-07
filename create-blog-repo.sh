#!/bin/bash
read -p "source blog: " -i blog2-thematic-map -e source
read -p "new blog name (repo): " -e dest
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

read -p "Description: " -i 'This repository is part of my blog maps-on-blackboard' -e desc
read -p "Homepage along description: " -i http://maps-on-blackboard.com -e homepage
#  "http://maps-on-blackboard.com" homepage
#read -p "Description for this repo: " -e -i \
#  "This repository is part of my blog maps-on-blackboard" desc
#read -p "Homepage along description: " -e -i \
#  "http://maps-on-blackboard.com" homepage

git init;
echo "node_modules" > .gitignore
data='{ "name":"'$dest'", "description": "'$desc'", "homepage": "'$homepage'" }'
echo $data > /home/gaganb/tmp/data.txt
read -p "want to proceed" -e ans
curl -o /home/gaganb/create-project.log -u 'gaganbansal123@gmail.com' \
  https://api.github.com/orgs/maps-on-blackboard/repos \
  -d @/home/gaganb/tmp/data.txt

#curl -s -u 'gaganbansal123@gmail.com' \
#  https://api.github.com/orgs/maps-on-blackboard/repos \
#  -d '{ "name":"'$dest'", "description": "This repository is part of my blog maps-on-blackboard.", "homepage": "http://maps-onblackboard.com/" }'

repo=$dest'.git'
git remote add origin https://github.com/maps-on-blackboard/$repo

echo "Installing npm modules .."
npm install

echo "Create an interesting map for new blog"
echo " and push your changes to github."
