@echo off
set "msg=%~1"
if "%msg%"=="" set "msg=Made changes"

echo Adding files...
git add .

echo Committing...
git commit -m "%msg%"

echo Pushing to remote...
git push

echo Done!
