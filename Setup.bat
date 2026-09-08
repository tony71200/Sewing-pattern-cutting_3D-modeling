@echo off
rem ============================================================================
rem  Pattern Studio - cai dat tren may moi
rem
rem  Chay MOT LAN khi vua chep du an sang may khac. Chay lai nhieu lan cung
rem  khong sao: buoc nao da xong thi bo qua.
rem
rem  File nay CHI DUNG ASCII va khong goi "chcp 65001". Dat chcp giua file .bat
rem  lam cmd doc lech byte: "echo." thanh "o.", "set" mat gia tri. Da thu va dinh.
rem  Vi vay moi thong bao deu viet tieng Viet KHONG DAU. Dung them dau vao day.
rem ============================================================================
setlocal EnableExtensions

cd /d "%~dp0"

set "PY=.venv\Scripts\python.exe"
set "TORCH_CPU=https://download.pytorch.org/whl/cpu"

echo.
echo  ==========================================
echo   Pattern Studio  -  cai dat
echo  ==========================================
echo.

if not exist "package.json" (
    echo  [LOI] Khong thay package.json.
    echo  Setup.bat phai nam o thu muc goc cua du an.
    goto :fail
)

rem ============================ 1. Node.js ==================================
echo  [1/4] Kiem tra Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [LOI] Chua cai Node.js.
    echo.
    echo  Tai ban LTS tai:  https://nodejs.org/
    echo  Can Node 22 tro len. Cai xong, MO LAI cua so nay roi chay lai Setup.bat
    echo  ^(cua so cu khong thay lenh moi cai^).
    goto :fail
)
for /f "tokens=*" %%v in ('node -v') do set "NODEV=%%v"
echo        Node %NODEV%

rem ============================ 2. npm install ===============================
echo.
echo  [2/4] Cai thu vien JavaScript ^(npm install^)...
call npm install
if errorlevel 1 (
    echo.
    echo  [LOI] npm install that bai. Doc thong bao phia tren.
    goto :fail
)
echo        Xong. Tu day da chay duoc phan RAP.

rem ============================ 3. Python ====================================
echo.
echo  [3/4] Kiem tra Python ^(chi can cho tab Than 3D^)...
where python >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [BO QUA] Chua cai Python. Phan RAP van chay duoc day du.
    echo  Muon dung tab Than 3D thi cai Python 3.10 tro len tai
    echo  https://www.python.org/ ^(nho tick "Add python.exe to PATH"^),
    echo  roi chay lai Setup.bat.
    goto :done_ok_no_python
)
for /f "tokens=*" %%v in ('python --version') do set "PYV=%%v"
echo        %PYV%

rem ============================ 4. venv + torch + anny =======================
echo.
echo  [4/4] Cai moi truong Python cho service than 3D...

if not exist "%PY%" (
    echo        Tao moi truong ao .venv ...
    python -m venv .venv
    if errorlevel 1 (
        echo.
        echo  [LOI] Tao .venv that bai.
        goto :fail
    )
) else (
    echo        .venv da co, dung lai.
)

"%PY%" -c "import torch" >nul 2>&1
if errorlevel 1 (
    echo        Tai torch ban CPU ^(~200 MB, cho vai phut^)...
    "%PY%" -m pip install --disable-pip-version-check torch --index-url %TORCH_CPU%
    if errorlevel 1 (
        echo.
        echo  [LOI] Cai torch that bai. Kiem tra ket noi mang roi chay lai.
        goto :fail
    )
) else (
    echo        torch da co.
)

echo        Cai anny va cac thu vien cua service...
"%PY%" -m pip install --disable-pip-version-check -e "service[dev]"
if errorlevel 1 (
    echo.
    echo  [LOI] Cai service that bai. Doc thong bao phia tren.
    goto :fail
)

echo.
echo        Kiem tra lai...
"%PY%" -c "import anny, torch, numpy; print('        anny + torch + numpy OK')"
if errorlevel 1 (
    echo  [LOI] Cai xong nhung khong import duoc. Xoa thu muc .venv roi chay lai.
    goto :fail
)

echo.
echo  ==========================================
echo   CAI DAT XONG
echo  ==========================================
echo.
echo  Cach chay:
echo    1. Nhay doi RunService.bat        ^(service than 3D^)
echo    2. Mo cua so khac, chay:  npm run dev
echo    3. Vao trinh duyet:  http://localhost:5173
echo.
echo  Buoc 1 co the bo qua: khi do tab Rap van chay day du,
echo  chi tab Than 3D la khong dung duoc.
goto :done

:done_ok_no_python
echo.
echo  ==========================================
echo   CAI DAT XONG ^(khong co Than 3D^)
echo  ==========================================
echo.
echo  Cach chay:  npm run dev    roi vao  http://localhost:5173
goto :done

:fail
set "RC=1"
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
endlocal & exit /b 1

:done
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
endlocal & exit /b 0
