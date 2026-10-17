@echo off
setlocal
title TMy Car - Gerar AAB 1.6.4
pushd "%~dp0"
if not defined JAVA_HOME goto missing
if not defined ANDROID_HOME goto missing
if not exist "%JAVA_HOME%\bin\java.exe" goto missing
if not exist "%ANDROID_HOME%\platforms\android-36\android.jar" goto missing
call gradlew.bat --no-daemon --max-workers=1 "-Dorg.gradle.jvmargs=-Xmx768m -Dfile.encoding=UTF-8" bundleRelease
if errorlevel 1 goto failed
echo AAB 1.6.4 gerado em app\build\outputs\bundle\release\app-release.aab
echo Use a mesma chave de upload antes de enviar ao teste interno.
goto end
:missing
echo Configure JAVA_HOME com JDK 17 e ANDROID_HOME com Android SDK 36.
goto end
:failed
echo Compilacao falhou. Nao envie arquivos antigos encontrados na pasta.
:end
pause
popd
endlocal
