@echo off
echo ==========================================
echo       正在将项目上传到 GitHub...
echo ==========================================
echo.

:: 确保在正确的分支
git branch -M main

:: 尝试推送
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 上传失败。
    echo 请检查上方错误信息。
    echo 如果提示需要登录，请按提示操作。
    echo.
) else (
    echo.
    echo [SUCCESS] 项目已成功上传到 GitHub！
    echo.
)

pause
