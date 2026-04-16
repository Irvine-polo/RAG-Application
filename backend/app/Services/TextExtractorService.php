<?php
namespace App\Services;

use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory;

class TextExtractorService
{
    public function extract(string $filePath, string $mimeType): string
    {
        return match(true) {
            str_contains($mimeType, 'pdf')  => $this->extractPdf($filePath),
            str_contains($mimeType, 'word') => $this->extractDocx($filePath),
            default                          => $this->extractTxt($filePath),
        };
    }

    private function extractPdf(string $path): string
    {
        $parser   = new PdfParser();
        $pdf      = $parser->parseFile($path);
        return $pdf->getText();
    }

    private function extractDocx(string $path): string
    {
        $phpWord  = IOFactory::load($path);
        $text     = '';
        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                if (method_exists($element, 'getText')) {
                    $text .= $element->getText() . "\n";
                }
            }
        }
        return $text;
    }

    private function extractTxt(string $path): string
    {
        return file_get_contents($path);
    }
}