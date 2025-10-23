

I like to use utilities like iftop, but sometimes simple is better. I found a small example of this but I believe I have improved the conversions.


```bash
#!/bin/bash

if [ -z "$1" ]; then
        echo
        echo usage: $0 network-interface
        echo
        echo e.g. $0 eth0
        echo
        exit
fi

IF=$1

function bytes2Mbps {
    Mbps=`expr $1 \* 8 / 1048576`
    echo $Mbps
}

while true
do
        R1=`cat /sys/class/net/$1/statistics/rx_bytes`
        T1=`cat /sys/class/net/$1/statistics/tx_bytes`
        sleep 1
        R2=`cat /sys/class/net/$1/statistics/rx_bytes`
        T2=`cat /sys/class/net/$1/statistics/tx_bytes`
        TBPS=`expr $T2 - $T1`
        RBPS=`expr $R2 - $R1`

        TRATE=`bytes2Mbps $TBPS`
        if [ $TRATE -lt 1 ]
        then
            TRATE=`expr $TBPS \* 8`
            TRATE="$TRATE b/s"
        else
            TRATE="$TRATE Mb/s"
        fi

        RRATE=`bytes2Mbps $RBPS`
        if [ $RRATE -lt 1 ]
        then
            RRATE=`expr $RBPS \* 8`
            RRATE="$RRATE b/s"
        else
            RRATE="$RRATE Mb/s"
        fi

        echo "tx $1: $TRATE rx $1: $RRATE"
done
```

> root@<host>:~# ./bw.sh eth0

If throughput is less than 1Mbps you see:

`tx eth0: 0 b/s rx eth0: 528 b/s`

If greater than you get:

`tx eth0: 39 Mb/s rx eth0: 47 Mb/s`


