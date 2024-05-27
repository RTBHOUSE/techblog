---
layout: post
title:  "OCP vs. Traditional Server Systems"
date:   2024-05-27 08:00:00 +0000
author: Stanisław Waszkiewicz <stanislaw.waszkiewicz@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle: "A real-life power consumption comparison of OCP and traditional servers in our infrastructure."
---

## Introduction


RTB House is utilizing two types of infrastructure in our Data Centers: Traditional and Open Compute Project. 
The Open Compute Project (OCP) is an initiative to design and openly share hardware designs for data centers and other computing infrastructure. The project aims to increase the efficiency, flexibility, and scalability of data center hardware while reducing its environmental impact and cost. 
One of the design improvements in OCP is a new approach to power delivery. Instead of each server being equipped with two PSUs (power supply units), all servers in the rack are powered by power supplies on the rack level, using a redundant power bus bar.

## Hardware specification

We are testing the following systems: 
1. OCP Gigabyte <a href="https://www.gigabyte.com/pl/Enterprise/Data-Center/TO25-Z11-rev-AA01">TO25-Z11-AA01-000</a><br/>CPU: 1x EPYC-9684X<br/>RAM:1.5TB DDR5<br/>NET: BCM57508-N2100G (NetXtreme-E Dual-port 100G QSFP56 Ethernet OCP 3.0 Adapter) 

2. ASUS <a href="https://servers.asus.com/products/Servers/Rack-Servers/RS520A-E12-RS24U">RS520A-E12-RS24U</a><br/>CPU: 1x EPYC-9684X<br/>RAM:1.5TB DDR5<br/>NET: BCM57508-P2100G (NetXtreme-E Dual-port 100G QSFP56 Ethernet PCIe4.0 x16 Adapter) 

3. ASUS <a href="https://servers.asus.com/products/Servers/Rack-Servers/RS520A-E12-RS12U">RS520A-E12-RS12U</a><br/>CPU: 1x EPYC-9684X<br/>RAM:1.5TB DDR5<br/>NET: BCM57508-P2100G (NetXtreme-E Dual-port 100G QSFP56 Ethernet PCIe4.0 x16 Adapter) 

**Server #1** is an OCP system powered by a busbar (OCP provides power through the busbar to all servers in the rack). **Server #2** and **Server #3** are equipped with standard PSUs (two per system). 


## Load and performance

All three systems have the same CPU model. On our platform, we are balancing load on specific nodes based on CPU. Nodes with the same CPU have the same load, regardless of server brand and design. 
All three servers are stressed the same way within 24 hours (CPU frequency rises when it is not under heavy load):


<p>
<img src="/pics/OCP-1.png"/>
<em>The moving average of CPU frequency on all cores.</em>
</p>

## Temperatures

**Server #1** (yellow) has an ~15 degrees lower CPU temperature than **Server #2** and **Server #3** (green):

<p>
<img src="/pics/OCP-2.png"/>
<em>CPU temperatures</em>
</p>

## Power usage

**Server #1** (yellow) power use is 50-100W lower than **Server #2** and **Server #3**. 


<p>
<img src="/pics/OCP-3.png"/>
<em>Power consumption</em>
</p>

## Power tweaks

Out of the box, ASUS servers had even higher energy use. We have adjusted power curves for them, sacrificing lower temperatures for lower FAN speed, hence lower power used for FANs. This way, approximately 70W of energy was saved. 


<p>
<img src="/pics/OCP-4.png"/>
<em>Power draw of ASUS servers before the tweaks</em>
</p>

<p>
<img src="/pics/OCP-5.png"/>
<em>Power draw of ASUS servers after the tweaks</em>
</p>

## Conclusions

OCP architecture provides better energy efficiency than traditional design without compromising on performance.  Less energy used means lower temperatures. Both of those can have a significant influence on the operating cost of a data center. In our case, this is one of the most important benefits of the OCP platform, among many others: 
- Computing power density. 
- Modular design: it is very easy to remove and install hardware components, including hot-swapping storage, which reduces time and money spent on maintenance
- Server management tools are based on trusted and tested solutions.
