$ErrorActionPreference = 'Stop'

$reportDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docxPath = Join-Path $reportDir 'Rapport_Technique_WatchTower.docx'

Write-Output "Ouverture de $docxPath"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.Options.SaveInterval = 0

try {
    $doc = $word.Documents.Open($docxPath, $false, $false)
    Write-Output 'Document ouvert'

    foreach ($toc in $doc.TablesOfContents) { $toc.Update() | Out-Null }
    $doc.Fields.Update() | Out-Null
    $doc.Repaginate()
    Write-Output 'Champs et TOC mis a jour'

    # Index des legendes : "Figure 2.1" / "Tableau A.1" -> numero de page
    $capByNumber = @{}
    foreach ($para in $doc.Paragraphs) {
        $raw = $para.Range.Text
        if ($raw -match '\[\[') { continue }
        $styleName = [string]$para.Style.NameLocal
        if ($styleName -ne 'Caption' -and $styleName -ne 'Legend' -and $styleName -ne 'Légende') { continue }
        if ($raw -match '^\s*(Figure|Tableau)\s+([0-9A-Za-z]+\.[0-9]+)') {
            $key = $Matches[1] + ' ' + $Matches[2]
            $capByNumber[$key] = [int]$para.Range.Information(3)
        }
    }
    Write-Output "Legendes indexees: $($capByNumber.Count)"

    $resolvedFig = 0
    $resolvedTab = 0
    foreach ($para in $doc.Paragraphs) {
        $raw = $para.Range.Text
        $key = $null
        if ($raw -match '\[\[FIG:([0-9]+\.[0-9]+)\]\]') {
            $key = 'Figure ' + $Matches[1]
        }
        elseif ($raw -match '\[\[TAB\]\]') {
            $label = ($raw -replace '\t\[\[TAB\]\]', '').Trim()
            if ($label -match '^(Tableau\s+[0-9A-Za-z]+\.[0-9]+)') { $key = $Matches[1] }
        }
        if ($null -ne $key -and $capByNumber.ContainsKey($key)) {
            $label = ($raw -replace '\t\[\[(FIG:[0-9.]+|TAB)\]\]', '').Replace("`r", '').Trim()
            $r = $para.Range.Duplicate
            $r.MoveEnd(1, -1) | Out-Null
            $r.Text = $label + "`t" + [string]$capByNumber[$key]
            if ($key.StartsWith('Figure')) { $resolvedFig++ } else { $resolvedTab++ }
        }
    }
    Write-Output "Figures resolues: $resolvedFig ; Tableaux resolus: $resolvedTab"

    $doc.Repaginate()
    $pages = [int]$doc.ComputeStatistics(2)
    Write-Output "Pages: $pages"
    $doc.Save()
    Write-Output 'DOCX enregistre'
    $doc.Close(0)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
