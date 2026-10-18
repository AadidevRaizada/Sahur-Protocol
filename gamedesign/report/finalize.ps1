# Word pass over the built report. Never saves the .docx; the PDF uses SaveAs2 because ExportAsFixedFormat hangs from PowerShell.
#   -Pages : prints "row=page" for each contents-table row, found by heading text
#   -Pdf   : exports Game_Design_Project_Report_3.pdf (with the page numbers filled in memory)
# build_report.py calls it once with both switches and writes the same numbers into the .docx itself.
param([switch]$Pages, [switch]$Pdf)
$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot "out"
$src = Join-Path $dir "Game_Design_Project_Report_3.docx"
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($src, $false, (-not $Pages))
  if ($Pages) {
    $doc.Repaginate()
    $pairs = @(
      @(2, "Project Topic 1: Good Puzzle Design"), @(3, "Project Topic 2: Game Description"),
      @(4, "Project Topic 3: Sahur Protocol"), @(5, "Project Topic 3: Visualization"), @(6, "Project Topic 3: Game Design Document"),
      @(7, "Project Topic 3: Prototyping"), @(8, "Project Topic 3: Play Testing"), @(9, "Project Topic 3: References"))
    foreach ($pr in $pairs) {
      $rng = $doc.Content
      if ($rng.Find.Execute($pr[1])) { $pg = $rng.Information(3); "$($pr[0])=$pg"; $doc.Tables.Item(2).Cell($pr[0], 3).Range.Text = "$pg" }
    }
  }
  if ($Pdf) { $doc.SaveAs2((Join-Path $dir "Game_Design_Project_Report_3.pdf"), 17); "pdf saved" }
  $doc.Close($false)
} finally { $word.Quit() }


