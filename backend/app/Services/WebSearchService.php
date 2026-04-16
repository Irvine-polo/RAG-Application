<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use DOMDocument;
use DOMXPath;

class WebSearchService
{
    /**
     * Executes an internet search using DuckDuckGo HTML and returns concatenated snippets.
     */
    public function search(string $query): string
    {
        try {
            $response = Http::withOptions(['verify' => false])
                ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ])->get('https://html.duckduckgo.com/html/', [
                'q' => $query
            ]);

            if (!$response->successful()) {
                return '';
            }

            $html = $response->body();

            // Suppress HTML parsing warnings
            libxml_use_internal_errors(true);
            
            $dom = new DOMDocument();
            $dom->loadHTML($html);
            
            libxml_clear_errors();

            $xpath = new DOMXPath($dom);
            // DuckDuckGo lite snippet class
            $nodes = $xpath->query('//a[contains(@class, "result__snippet")]');

            $snippets = [];
            foreach ($nodes as $node) {
                if ($node->textContent) {
                    $snippets[] = trim($node->textContent);
                }
                if (count($snippets) >= 5) {
                    break;
                }
            }

            return implode("\n\n", $snippets);

        } catch (\Exception $e) {
            \Log::error('WebSearchService failed: ' . $e->getMessage());
            return '';
        }
    }
}
