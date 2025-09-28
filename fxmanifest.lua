----------------------------------------------------
--- https://0x4a4a78.netlify.app/
----------------------------------------------------

fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'JINGJOK'
description '0x4A4A78 Camera Mode'
version '2.0'

shared_scripts {
	'config.lua',
}

client_scripts {
    'source/client.lua',
}

ui_page 'web/ui.html'

files {
    'web/ui.html',
	'web/js/*.js',
	'web/css/*.css',
	'web/audios/*.mp3',
}

dependencies {
	'screenshot-basic'
}




