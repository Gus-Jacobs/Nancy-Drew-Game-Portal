@echo off
SETLOCAL

REM Path to the DirectX installer (assuming it's in the assets folder)
SET DX_INSTALLER_PATH="%~dp0assets\dxwebsetup.exe"

REM Check for a common DirectX DLL (e.g., d3dx9_43.dll)
REM This is a simple check and might not cover all DirectX components.
REM A more robust check would involve registry keys or DirectX SDK tools.
REM For 64-bit systems, check System32. For 32-bit, check SysWOW64.
IF EXIST "%SystemRoot%\System32\d3dx9_43.dll" (
    ECHO DirectX d3dx9_43.dll found. Assuming DirectX is installed.
    EXIT /B 0
)

IF EXIST "%SystemRoot%\SysWOW64\d3dx9_43.dll" (
    ECHO DirectX d3dx9_43.dll found in SysWOW64. Assuming DirectX is installed.
    EXIT /B 0
)

REM If not found, attempt to install DirectX silently
ECHO DirectX d3dx9_43.dll not found. Attempting to install DirectX...
IF EXIST %DX_INSTALLER_PATH% (
    ECHO Running DirectX installer: %DX_INSTALLER_PATH%
    %DX_INSTALLER_PATH% /silent
    IF %ERRORLEVEL% NEQ 0 (
        ECHO DirectX installation failed with error code %ERRORLEVEL%.
        EXIT /B 1
    ) ELSE (
        ECHO DirectX installation completed.
        EXIT /B 0
    )
) ELSE (
    ECHO DirectX installer not found at %DX_INSTALLER_PATH%.
    EXIT /B 1
)

ENDLOCAL