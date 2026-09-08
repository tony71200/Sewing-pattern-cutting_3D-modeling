@echo off
rem ============================================================================
rem  Pattern Studio - khoi dong service than 3D
rem
rem  Kiem tra truoc tung dieu kien roi moi chay, va KHONG dong cua so khi loi:
rem  file .bat tu dong dong lai la kieu that bai kho chan doan nhat tren Windows.
rem
rem  File nay CHI DUNG ASCII va khong goi "chcp 65001". Dat chcp giua file .bat
rem  lam cmd doc lech byte: "echo." thanh "o.", "set" mat gia tri. Da thu va dinh.
rem  Vi vay moi thong bao deu viet tieng Viet KHONG DAU. Dung them dau vao day.
rem ============================================================================
setlocal EnableExtensions

rem Chay tu thu muc chua file nay, khong phu thuoc cho nguoi dung dang dung
cd /d "%~dp0"

set "PY=.venv\Scripts\python.exe"
set "PORT=8791"
set "APP=service\body_service.py"

echo.
echo  ==========================================
echo   Pattern Studio  -  service than 3D
echo  ==========================================
echo.

rem --- 1. Dung thu muc du an chua? -------------------------------------------
if not exist "%APP%" (
    echo  [LOI] Khong thay "%APP%".
    echo.
    echo  File RunService.bat phai nam o thu muc goc cua du an,
    echo  ngang hang voi package.json va thu muc service\
    goto :fail
)

rem --- 2. Moi truong ao Python -----------------------------------------------
if not exist "%PY%" (
    echo  [LOI] Chua co moi truong ao Python tai .venv
    echo.
    echo  Chay Setup.bat mot lan de cai dat, roi mo lai file nay.
    goto :fail
)

rem --- 3. Thu vien da cai chua? ----------------------------------------------
echo  Dang kiem tra thu vien...
"%PY%" -c "import anny, torch, numpy" >nul 2>&1
if errorlevel 1 (
    echo  [LOI] Moi truong ao thieu anny / torch / numpy.
    echo.
    echo  Chay Setup.bat de cai lai.
    goto :fail
)

rem --- 4. Cong co ai chiem khong? --------------------------------------------
netstat -ano -p TCP | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  [LOI] Cong %PORT% dang bi chiem. Co the service da chay san.
    echo.
    echo  Xem tien trinh nao dang giu cong:
    echo      netstat -ano ^| findstr :%PORT%
    echo.
    echo  Neu do la service cu, dong cua so do lai, hoac:
    echo      taskkill /F /PID ^<so PID o cot cuoi^>
    goto :fail
)

rem --- 5. Chay ---------------------------------------------------------------
echo  Thu vien OK. Dang nap Anny va ham nong...
echo.
echo  Lan dau co the mat ~10 giay de bien dich kernel. Sau do moi lan dung
echo  than mat khoang 1 giay.
echo.
echo  Service chi lang nghe tren 127.0.0.1. May khac trong mang KHONG vao duoc.
echo  Dong service: bam Ctrl+C roi tra loi Y.
echo.
echo  Khi thay dong "san sang", mo mot cua so khac va chay:  npm run dev
echo  ------------------------------------------------------------------------
echo.

"%PY%" "%APP%"
set "RC=%ERRORLEVEL%"

echo.
echo  ------------------------------------------------------------------------
if "%RC%"=="0" (
    echo  Service da dung binh thuong.
) else (
    echo  [LOI] Service thoat voi ma loi %RC%. Doc thong bao phia tren.
)
goto :done

:fail
set "RC=1"

:done
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
endlocal & exit /b %RC%
