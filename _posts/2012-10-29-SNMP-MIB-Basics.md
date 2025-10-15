



SNMP is nice but MIB translations can be a pain. It can also be necessary for figuring out what certain numbers mean in the MIB tree.

### Where does SNMP look for MIBs?

> net-snmp-config --default-mibdirs

### Make user specific directory (needs to be in above path)

> mkdir -p /home/<me>/.snmp/mibs

### Grab MIB data from Cisco (or wherever)

Example MIB for Firewall info: `ftp://ftp.cisco.com/pub/mibs/v2/CISCO-UNIFIED-FIREWALL-MIB.my`

copy to..

`/home/<me>/.snmp/mibs/CISCO-UNIFIED-FIREWALL-MIB`

### Enable MIB

Find out where SNMP is looking for configuration parameters:

> net-snmp-config --snmpconfpath

Edit your user snmp configuration (if path is included in above command)

> n /home/<me>/.snmp/snmp.conf
> mib +CISCO-UNIFIED-FIREWALL-MIB

### Try walking the top OID tree

> snmpwalk -v2c <community> <remote_device_ip>

```plaintext
MIB search path: /home/<me>/.snmp/mibs:/usr/share/mibs/site:/usr/share/snmp/mibs:/usr/share/mibs/iana:/usr/share/mibs/ietf:/usr/share/mibs/netsnmp
Cannot find module (CISCO-SMI): At line 37 in /home/<me>/.snmp/mibs/CISCO-UNIFIED-FIREWALL-MIB
Cannot find module (CISCO-FIREWALL-TC): At line 46 in /home/<me>/.snmp/mibs/CISCO-UNIFIED-FIREWALL-MIB
```

### What's with? 'Cannot find module'

This means there are MIB dependencies. You can probably retrieve these from `ftp://ftp.cisco.com/pub/mibs/v2`.

```plaintext
/home/<me>/.snmp/mibs/CISCO-SMI
/home/<me>/.snmp/mibs/CISCO-FIREWALL-TC
```

Enable these MIBs as well.

### Walk the tree and enjoy MIB goodness

> <me>@<box>:~# snmpwalk -v2c -c <community> <remote_device_ip> >> snmpinfo.txt

### Show me the basic SNMP catagories

> cut -d: -f 1 snmpinfo.txt | uniq | sort

```plaintext
SNMPv2-MIB
Technical Support
Copyright (c) 1986-2013 by Cisco Systems, Inc.
SNMPv2-MIB
DISMAN-EVENT-MIB
SNMPv2-MIB
IF-MIB
RFC1213-MIB
IP-MIB
IP-FORWARD-MIB
IP-MIB
TCP-MIB
UDP-MIB
SNMPv2-SMI
SNMPv2-MIB
SNMPv2-SMI
```

You can check out DISMAN-EVENT-MIB using grep. If you find a MIB you can use SNMPGET next time.

### Retrieve Uptime Using MIB's and SNMPGET

> <me>@<box>:~# snmpget -v2c -c <community> <remote_device_ip> DISMAN-EVENT-MIB::sysUpTimeInstance

`DISMAN-EVENT-MIB::sysUpTimeInstance = Timeticks: (151866995) 17 days, 13:51:09.95`


### Reference
[Cisco MIB](ftp://ftp.cisco.com/pub/mibs/v2/CISCO-SMI.my)
[NetSNMP](https://www.net-snmp.org/wiki/index.php/TUT:Using_and_loading_MIBS)
[Debian SNMP](https://wiki.debian.org/SNMP)
[Cisco ASR MIB](https://www.cisco.com/c/en/us/td/docs/routers/asr1000/mib/guide/asr1kmib/asr1mib2.html#wp1034752)

