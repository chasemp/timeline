---
title: "Simple Site Loadtesting"
categories:
  - Blog
tags:
  - Security
---

Throwing some load at your setup and seeing how it reacts.

There is a difference between problem solving, and solving problems _at scale_.

### On your user host

> aptitude install httping seige apache2 bc

### On your webserver

> aptitude install htop


Seige is a lowkey load test tool, httping is nice for measuring response times in a consistent way while load testing, and apache is because we want the apache benchmark tool or 'ab'.

### Trying Seige

#### Launching a test with seige: 3 concurrent users with 3 connections

> siege -b -c 3 -r 3 <webserver>:80

```plaintext
** SIEGE 2.70
** Preparing 3 concurrent users for battle.
The server is now under siege...
HTTP/1.1 200   0.01 secs:     146 bytes ==> /
HTTP/1.1 200   0.01 secs:     146 bytes ==> /
HTTP/1.1 200   0.01 secs:     146 bytes ==> /
HTTP/1.1 200   0.00 secs:     146 bytes ==> /
HTTP/1.1 200   0.00 secs:     146 bytes ==> /
HTTP/1.1 200   0.00 secs:     146 bytes ==> /
HTTP/1.1 200   0.00 secs:     146 bytes ==> /
HTTP/1.1 200   0.00 secs:     146 bytes ==> /
HTTP/1.1 200   0.00 secs:     146 bytes ==> /
done.
Transactions:                  9 hits
Availability:             100.00 %
Elapsed time:               0.01 secs
Data transferred:           0.00 MB
Response time:              0.00 secs
Transaction rate:         900.00 trans/sec
Throughput:             0.13 MB/sec
Concurrency:                3.00
Successful transactions:           9
Failed transactions:               0
Longest transaction:            0.01
Shortest transaction:           0.00
```

This is not a great indicator of performance under load. When I raise it to 3000 users at 10 requests I start seeing:

```descriptor table full sock.c:108: Too many open files```

So I raise the descriptor limit.

> cat /proc/sys/fs/file-max

You can see your limits using

> ulimit -Sn
> ulimit -Hn


Now I see too much of:

```plaintext
socket: connection timed out
[error] socket: unable to connect sock.c:222: Operation already in progress
```

So I'm not too happy with seige. For some tests it seems ok. For large test pools it hasn't won me over. Then again the launching host isn't that great so maybe it's on my side.
	
A good compromise I found was

> siege -b -c 1000 -r 3 <webserver>:80

### Trying ab.

A thousand concurrent threads with a thousand requests.

> ab -n 1000 -c 1000 http://<webserver>/

```plaintext
This is ApacheBench, Version 2.3 <$Revision: 655654 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking  (be patient)
Completed 100 requests
Completed 200 requests
Completed 300 requests
Completed 400 requests
Completed 500 requests
Completed 600 requests
Completed 700 requests
Completed 800 requests
Completed 900 requests
Completed 1000 requests
Finished 1000 requests


Server Software:        Apache/2.2.16
Server Hostname:        
Server Port:            80

Document Path:          /
Document Length:        177 bytes

Concurrency Level:      1000
Time taken for tests:   0.656 seconds
Complete requests:      1000
Failed requests:        0
Write errors:           0
Total transferred:      453000 bytes
HTML transferred:       177000 bytes
Requests per second:    1523.82 [#/sec] (mean)
Time per request:       656.246 [ms] (mean)
Time per request:       0.656 [ms] (mean, across all concurrent requests)
Transfer rate:          674.11 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:       11   15   2.9     15      21
Processing:     6  158 209.8     32     631
Waiting:        5  158 209.9     32     631
Total:         20  174 210.7     53     646

Percentage of the requests served within a certain time (ms)
  50%     53
  66%    234
  75%    237
  80%    238
  90%    642
  95%    645
  98%    646
  99%    646
 100%    646 (longest request)
```


ab gives great data, and can generate a lot of load with minimal impact on the launching system.

I eventually settled on `ab -k -n 2000000 -c 50 http://<webserver>/`

Use http-keepalive (for consistency with production) at 2 million requests making 50 simultaneously. These numbers were hitting a load of 8+ on my test server. Anything averaging over 3.5 in production would be flagged to look at, but load testing is all about pushing limits.

Getting macro numbers from ab. Run your tests a lot and look at overall numbers.

> for i in {1..3}; do ab -n 1000 -c 1000 http://<webserver>/ >> test.txt; done

What is the average response time for request in the 95th percentile?

> grep 95% test.txt | awk '{total = total + $2}END{print total}' 

`4556 #<-- total number`

I know I made 3 passes so my average 95th percentile response is `echo "4556 / 3" | bc` = `1518 (ms)`

This number is of limited value but adding your 95% through 100% and figuring out what your response times are for 95th perctile and above can be useful.

> grep -A 3 95% test.txt | awk '{total = total + $2}END{print total}'

### Using httping

I like using httping in the background or on another host as a consistent measure of my response times.

> httping -c 10 <webserver> 

This makes 10 requests that look like:

```plaintext
connected to <webserver>:80, seq=0 time=0.97 ms 
```
I like to flood the host with requests:

> httping <webserver>  -f
