


When you're being hit with DDOS of any flavor it sucks mightily. Some of the old school attacks like syn floods have been around so long there are decent defenses. One of the (seemingly) lesser known defenses is syn cookies.

### Who doesn't like cookies?

SYN cookies are particular choices of initial TCP sequence numbers by TCP servers.

### Linux

```plaintext
root@<server>:~# cat /proc/sys/net/ipv4/tcp_syncookies
0

root@<server>:~# cat /proc/sys/net/ipv4/tcp_syncookies
1
```

Now syn cookies are enabled. This not a foolproof defense but can help. Remember this method of enabling does not persist through a reboot.

### Cisco IOS Zone Based FW Syn Cookies

Global

> parameter-map type inspect global tcp syn-flood limit 20000

Zone Specific

> parameter-map type inspect-zone ddos-detection tcp syn-flood rate per-destination 20000

SYN cookies are not without problems. They can cause latency, sometimes very noticeable latency.

### Reference

[D.J. Bernstein](https://cr.yp.to/syncookies.html)
