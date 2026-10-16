# Opens the generated DOCX in Word, updates the table of contents (page numbers),
# saves it as the final DOCX, and optionally exports a PDF copy for visual QA.
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$PdfOut = ""
)
$ErrorActionPreference = "Stop"
$Docx = (Resolve-Path $Docx).Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($Docx, $false, $false)
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  # Word drops the automation connection when it saves over an existing file, or saves after
  # an export, so: save to a fresh path first (the caller deletes $Out), then export.
  $doc.SaveAs2($Out, 16)                     # 16 = wdFormatDocumentDefault (.docx)
  if ($PdfOut -ne "") { $doc.ExportAsFixedFormat($PdfOut, 17) }   # 17 = PDF
  "Word: TOC updated, saved $Out"
  try { $doc.Close($false) } catch {}        # Word sometimes drops the COM link on close; the files are already written
} finally {
  try { $word.Quit() } catch {}
}
