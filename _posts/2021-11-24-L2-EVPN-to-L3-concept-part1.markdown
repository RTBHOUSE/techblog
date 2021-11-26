---
layout: post
title:  "L2 to L3 Network Migration Concept"
date:   2021-11-24 14:31:18 +0200
author: Marek Grzybowski <marek.grzybowski@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle:    "Part 1 - RTB House network history"
---


RTB House has grown from several dedicated servers in 2012 to several DC locations.
Server infrastructure is constantly expanding to keep up with business needs.
Currently, the platform is handling around 10 million of http bid requests per second globally.
Network architecture changed over the years, and migrating to L3-only approach is hopefully the last big architectural change.
Here we would like to share our experiences regarding network upgrades and operations.


# Network generations

## First racks - switch stacking
In 2013/2014 due to lacking network capacity/stability in our environment provided by an external provider, we stared to deploy our own racks.
At the beginning we used Brocade ICX6610 switches and we stacked them in 80Gbps loops:

![image alt <>](/pics/brocade-stack-2014-03.png)

This allowed full 1Gbps capacity between any host and use of VLAN separation for security purposes, for example 
DMZ for front servers. This setup was optimal from the cost perspective at that time, but we faced three problems:

  - latency: 1Gpbs was not enough, it would take 10ms to transfer 1MB user profile from database (Cassandra in that time)
  - scalability: inability to expand the stack beyond design, bottlenecking when connecting stacks
  - availability:  our stack was lacking [HA/MLAG](https://en.wikipedia.org/wiki/Multi-chassis_link_aggregation_group), if we lost a switch, then we would have lost servers connected to that switch


## Bare-metal switches: [Cumuls Linux](https://www.nvidia.com/en-us/networking/ethernet-switching/cumulus-linux/) + CLAG/MLAG

In 2015, we deployed first racks where network was based on bare metal switches [Supermicro SSE-X3648R](https://www.supermicro.com/en/products/accessories/networking/sse-x3648s.php) 
with Cumulus Linux as [NOS](https://en.wikipedia.org/wiki/Network_operating_system), and connected them to existing brocade stack using 4x10Gbps LACP uplink.
At that time bare metal switch concept, DAC cables were emerging technologies and Cumulus Linux was very immature. We spammed Cumlus support with bug raports.
Despite that, we achieved the majority of our goals:

  - new 10Gpbs infrastructure/network cost increase vs old 1Gbps was minimal due to relatively inexpensive hardware
  - 1ms time to transfer a 1MB user profile from database to the compute server thanks to DACs and 10Gbps NICs.
   (Those were times when, by default, Linux distro kernel was giving single queue on NICs,
    so everything needed to be tuned manually, according to https://www.kernel.org/doc/Documentation/networking/scaling.txt )
  - availability: MLAG allowed to connect the servers to two redundant devices, but this implementation was not perfect:
  ![image alt <>](/pics/mlag-basic-setup.png)
    - MLAG LACP in a fast mode could wait up to 3-4 seconds to disable interface in a group, 
      it caused some of our server cluster nodes to flap and was very annoying.
    - Cumulus MLAG immaturity caused problems, that we were unable to reproduce ( for example from time to time pair of switches stop to see each other via peerlink ) .

## VXLAN BGP EVPN
Pure L2 network can not be scaled up indefinitely. As racks rows were added,
we were looking for a way to expand the infrastructure and make it more stable.
Cisco published interesting book: [Building Data Centers with VXLAN BGP EVPN](https://www.oreilly.com/library/view/building-data-centers/9780134514895/)
and few months later Cumulus Linux presented a new release, adding EVPN functionality.
We saw VXLAN BGP EVPN as a potential solution for our scaling and stability issues.
The release was quickly deployed on production environment and basic EVPN set up using Cisco guidelines.
Leaf switches encapsulated L2 into VXLAN tunnels and SPINE switches become L3 routers.
This design eliminated potential L2 loops at second and third network layer.
Our conclusions regarding VXLAN BGP EVPN network architecture after few years of experience
(on the most cost-effective devices - mainly Broadcom Tomahawk based) are as follows:

  - stability/visability/debugging is lacking: whenever network device fails, we could observe strange things, for example: Some random switch is starting to announce network layer reachability information (NLRI) that is bogus.
   We could not reproduce this problem, and it occurred on production several times. 
  - depending on the silicon chip model, device behaviour could differ, and lack of chip feature could hit you hard
  - in real life VXLAN BGP EVPN is hard to extend and modify on production. 
    - In one case, we tried to enable [ARP/ND suppression](https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-42/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/Basic-Configuration/#arp) and [it blocked keepalived traffic](https://github.com/mgrzybowski/cldemo-arp-suppression-test#garp-flood---is-suppres)
    - when we enabled ARP/ND suppression for most of the  devices, the network sudenly, without apparent reason became so unstable, 
      that the only way to quickly recover was to roll back configs and restart all switches in the datacenter.
      This instability appeared only when it was deployed at scale on production. As You can imagine, this was not a good day ;).
    - Our experiments with EVPN Routing had shown, that it works well on Vagrant test environment, but when we put config on a physical device chip limitations will kick in,
      and entire carefully planned setup is doomed to fail.

## Q: What are the practical limits on the size of a flat L2 network?

After adding racks after racks, we ended up with a basic VXLAN BGP EVPN + MLAG deployment, where the largest VLAN/VXLAN had:

```bash
$ arp -an  | grep 'on bond0' | grep -v  incomplete | wc -l 
1435
````
MACs addresses.

To be able to accommodate so large ARP table on the host, some sysctl's need to be tuned up. Our production settings are as follows:
```
net.ipv4.neigh.default.base_reachable_time_ms = 1200000
net.ipv6.neigh.default.base_reachable_time_ms = 1200000
net.ipv4.neigh.default.gc_thresh1 = 8192
net.ipv4.neigh.default.gc_thresh2 = 32768
net.ipv4.neigh.default.gc_thresh3 = 65536
```

As you can imagine, to grow more,  we are in need of a network architecture that is:
  - more scalable
  - easy to manage/debug/deploy 
  - able to run on the most cost optimal switch silicon chips (like Broadcom Tomahawk) 
  - keep current VALN/VXLAN separation between bare-metal servers

It was decided, that new servers should be connected to the switches in the "L3" way to avoid broadcast domains.
We will keep current VLAN/VXLAN separation in old "L2" part of network and replace it with VRF in "L3".
Then we will connect those  "L2" and "L3" networks together by as many uplinks as needed 
without the need of migrate entire locations to new architecture.
If you are interested in the implementation details, please continue to the next posts. 

P.S. Alternative solutions
  * EVPN Routing was too complicated for us, ASIC limitations are hard to predict, and when you need a feature on entire DC it may require devices upgrade.
  * External router connecting multiple L2 networks will not be able to handle the required volume of traffic
  * Simple L3 on native vlan will break network separation we relay on for bare-metal servers
















