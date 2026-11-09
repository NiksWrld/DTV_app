@echo off
cd /d "%~dp0"
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
.local\pgsql\bin\pg_ctl.exe -D .local\pgdata status >nul 2>&1 || start "" /b .local\pgsql\bin\pg_ctl.exe -D .local\pgdata -l .local\pg.log -o "-p 5432" start
timeout /t 5 >nul
start "DTV API" /d "%~dp0apps\api" cmd /k cargo run -p dtv-api
start "DTV Web" cmd /k npm run dev
timeout /t 10 >nul
start http://localhost:3000
