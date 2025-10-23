---
title: "Specialty Packet Capture"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - standard
---

Situations where it's useful to analyze traffic:

* Don't have access to the logs
* Want to look at traffic somewhere upstream like an LB
* Something is making logs ineffectual
* Other

Pretty much all roads point to packet sniffing.

## HTTPRY

An efficient packet sniffer aimed at HTTP

No args output (as oneline but broken down for explanation):

```
    2015-10-09 17:46:48         - timestamp
    10.0.0.1    10.0.0.2        - source-ip/dest-ip or vice versa (depending on arrow)
    >                   - direction of traffic
    GET                 - http method
    foo.com             - http host
    /myuri              - the URI in question
    HTTP/1.1                - HTTP version
    -                   - status code
    -                   - reason
```

The output fields are configurable. Say you only serve one site on a box so the host field never changes and the objective is to narrow down a few suspect URI's.

> httpry -f timestamp,source-ip,direction,request-uri

```
2015-10-09     18:10:43 10.0.0.1    >   /myuri
```

Since httpry outputs text

> httpry -f timestamp,source-ip,request-uri | egrep -i '\/myuri\/[0-9]'{6}

Other than text munging there are a few native mechanisms for targeting with tcpdump style filters

> httpry 'host 74.1.1.1 and port 8080'

specifying an HTTP method for collection (along with ability to read/write PCAP)

> httpry -m GET,POST

There is also a native statistics mode in `httpry -s` that by provides meta stats.

```plaintext
2015-10-09 19:20:48 one.myhost.org     147 rps
2015-10-09 19:20:48 two.myhost.org     2 rps
2015-10-09 19:20:48 three.myhost.org   9 rps
2015-10-09 19:20:48 totals  156.46 rps
```

Show me data aggregated in 30s buckets with a minimum treshold of 10/rps

> httpry -s -l 10 -t 30 

`httpry` has the ability to run as a daemon natively as well.

## ngrep

Payload aware network search tool with grep and tcpdump like magic

> ngrep port 80 -W single

```plaintext
T 10.0.0.1:80 -> 10.0.0.2:65227 [AP] HTTP/1.1 200 OK..\
Date: Fri, 09 Oct 2015 21:45:16 GMT..\
Server: Apache..Strict-Transport-Security: max-age=31536000..\
X-Powered-By: PHP/5.5.9-1ubuntu4.13..X-Frame-Options: Deny..\
Cache-Control: private, no-cache, no-store, must-revalidate..
Pragma: no-cache..\
X-Content-Type-Options: nosniff..\
Content-Length: 49..Connection: close..Content-Type: application/json....\
{"result":[],"error_code":null,"error_info":null}
```

So what if we are behind a reverse proxy and the header source IP address is only part of the story. Most likely we want to analyze the X-Forwarded-For field.

Sample our web traffic honoring embedded linefeeds (newline) looking for X-forwarded-for header fields, extracting the initial IP value, and showing the top 10 IP's.

> ngrep -n 1000 port 80 -W byline | grep -i x-forwarded-for | awk '{print $2}' | cut -d ',' -f 1 | sort | uniq -c | sort -n | tail -n 10

Watching for mail the hard way: `ngrep 'vacation' port 25`

```plaintext
T 2620::62748 -> 2620::76:25 [A]
Return-Path: no-reply@mail.org..To: foo@mail.org..From: dude <no-reply
@dude.org>..Reply-to: noway@mail.org..Subject: foo asked for vacation
```

ngrep is extremely powerful but is vulnerable to packet fragmentation.

## netsniff-ng

A super efficient packet capture tool that is Pcap independent

> /usr/sbin/netsniff-ng

```plaintext
< 3 66 1444429202.367551
 [ Eth MAC (84:78:ac:5a:19:41 => f2:3c:91:6e:f6:f5), Proto (0x0800, IPv4) ]
 [ Vendor (Unknown => Unknown) ]
 [ IPv4 Addr (99.x.x.x => 74.x.x.x), Proto (6), TTL (53), TOS (0), Ver (4),
   IHL (5), Tlen (52), ID (48089), Res (0), NoFrag (1), MoreFrag (0), FragOff (0), CS
   um (0x0daf) is ok ]
 [ TCP Port (62403 => 22 (ssh)), SN (0xbb019f19), AN (0xf7b8096d), DataOff (8
   ), Res (0), Flags (ACK ), Window (8189), CSum (0x33aa), UrgPtr (0) ]
 [ chr ....T...M..O ]
 [ hex  01 01 08 0a 54 d4 be f7 4d a3 f6 4f ]
```

netsniff-ng is interesting for a few reasons:

* It uses a zero-copy mechanism for packet capture (libpcap >1.0 does now too)
* It doesn't need libpcap
* It can write to libpcap format really efficiently


### References
[HTTPRY](https://dumpsterventures.com/jason/httpry/)

[Tao Security HTTPRY](https://taosecurity.blogspot.com/2008/06/logging-web-traffic-with-httpry.html)

[Intro to NGrep](http://www.stearns.org/doc/ngrep-intro.current.html)

[Netsniff-ng](https://github.com/netsniff-ng/netsniff-ng)
