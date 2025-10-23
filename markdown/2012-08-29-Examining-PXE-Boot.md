---
categories:
  - blog
tags:
  - Jekyll
  - update
---

I have a host with MAC 00:30:48:60:f3:ca. This host is configured to look for a PXE server, but was not matching the correct profile.

### Verify my configuration

> cat dhcpd.conf

```plaintext
option PXE.mtftp-cport          code 2 = unsigned integer 16;
option PXE.mtftp-sport          code 3 = unsigned integer 16;
option PXE.mtftp-tmout          code 4 = unsigned integer 8;
option PXE.mtftp-delay          code 5 = unsigned integer 8;
option PXE.discovery-control    code 6 = unsigned integer 8;
option PXE.discovery-mcast-addr code 7 = ip-address;

authoritative;

class "PXEclients" {
    match if (
          (substring (option vendor-class-identifier, 0, 9) = "PXEClient")
      or  (substring (option vendor-class-identifier, 0, 9) = "Etherboot"));
    option vendor-class-identifier "PXEClient";
    vendor-option-space PXE;
    option PXE.mtftp-ip 0.0.0.0;
    filename "PXElinux.0";
    next-server ;
}
```

### is DHCP serving correctly?

```plaintext
.da.bootps > .da.bootpc: BOOTP/DHCP, Reply, length 300
.bootps > .da.bootps: BOOTP/DHCP, Request from 00:30:48:60:f3:ca (oui Unknown), length 548
.da.bootps > .bootps: BOOTP/DHCP, Reply, length 319
.bootps > .da.bootps: BOOTP/DHCP, Request from 00:30:48:60:f3:ca (oui Unknown), length 548
```

### Is TFTP matching correctly?

```plaintext
@:~# tcpdump port 69
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 65535 bytes
10.0.254.247.2070 > .da.tftp:  27 RRQ "PXElinux.0" octet tsize 0
10.0.254.247.2071 > .da.tftp:  32 RRQ "PXElinux.0" octet blksize 1456
10.0.254.247.49152 > .da.tftp:  79 RRQ "PXElinux.cfg/53d19f64-d663-a017-8922-00304860f3ca" octet tsize 0 blksize 1408
10.0.254.247.49153 > .da.tftp:  63 RRQ "PXElinux.cfg/01-00-30-48-60-f3-ca" octet tsize 0 blksize 1408
10.0.254.247.49154 > .da.tftp:  51 RRQ "PXElinux.cfg/0A00FEF7" octet tsize 0 blksize 1408
10.0.254.247.49155 > .da.tftp:  50 RRQ "PXElinux.cfg/0A00FEF" octet tsize 0 blksize 1408
10.0.254.247.49156 > .da.tftp:  49 RRQ "PXElinux.cfg/0A00FE" octet tsize 0 blksize 1408
10.0.254.247.49157 > .da.tftp:  48 RRQ "PXElinux.cfg/0A00F" octet tsize 0 blksize 1408
10.0.254.247.49158 > .da.tftp:  47 RRQ "PXElinux.cfg/0A00" octet tsize 0 blksize 1408
10.0.254.247.49159 > .da.tftp:  46 RRQ "PXElinux.cfg/0A0" octet tsize 0 blksize 1408
10.0.254.247.49160 > .da.tftp:  45 RRQ "PXElinux.cfg/0A" octet tsize 0 blksize 1408
10.0.254.247.49161 > .da.tftp:  44 RRQ "PXElinux.cfg/0" octet tsize 0 blksize 1408
10.0.254.247.49162 > .da.tftp:  50 RRQ "PXElinux.cfg/default" octet tsize 0 blksize 1408
```

PXE is looking for entries that match itself. So PXE thinks it is:

```plaintext
53d19f64-d663-a017-8922-00304860f3ca
01-00-30-48-60-f3-ca
0A00FEF7
0A00FEF
0A00FE
0A00F
0A00
0A0
0A
0
default
```

If you look in `/var/tftp/PXElinux.cfg`

```
<me>@<pxe/tftp/server>:/var/tftp/PXElinux.cfg# ls -al
-rw-r--r--  1 <me> <me> 1833 May  6 16:58 default
-rw-r--r--  1 <me> <me> 1833 May  6 16:58 reinstall
```

This means PXE found the default correctly but I wanted it to find another profile

### Create a new match

> ln -s reinstall 01-00-30-48-60-f3-ca

```
<me>@<pxe/tftp/server>:/var/tftp/PXElinux.cfg# ls -al
lrwxrwxrwx  1 <me> <me>    9 May 24 15:02 01-00-30-48-60-f3-ca -> reinstall
-rw-r--r--  1 <me> <me>  166 May  6 16:58 unattended
-rw-r--r--  1 <me> <me> 1833 May  6 16:58 reinstall
```

Now I have a match for my PXE host to find that has non-default instructions. An unattended install.

### Verify TFTP got the changes

```
@:~# tcpdump port 69
lab01.da.2070 > .da.tftp:  27 RRQ "PXElinux.0" octet tsize 0
lab01.da.2071 > .da.tftp:  32 RRQ "PXElinux.0" octet blksize 1456
lab01.da.49152 > .da.tftp:  79 RRQ "PXElinux.cfg/53d19f64-d663-a017-8922-00304860f3ca" octet tsize 0 blksize 1408
lab01.da.49153 > .da.tftp:  63 RRQ "PXElinux.cfg/01-00-30-48-60-f3-ca" octet tsize 0 blksize 1408
lab01.da.49154 > .da.tftp:  35 RRQ "linux" octet tsize 0 blksize 1408
IP lab01.da.49155 > .da.tftp:  39 RRQ "initrd.gz" octet tsize 0 blksize 1408
```

PXE has now matched and my host is reinstalling.

### Reference
[Debian PXE Boot](https://wiki.debian.org/PXEBootInstall)

