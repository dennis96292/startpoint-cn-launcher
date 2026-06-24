; Custom NSIS hooks for StartPoint CN Launcher.
; The CDN / database / env are created at runtime under the install dir and are NOT
; tracked by the uninstaller, so remove them explicitly so uninstall leaves nothing behind.
!macro NSIS_HOOK_POSTUNINSTALL
  RMDir /r "$INSTDIR\resources\server\.cdn"
  RMDir /r "$INSTDIR\resources\server\.database"
  Delete "$INSTDIR\resources\server\.env"
!macroend
