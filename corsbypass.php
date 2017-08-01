<?php
	
$url = $_GET['url'];
$file_headers = @get_headers($url);
if(!$file_headers || $file_headers[0] == 'HTTP/1.1 404 Not Found') {
    $exists = false;
}
else {
    $exists = true;
}
if(!$exists)
	return;
if(pathinfo(parse_url($url)['path'], PATHINFO_EXTENSION) != "vtt")
	return;
if(parse_url($url)['host'] != 'psp4804.shell.seedhost.eu' && parse_url($url)['host'] != 'vaxion.sky.seedhost.eu')
	return;
echo file_get_contents($url);
?>