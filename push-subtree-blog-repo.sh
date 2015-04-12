echo "which blog repo (subtree)? "
read $repo
git subtree push --prefix=contents/article/$repo $repo master
