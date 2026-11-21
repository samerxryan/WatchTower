$ErrorActionPreference = 'Stop'
$reportDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $reportDir 'Rapport_Technique_WatchTower.docx'
$out = Join-Path $reportDir 'Rapport_Technique_WatchTower.pdf'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  $d = $w.Documents.Open($src, $false, $true)
  $d.ExportAsFixedFormat($out, 17)
  $pages = [int]$d.ComputeStatistics(2)
  $d.Close(0)
  Write-Output "PDF exporte: $out"
  Write-Output "Pages: $pages"
} finally {
  $w.Quit()
}
