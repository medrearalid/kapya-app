@echo off
SETLOCAL Enabledelayedexpansion

:: Kapya Projesi Otomatik Git Scripti
echo [1/3] Degisiklikler sahneye aliniyor (git add)...
git add .

:: Kullanicidan commit mesajini al
set /p commit_msg="Commit mesajini girin: "

if "%commit_msg%"=="" (
    echo HATA: Commit mesaji bos olamaz!
    pause
    exit /b
)

echo [2/3] Degisiklikler yerel depoya isleniyor (git commit)...
git commit -m "%commit_msg%"

if %ERRORLEVEL% NEQ 0 (
    echo HATA: Commit islemi sirasinda bir sorun olustu.
    pause
    exit /b
)

echo [3/3] Kodlar GitHub'a gonderiliyor (git push)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===========================================
    echo ISLEM BASARIYLA TAMAMLANDI: Kapya Guncellendi!
    echo ===========================================
) else (
    echo.
    echo HATA: Push islemi basarisiz oldu. Baglantinizi kontrol edin.
)

pause