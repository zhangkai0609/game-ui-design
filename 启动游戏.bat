@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE_EXE=node"
if exist "D:\openclaw\node.exe" set "NODE_EXE=D:\openclaw\node.exe"
echo 蒲牢·时光钟声 H5 已启动
echo 本机访问: http://127.0.0.1:5178/
echo 手机访问需要公网隧道或同网防火墙放行
"%NODE_EXE%" server.mjs
