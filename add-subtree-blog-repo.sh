#!/bin/bash
read -p "blog repo: " -e repo
git remote add $repo https://github.com/maps-on-blackboard/$repo
git subtree add --prefix=contents/articles/$repo --squash $repo master

cd contents/articles/$repo
#npm install

