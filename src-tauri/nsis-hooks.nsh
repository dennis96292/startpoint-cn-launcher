; Custom NSIS hooks for StartPoint CN Launcher.
; The CDN (~11GB) / database (all player saves+accounts) / env are created at runtime under
; the install dir and are NOT tracked by the uninstaller, so on a REAL uninstall we remove
; them to leave nothing behind.
;
; BUT we must NOT remove them during an in-place UPGRADE, or every update would wipe accounts
; and force a full 11GB re-download. We tell the two cases apart by where the uninstaller runs:
;   * Genuine uninstall (Add/Remove Programs): the registered UninstallString is a bare
;     "$INSTDIR\uninstall.exe" with no "_?=", so NSIS copies the uninstaller to %TEMP% and runs
;     it from there  ->  $EXEDIR != $INSTDIR  ->  clean up runtime data.
;   * In-place UPGRADE: the installer runs the uninstaller with "_?=$INSTDIR" (no temp copy),
;     so it executes from the install dir  ->  $EXEDIR == $INSTDIR  ->  KEEP .cdn + .database.
; (Only protects upgrades FROM a build that ships this hook; a build still carrying the old
;  unconditional hook wipes when its own uninstaller is the one the installer runs.)
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $EXEDIR != $INSTDIR
    RMDir /r "$INSTDIR\resources\server\.cdn"
    RMDir /r "$INSTDIR\resources\server\.database"
    Delete "$INSTDIR\resources\server\.env"
  ${EndIf}
!macroend
