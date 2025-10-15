


When you need to watch file system events efficiently.

> aptitude install inotify-tools

### Wait for delete
This waits for a file to be deleted and then echo's:

```bash
#!/bin/bash
inotifywait -e delete_self ./hi/yes  && echo "gone"
```

### Waiting for a create

This watches for files created in a directory and then echo's. This is more appropriately done with the -m option in real life.

```bash
#!/bin/bash
while true; do

inotifywait -e create ./hi  && echo "yo"
done
```

### Watching for changes in `/home`

```bash
#!/bin/bash
while true; do
    touch /var/log/changes
    inotifywait -r -e create "/home" |
    while read filename eventlist eventfile
    do
        echo "see new $eventfile"
        echo "creation $eventfile" >> /var/log/changes
    done
done
```


