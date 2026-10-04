@echo off
rem ============================================================================
rem  Pattern Studio - mo ung dung
rem
rem  Nhay doi file nay. Lan dau: cai thu vien + build (vai phut). Cac lan sau:
rem  mo ngay dist\index.html trong trinh duyet, khong can server (ADR-0004).
rem  Sua code xong muon thay ket qua:   RunApp.bat rebuild
rem
rem  File nay CHI DUNG ASCII va khong goi "chcp 65001" (docs/tai-lieu-loi.md L05).
rem  Chay trong cmd nen khong vuong ExecutionPolicy cua PowerShell (L01).
rem ============================================================================
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Pattern Studio
echo  ==========================================
echo.

if not exist "package.json" (
    echo  [LOI] Khong thay package.json. RunApp.bat phai nam o thu muc goc du an.
    goto :fail
)

where node >nul 2>&1
if errorlevel 1 (
    echo  [LOI] Chua cai Node.js. Tai ban LTS tai https://nodejs.org/
    echo  Cai xong, MO LAI cua so nay roi chay lai RunApp.bat.
    goto :fail
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)"
if errorlevel 1 (
    echo  [LOI] Node.js qua cu, can 22.12 tro len. Dang co:
    node -v
    goto :fail
)

if not exist "node_modules\.bin\vite.cmd" (
    echo  Cai thu vien JavaScript ^(npm install^)...
    call npm install
    if errorlevel 1 goto :fail_npm
)

if /i "%~1"=="rebuild" goto :build
if exist "dist\index.html" goto :open

:build
echo  Build ^(npm run build^)...
call npm run build
if errorlevel 1 goto :fail_npm
rem npm co the in loi ma van thoat 0: kiem tra chinh ket qua
if not exist "dist\index.html" goto :fail_npm

:open
echo  Mo dist\index.html ...
start "" "%~dp0dist\index.html"
echo.
echo  Tab "Than 3D" can service: nhay doi RunService.bat ^(cua so rieng^).
echo.
endlocal & exit /b 0

:fail_npm
echo.
echo  [LOI] npm that bai. Doc thong bao phia tren.
echo  Neu loi EPERM: dong cac cua so "npm run dev" dang chay roi thu lai.

:fail
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
endlocal & exit /b 1
