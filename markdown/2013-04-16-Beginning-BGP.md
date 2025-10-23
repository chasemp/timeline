---
title: "Beginning BGP"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - BGP
  - Cisco
---

I remember hearing a lot of conflicting information about BGP when I first started doing network admin stuff. A lot of time BGP is part of an HA strategy and there are people making business decisions surrounding the protocol itself. This breakdown strives to be accurate and laymen without being misleading.

Specific misconceptions:

1. You need a full time admin doing only BGP stuff.

2. You can accidentally take down the Internet if you mess up.

3. BGP is hard.

You do not need a 'full time' person thinking about BGP around the clock, although you do need designated contacts for just-in-case scenarios. If your providers are handling their own business you don't have to worry about taking down the Internet. (Although some small version of this happened to YouTube http://www.macworld.com/article/1132256/networking.html). BGP is no harder or easier than anything else. I have seen configurations that boggle the mind work for years. Correctly administered BGP does involves some savy.

### What is BGP?

Usually referring to the current version 4. Just read it: https://en.wikipedia.org/wiki/Border_Gateway_Protocol

### Seriously, What is BGP for though?

In order to have a service (or anything) available on the Internet it needs to be announced. Usually, your Internet Provider does this announcing for you. If you want to be the master of your own destiny you need to announce yourself. Literally, you say “here I am” to your provider. Your provider talks to other providers and before long everyone knows how to find you. When a user connects to their Internet provider they send a request for your service. Since you have made yourself known they can find you

BGP is how we find groups of addressed devices on the Internet.

### How can I start announcing myself?

In order to announce that you exist you need to have IP addresses. It's a non-human way for tracking down a resource; think phone numbers. The gentlemen at ARIN keep a big list of addresses in use. If you want to use BGP; you need addressing. If you want addressing; you talk to ARIN. There are two simultaneous IP address pools. The old is IPv4 and we are scraping the bottom of the bucket. That bucket was large enough to get the Internet this far (4 Billion+ addresses with a large chunk carved out for special reservations). The second bucket is called IPv6. IPv6 is a much deeper bucket, 3.4 x 10 to the 38th power. That is far, far, far more addresses than IPv4 has available. IPv6 has addresses reserved already for the Moon. Seriously.

To get addresses you apply. It's that simple. https://www.arin.net/resources/request.html

### …almost that simple.

IPv4 is a dwindling resource. But it has been one for a long time. In my experience, getting an IPv6 block is very easy. Getting an IPv4 block requires more justification. Scarce resources are more valued. Without a block of my own addresses can I use BGP? Well, maybe. Some providers will allocate you a block of addresses from their pool. You don't own them. You may be able to advertise them out another provider if both providers agree that is reasonable. BGP is all about relationships. No provider has to allow you to announce your block on their network whether it has been issued to you or them. Thankfully providers are in the business of making money, and the only way to make money for them is to move traffic. If you can get an address block of your very own it is called Provider Independent Address Space. Meaning you can take your addresses and move to any provider that will have you. If you talk a provider into allocating you a block of addresses it is called Provider Dependent Address Space. In order to change providers you have to change IP blocks. It can be done.

### Understanding Addressing

All address space given out is public information.

Yahoo: http://whois.arin.net/rest/customer/C00146168
Mozilla: http://whois.arin.net/rest/customer/C01111858

### Wait…They want my ASN?

ASN is automomous system number. It is both a technical and a nontechnical entity. In a non-technical sense it is a number assigned to networks under a singular control. Some companies have multiple ASN's, but in general you join ARIN and you get an ASN. This ASN is unique to you, and it is how providers will know you.

BGP thinks in ASN's.

It's like this: You have a 1:1 relationship with your ASN, but a one-to-many relationship with your addressing space.

Sort of like: You have a 1:1 relationship with your house address, but a one-to-many relationship for your house address
to phone numbers associated with your address.

Just Read it: http://en.wikipedia.org/wiki/Autonomous_System_(Internet)

### Why ASN's AND IP addresses?

When providers talk BGP to each other they refer to you and themselves by ASN number. That's the short version.

BGP is a routing protocol. Most routing protocols rely on an addressing hierarchy. Therefore it's easy to follow the numbers and find your destination. If two roomates live in a house together and use the network 192.168.0.0/16 and they link up with their neighbors who use 172.16.0.0/16. They can point routes at each other and communications happens. If one roomate in the first house wants his own subnet they can break things down. 192.168.0.0/16 becomes 192.168.0.0/24 (first roomate) AND 192.168.1.0/24 (second roomate). But their neighbors still only use 192.168.0.0/16 as it's 'good enough' to get to their house, and their house router knows how to distinguish between their rooms.

BGP exists on a larger playing field. 10.0.1.0/24 and 10.0.2.0/24 could be assigned to people or companies that have no relationship to each other. Addressing on the Internet is not assigned in a way that makes it contiguous.

It would be like if the two roomates were still using 192.168.0.0/24 and 192.168.1.0/24 but had now moved to different addresses. We would need to find a way to associate their IP block with their new location. The location would be the ASN and the address block …would be the address block.

So when two routers talk BGP to each other they say: ASN 1 has 192.168.0.0/24. ASN 2 has 192.168.1.0/24

So if BGPRouter1 says this to BGPRouter2. BGPRouter1 has to be associated with an ASN too. Let's say BGPRouter1 has ASN 3. Now BGPRouter2 knows: when I need to get to ASN1 or ASN2 I send things to ASN3. Like, if I need to mail this letter to Les Sauvages, France the first step is getting it to France.

### Summation

* BGP is how people find each other on the Internet. Usually providers worry about it.
* BGP is complex, but the basics are very straight forward.
* BGP is fundamental to understanding the Internet.
* ASN's can be assigned by ARIN. All you need to do is join.
* Addressing can be assigned by ARIN. All you need to do is apply.
