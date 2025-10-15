---
title: "21 Musings From Incident Response"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - IR
---

![A building with heavy damage in the 2020 Aegean Sea earthquake from https://commons.wikimedia.org](/assets/images/post/21musingsheader.png)

These are my personal anecdotal conclusions and I totally appreciate it may not line up with anyone else's. This is US centric, as that is my experience, and I learned IR “on the job” over a few decades.  YMMV.

<!--more-->

1. Operational and security incidents often begin the same way, and may have the same impacts. Sometimes the separation boils down to intent.  That means your infrastructure operations team and your security operations team have to agree on what escalation means, when it matters, and how to document an ongoing investigation. 

2. Response to a malicious incident is extremely time consuming. For every hour an adversary spends in control of a sensitive asset your organization may need to commit 3-10x+ in response. This is quarantining, establishing severity, determining depth of compromise, narrative development, investigation, remediation, evidence management, briefing external/in-house counsel, customer notification, high touch marquee customer meetings, law enforcement liaison, and more.

3. Hostile actors are just as likely to be in time zones and on schedules that are not your own.  This will suck. An all hands on deck approach is not sustainable because the responders will be burnt up in 10-12 hours. It takes preparation, discipline and clear leave for folks to stand down during portions so there are hands available when the incident goes real-time beyond initial responder capacity.

4. Boundaries and self-care are of the utmost importance. That said, my personal experience is that cautious bystanders seem to be rarely held to account for inaction. When information is scarce and it looks like a blast radius may be large, self-preservation may tell someone not to associate themselves.  Do not be surprised when folks go dark during triage or show up once the dust is settling and the damage is clearer. An incident will highlight the toxic cultural elements of an organization where blame, scapegoating, and politics rule. Do your best to not take it personally and to maintain your own state of mind.

5. If the impact is serious, expect to need external help. Incident response is not something most in-house information security teams do enough of to avoid common pitfalls. Your lawyer will consult other lawyer's. Your evidence collection will similarly benefit from the hand of experience. Plus, if you collect in real-time with an external forensics firm they can be the people who have to testify in court.  Waiting until you need this augmentation is too late. 

6. Your organization may have a cybersecurity component to their insurance policy.  This is a reactive mitigation (not a preventative control) but this is one of many reasons that cybersecurity needs a seat at the executive table.  There are almost certainly provisions for notification on breach depending on scope and impact.  Insurance makes money by not paying out.  Blend these requirements into your tabletop exercises.

7. Readiness is the word I typically use to describe the extent to which an organization is prepared to handle the technical, legal, PR, and communications challenges of a compromise. This is often the most deficient area of an otherwise mature ISMS. Table tops are essential. Documentation on expected communications and an incident commander role are essential. Designated storage for evidence is essential. It's difficult to staff and fund these elements in most organizations. Usually you do not know, until you know.

8. Escalating to the authorities is not a solution for immediate impact. Local police seem not to have jurisdiction or incentive. Federal police have significant discretion in what they pursue. Federal agencies will take your report and you may never meaningfully hear from them again. It is not the role of law enforcement officers to make your organization whole. They pursue criminals and sometimes contribute to recovering losses or damages as a result, but it is not their primary function. This does not mean do not involve law enforcement. It means they most likely will not be of immediate tactical assistance.

9. If you do end up on the phone with a three letter agency, walk out the narrative of your evidence through the lens of quantifying impact on U.S. citizens. Generally, that is the narrative of consequence.

10. Information Security is a series of tradeoffs for short-term confidentiality. The odds are overwhelming that encryption today will be trivial to break at some point in the future. Don't get mired in absolutes because there are few. Making your services and data an impractical and unattractive target (attackers do cost:benefit analysis just like you) is the idea. No defense is hands-off permanent, and no defense is 100% effective. That by itself does not mean it's a bad idea. Real-time ad hoc incident response mitigation measures can suffer from committee syndrome. No idea is perfect and gridlock ensues, or you end up with holes in your rain boots so your toes can breathe. A collection of hurdles is almost always the most effective defense.

11. Confusion to your enemies! I have used mod_sec and JS fingerprinting to throw targeted HTTP 500's for endpoints based on prior attack patterns. It was shockingly effective.  A significant talking point opposing these types of measures may sound something like "if we block their known traits we won't be able to effectively track their behavior" and "that is so easy to overcome it won't do any good". Attacker's cannot be both so sophisticated they are immune to new costs introduced by changes in response tactics AND be so predictable in pattern that they are being reliably monitored. Defense is hard and fatalism is paralyzing. Defense is primarily about dissuasion rather than absolutes.

12. You are more likely to be compromised through an ancillary and/or support service than your primary production endpoints. Financial reimbursement portals, ticketing systems, development platforms, B2B integrations, and data warehouses for BI (this is a pot of gold) are attractive targets. The primary "production" systems probably get basic controls and oversight. Tech on the periphery is often some degree of skunkworks passion project 'this isn't what I was hired for but...', that had to skirt policy and controls to get rolling.

13. Many companies I have experience with have a pervasive internal story outlining why they are not an attractive target for a cybersecurity attack. I suspect this is partially a coping mechanism, subconscious avoidance and recency bias. It is one of the most pernicious forces working against readiness. FUD is not a counterpoint. A consistent reinforcement of how readiness contributes to resilience and why that matters for the bottom line is all you have. It may not be enough, but that's the voice which represents systemic change on the wide arc.

14. During response to an incident, from declaration to close, it is vitally important to differentiate three categories of information: assumptions (you have them, you need them, they often must be explicitly acknowledged), opinions (what you think may be happening) and facts (what you can prove to be true). A big part of readiness is learning how to communicate in this way. "How do we know that?" Is the first question out of my mouth when new information lands

15. Incident response is an order of magnitude more effective in high trust teams. Recreating a timeline with overlapping motive and intent is full of speculation. Too much and you will drown in noise, too little and you will stall out into hoping blindly it doesn't happen again.

16. The most dreaded attacker is not necessarily the most technical. I have seen quite a few incidents where we found ourselves saying "If they only knew to do x that would have been 10 times worse". The scariest adversary has knowledge of your processes and tools, patience, and enough technical acumen to bridge those assets together.

17. Malicious actors make mistakes. Full stop. Check for the obvious: shell history, sent messages, deleted messages, archive files, tmp, ss (netstat), etc. If you assume every hostile actor is above reproach you won't get very far.

18. Identifying an attacker with high confidence is very, very difficult. That said, everyone has the tools they use without thinking. Pattern identification is a part of defense. Think in terms of persona rather than identity.  You are mitigating vulnerabilities, not threats.

19. If you are at it long enough, someone will ask you about "hacking back". They mean attacking the attacker. They will ask in a f2f/video meeting. This is personal liability territory and you would do well to ask for the request in writing from legal. That won't happen. If it does happen, my advice is don't do it. 

20. There may be pressure to minimize, downplay, spin, and outright lie about impact (or cause). The more toxic the environment, the more likely and insidious the coercion. Integrity is tantamount to credibility.

21. You cannot prove a negative, and so absence of evidence is absence of conclusion. But not necessarily absence of activity. It's the best we can do. "No evidence of...". "No indication of...". This becomes your language when breach and incident disclosure are part of your duties.
