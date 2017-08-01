# LiveSync
Livesync is a socket-based online chat room service that allows users to syncronize playback of video to all members in the server. It's general purpose is to watch videos or shows with friends, syncronizing the video automatically.

## Features
  - Video Sync (delay is <2000ms at worst)
  - Built in chat
  - Separate subtitle declaration
  - Leadership roles

## Setup
I run Livesync over on NearlyFreeSpeech. General setup over there is:
  - Basic Apache server to serve index.html, etc.
  - Daemon to run the nodejs
On setup in NFS, that's just a proxy from /ws/ pointing to the node server, and a daemon instance that is running /server/run.sh.