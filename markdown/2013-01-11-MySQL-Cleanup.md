---
title: MySQL non-default DB cleanup
categories:
  - blog
tags:
  - MySQL
  - Bash
---



### Show me my non-default databases

```bash
for d in $(mysql -u root -e "show databases" | \
    grep -v 'Database\|mysql\|performance_schema\|information_schema'); \
do echo $d; done
```

### Clean non-default databases

```bash
for d in $(mysql -u root -e "show databases" | \
    grep -v 'Database\|mysql\|performance_schema\|information_schema'); \
do echo $d; mysql -u root -e "drop database $d;"; done
```
