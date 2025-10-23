


I want to use MP3's for hold music, and for fun, with [Asterisk](https://www.asterisk.org/)

### Convert all mp3's in a directory for use with asterisk.


```bash
#!/bin/bash
for f in `ls *.mp3` ; do FILE=$(basename $f .mp3) ; \
ffmpeg -i $FILE.mp3 -ar 8000 -ac 1 -ab 64 $FILE.wav -ar 8000 \
-ac 1 -ab 64 -f mulaw $FILE.pcm -map 0:0 -map 0:0 ; done
```


### Asterisk Configuration

> nano extensions.conf

```plaintext
; Answer required as Music On Hold does not answer the call
exten => 2112,1,Answer
exten => 2112,2,MusicOnHold(rush)
```

I used this to play 2112 whenever you dial extension 2112.


