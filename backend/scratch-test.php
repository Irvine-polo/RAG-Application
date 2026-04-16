<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Testing WebSearchService directly ===\n";
$service = new App\Services\WebSearchService();
$result = $service->search('What is the capital of Japan?');
echo "Result length: " . strlen($result) . "\n";
echo "Result: " . substr($result, 0, 500) . "\n\n";

echo "=== Testing RagService with allow_web_search=true ===\n";
$rag = new App\Services\RagService();
try {
    $answer = $rag->answer('What is the capital of Japan?', true);
    echo "Source type: " . $answer['source_type'] . "\n";
    echo "Action required: " . ($answer['action_required'] ?? 'none') . "\n";
    echo "Answer: " . substr($answer['answer'], 0, 300) . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
