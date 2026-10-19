@echo off
setlocal
cd /d "%~dp0"

echo.
echo TMy Car - publicar melhorias das notificacoes
echo Projeto: tmycar-222e5
echo.

call firebase.cmd use tmycar-222e5
if errorlevel 1 goto :erro

pushd functions
call npm.cmd install --omit=optional
if errorlevel 1 goto :erro_functions
call npm.cmd audit --omit=dev
if errorlevel 1 goto :erro_functions
popd

call firebase.cmd deploy --only functions:processarNotificacoesManutencao --project tmycar-222e5
if errorlevel 1 goto :erro

echo.
echo PUBLICACAO CONCLUIDA.
echo As notificacoes agora chegam em um resumo diario unico.
echo.
pause
exit /b 0

:erro_functions
popd
:erro
echo.
echo A PUBLICACAO NAO FOI CONCLUIDA.
echo Tire uma foto desta janela e envie para verificarmos o motivo.
echo.
pause
exit /b 1
