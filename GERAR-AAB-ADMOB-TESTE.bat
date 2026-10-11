@echo off
setlocal
title TMyCar - AAB AdMob TESTE 1.6.0
pushd "%~dp0"
if not defined JAVA_HOME set "JAVA_HOME=C:\Users\Bruno Lima\Documents\Codex\2026-08-24\referenced-chatgpt-conversation-this-is-an\.tools\android-build\ms-jdk\jdk-17.0.20.1+1"
if not defined ANDROID_HOME set "ANDROID_HOME=C:\Users\Bruno Lima\Documents\Codex\2026-08-24\referenced-chatgpt-conversation-this-is-an\.tools\android-build\sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if not exist "%JAVA_HOME%\bin\java.exe" goto missing
if not exist "%ANDROID_HOME%\platforms\android-36\android.jar" goto missing
echo Este pacote usa SOMENTE anuncios de teste. Nao publicar em producao.
call gradlew.bat --no-daemon --max-workers=1 bundleRelease
if errorlevel 1 goto failed
echo.
echo AAB de teste gerado em app\build\outputs\bundle\release\app-release.aab
echo Ainda precisa assinar com a chave de upload e usar a faixa de TESTE INTERNO.
goto end
:missing
echo Configure JAVA_HOME com JDK 17 e ANDROID_HOME com Android SDK 36.
goto end
:failed
echo A geracao falhou. Nao use um AAB antigo que possa existir na pasta.
echo Envie a mensagem de erro para verificarmos.
:end
pause
popd
endlocal
