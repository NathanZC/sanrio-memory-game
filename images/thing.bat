@echo off
setlocal enabledelayedexpansion

:: Initialize counter
set counter=1

:: Loop through all .png files in the current directory
for %%f in (*.png) do (
    :: Format the new file name as cardX.png
    set newname=card!counter!.png

    :: Rename the file
    ren "%%f" "!newname!"

    :: Increment counter
    set /a counter+=1
)

echo All .png files have been renamed.
pause
