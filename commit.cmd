@echo off

git add .

git commit -m "%*"
echo ------------------------
git push -u origin main
