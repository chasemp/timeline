



If you are doing iptables maintenance remote I always like to store my rules in a script and run them without saving. With a scheduled reboot pending locking myself out is a recoverable offense.


> /usr/local/bin/rsched

```bash
#!/bin/bash
if [ -z "$1" ]
  then
    echo "Usage: $0 "
    exit 1
fi
echo "reboot interval $1 minutes"
now=`date +"%s"`
#convert seconds to minutes
future_time=`expr $1 \\* 60`
rtime=`expr $now + $future_time`
#convert epoch to shutdown friendly format
time=`date -d @$rtime +"%H:%M"`
echo $time
#issue shutdown
shutdown -k -r $time
```

### Looks like

> root@vm:~# rsched 10

```plaintext
reboot interval 10 minutes
Console output `The system is going DOWN for reboot in 10 minutes!/0) (Wed Jul 10 14:01:57 20`
```

### Scheduling

> root@vm:~# nohup rsched 10 &

```plaintext
Broadcast message from root@vm (Wed Jul 10 14:03:02 2013):

The system is going DOWN for reboot in 10 minutes!
```

### Canceling

```plaintext
root@vm:~# fg
nohup rsched 10
```
> <cntrl+c>
