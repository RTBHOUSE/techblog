---
layout: post
title:  "L2 to L3 Network Migration Concept"
date:   2021-11-26 16:27:27 +0000
author: Piotr Kowalczyk <piotr.kowalczyk@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle:    "Part 3 - Interconnecting 'old' flat L2 based on EVPN/VXLAN network with a 'new' L3-BGP-only based one:"
---

* This will become a table of contents (this text will be scrapped).
{:toc}

# Motivation (for connecting 'old' BGP/EVPN network to 'new' L3-BGP-only)
    
 - The old L2 network is overgrown and ARP tables on servers became very large. Scalability reached its limits.
 - Migrating network architecture in place is impossible without re-deploying all servers.
 - L3-BGP-only is the most obvious choice for future growth, but a new network needs a connection to the old one. We need to be able to keep [CLOS topology](https://en.wikipedia.org/wiki/Clos_network) (spine levels throughputs are in Tbps) to meet the latency and throughput demand.


# Implementation
 
For each old L2 vlan, we deploy a pair of route reflectors. This route reflectors will relay [NLRI](https://www.inetdaemon.com/tutorials/internet/ip/routing/bgp/operation/messages/update/nlri.shtml) information between L2 servers and border SONiC L3 switches.
 
## BGP route reflectors

![image alt <>](/pics/rr1_diagram.png)

[BGP protocol](https://www.rfc-editor.org/rfc/rfc4271.txt) is de-facto ubiquitous today. It was devised for ISP/IX/WAN but lately it started to be used on large  LANs. There are 2 modes of BGP:
eBGP and iBGP. eBGP is used between autonomous systems. iBGP is used inside the autonomous systems. 
We chose to implement iBGP for VLAN (in L2) / VRF (L3) and eBGP for routing between those separated internal networks. We can do that because traffic between internal networks is not large and we are filtering/firewalling it. Predefined-AS number is used for servers and switches included in the network (for VLAN in L2 or for VRF in L3). This way the network becomes a fully Autonomous System.
 
Usually iBGP requires full-mesh peering setup. With hundreds of servers in single VLAN scale, full-mesh topology would be impossible one to achieve. Full mesh connection formula is:

```total number of connections = (n*(n-1))/2```

`n` is the number of devices.

RR (Route Reflector) can propagate iBGP routes to peers, hence a full mesh of iBGP peers is not necessary. With network scaling-up, adding new peers will require only peering (SONiC Switches or L2 servers) with 2 x route reflectors. Both RR act as active ones (active-active solution) to provide redundancy along with multipath routes. Please be aware: route reflectors are not routers per se! They are only “reflecting” NLRIs (prefixes+attributes) to the connected clients - IP traffic is not forwarded nor passed by them directly. We use [FRR demons](https://frrouting.org/) to implement RRs.

### Peering route reflectors between each other

<details>
<summary>
{% highlight text %}
# cat /etc/frr/frr.conf # <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
!
 bgp cluster-id 172.16.63.0
 neighbor BGP-KFFR peer-group
 neighbor BGP-KFFR remote-as internal
 neighbor BGP-KFFR description KFRR internal
 neighbor 172.16.63.2 peer-group BGP-KFFR
 neighbor 172.16.63.2 description kfrr2
 !
 address-family ipv4 unicast
  neighbor BGP-KFFR soft-reconfiguration inbound
  neighbor BGP-KFFR route-map KFRR-IMPORT in
  neighbor BGP-KFFR route-map KFRR-EXPORT out
 exit-address-family
!
ip prefix-list KFRR-ANY seq 5 permit any
!
route-map KFRR-IMPORT permit 1
 description KFFR IMOPRT
 match ip address prefix-list KFRR-ANY
!
route-map KFRR-EXPORT permit 1
 description KFFR EXPORT
 match ip address prefix-list KFRR-ANY
!
line vty
!
{% endhighlight %}
</details>

*There needs to be intra-connection between pair of two route-reflectors to avoid split-brain case.*

### Peering RRs with SONiC LEAF gateways:

<details>
<summary>
{% highlight text %}
# cat /etc/frr/frr.conf # <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
!
router bgp 65108
 bgp router-id 172.16.63.1
 neighbor BGP-L3 peer-group
 neighbor BGP-L3 remote-as internal
 neighbor BGP-L3 timers 1 3
 neighbor BGP-L3 timers connect 1
 bgp listen limit 2048
 bgp listen range 172.17.0.0/23 peer-group BGP-L3
 !
 address-family ipv4 unicast
  neighbor BGP-L3 addpath-tx-all-paths
  neighbor BGP-L3 route-reflector-client
  neighbor BGP-L3 soft-reconfiguration inbound
  neighbor BGP-L3 prefix-list from-l3 in
  neighbor BGP-L3 prefix-list to-l3 out
 exit-address-family
!
ip prefix-list from-l3 seq 10 permit 172.16.0.0/12 ge 32
ip prefix-list from-l3 seq 99 deny any
ip prefix-list to-l3 seq 5 permit 0.0.0.0/0
ip prefix-list to-l3 seq 10 permit 172.18.0.0/15 le 32
ip prefix-list to-l3 seq 20 permit 172.16.64.0/24 le 32
ip prefix-list to-l3 seq 30 permit 172.16.65.0/24 le 32
ip prefix-list to-l3 seq 40 permit 172.16.0.0/12 ge 32
ip prefix-list to-l3 seq 99 deny any
!
{% endhighlight %}
</details>

*Each L3-BGP-enabled SONiC switch needs to be connected to the RR. We are using BGP-L3 peer group specifically for this purpose.*

### Peering old L2 hosts with RR:
<details>
<summary>
{% highlight text %}
# cat /etc/frr/frr.conf # <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
!
 neighbor BGP-VLAN2 peer-group
 neighbor BGP-VLAN2 remote-as internal
 bgp listen limit 2048
 bgp listen range 172.16.0.0/16 peer-group BGP-VLAN2
 !
 address-family ipv4 unicast
  neighbor BGP-VLAN2 addpath-tx-all-paths
  neighbor BGP-VLAN2 route-reflector-client
  neighbor BGP-VLAN2 soft-reconfiguration inbound
  neighbor BGP-VLAN2 prefix-list from-vlan2 in
  neighbor BGP-VLAN2 prefix-list to-vlan2 out
 exit-address-family
!
ip prefix-list from-vlan2 seq 10 permit 172.16.65.0/24 le 32
ip prefix-list from-vlan2 seq 20 permit 172.16.0.0/12 ge 32
ip prefix-list from-vlan2 seq 99 deny any
ip prefix-list to-vlan2 seq 10 permit 172.18.0.0/15 le 32
ip prefix-list to-vlan2 seq 20 permit 172.16.64.0/24 le 32
ip prefix-list to-vlan2 seq 30 permit 172.16.65.0/24 le 32
ip prefix-list to-vlan2 seq 40 permit 172.16.0.0/12 ge 32
ip prefix-list to-vlan2 seq 99 deny any
!
{% endhighlight %}
</details>

*Each old L2-based host needs to be peered with RR*


<details>
<summary>
{% highlight text %}
# cat /etc/frr/frr.conf # <--- Click this to show more for the whole config of RR:
{% endhighlight %}
</summary>
{% highlight text %}
!
frr version 8.0.1
frr defaults traditional
hostname frr1.ams.creativecdn.net
log file /var/log/frr/frr_bgp.log
log syslog informational
no ipv6 forwarding
service integrated-vtysh-config
!
router bgp 65108
 bgp router-id 172.16.63.1
 bgp log-neighbor-changes
 bgp cluster-id 172.16.63.0
 neighbor BGP-KFFR peer-group
 neighbor BGP-KFFR remote-as internal
 neighbor BGP-KFFR description KFRR internal
 neighbor BGP-KUBERNATES peer-group           
 neighbor BGP-KUBERNATES remote-as internal  
 neighbor BGP-L3 peer-group
 neighbor BGP-L3 remote-as internal
 neighbor BGP-L3 timers 1 3
 neighbor BGP-L3 timers connect 1
 neighbor BGP-NAT peer-group
 neighbor BGP-NAT remote-as internal
 neighbor BGP-VLAN2 peer-group
 neighbor BGP-VLAN2 remote-as internal
 neighbor 172.16.63.2 peer-group BGP-KFFR
 neighbor 172.16.63.2 description kfrr2
 neighbor 172.16.63.101 peer-group BGP-KUBERNATES 
 neighbor 172.16.63.101 description krr101 
 neighbor 172.16.63.101 port 180 
 neighbor 172.16.63.102 peer-group BGP-KUBERNATES 
 neighbor 172.16.63.102 description krr101 
 neighbor 172.16.63.102 port 180 
 neighbor 172.16.5.251 peer-group BGP-NAT
 neighbor 172.16.5.251 description nat1a
 neighbor 172.16.5.252 peer-group BGP-NAT
 neighbor 172.16.5.252 description nat1b
 bgp listen limit 2048
 bgp listen range 172.17.0.0/23 peer-group BGP-L3
 bgp listen range 172.16.0.0/16 peer-group BGP-VLAN2
 !
 address-family ipv4 unicast
  neighbor BGP-KFFR soft-reconfiguration inbound
  neighbor BGP-KFFR route-map KFRR-IMPORT in
  neighbor BGP-KFFR route-map KFRR-EXPORT out
  neighbor BGP-KUBERNATES route-reflector-client
  neighbor BGP-KUBERNATES soft-reconfiguration inbound
  neighbor BGP-KUBERNATES prefix-list from-kubernates in
  neighbor BGP-KUBERNATES prefix-list to-kubernates out
  neighbor BGP-L3 addpath-tx-all-paths
  neighbor BGP-L3 route-reflector-client
  neighbor BGP-L3 soft-reconfiguration inbound
  neighbor BGP-L3 prefix-list from-l3 in
  neighbor BGP-L3 prefix-list to-l3 out
  neighbor BGP-NAT addpath-tx-all-paths
  neighbor BGP-NAT route-reflector-client
  neighbor BGP-NAT soft-reconfiguration inbound
  neighbor BGP-NAT prefix-list from-nat in
  neighbor BGP-NAT prefix-list to-vlan2 out
  neighbor BGP-VLAN2 addpath-tx-all-paths
  neighbor BGP-VLAN2 route-reflector-client
  neighbor BGP-VLAN2 soft-reconfiguration inbound
  neighbor BGP-VLAN2 prefix-list from-vlan2 in
  neighbor BGP-VLAN2 prefix-list to-vlan2 out
 exit-address-family
!
ip prefix-list KFRR-ANY seq 5 permit any
ip prefix-list from-kubernates seq 10 permit 172.18.0.0/15 le 32
ip prefix-list from-kubernates seq 20 permit 172.16.64.0/24 le 32
ip prefix-list from-kubernates seq 99 deny any
ip prefix-list from-l3 seq 10 permit 172.16.0.0/12 ge 32
ip prefix-list from-l3 seq 99 deny any
ip prefix-list from-nat seq 10 permit 0.0.0.0/0
ip prefix-list from-nat seq 99 deny any
ip prefix-list from-vlan2 seq 10 permit 172.16.65.0/24 le 32
ip prefix-list from-vlan2 seq 20 permit 172.16.0.0/12 ge 32
ip prefix-list from-vlan2 seq 99 deny any
ip prefix-list to-kubernates seq 99 deny any
ip prefix-list to-l3 seq 5 permit 0.0.0.0/0
ip prefix-list to-l3 seq 10 permit 172.18.0.0/15 le 32
ip prefix-list to-l3 seq 20 permit 172.16.64.0/24 le 32
ip prefix-list to-l3 seq 30 permit 172.16.65.0/24 le 32
ip prefix-list to-l3 seq 40 permit 172.16.0.0/12 ge 32
ip prefix-list to-l3 seq 99 deny any
ip prefix-list to-vlan2 seq 10 permit 172.18.0.0/15 le 32
ip prefix-list to-vlan2 seq 20 permit 172.16.64.0/24 le 32
ip prefix-list to-vlan2 seq 30 permit 172.16.65.0/24 le 32
ip prefix-list to-vlan2 seq 40 permit 172.16.0.0/12 ge 32
ip prefix-list to-vlan2 seq 99 deny any
!
route-map KFRR-IMPORT permit 1
 description KFFR IMOPRT
 match ip address prefix-list KFRR-ANY
!
route-map KFRR-EXPORT permit 1
 description KFFR EXPORT
 match ip address prefix-list KFRR-ANY
!
line vty
!
{% endhighlight %}
</details>

*Please note that the whole FRR config includes optional kubernetes bits*

## Connecting 'legacy-old' servers to the RRs

Each server which is connected to the old big flat /12 network needs to peer with RR first, in order to be able to connect to the new L3-BGP-only-servers. When iBGP peering is established, route-reflector would advertise NLRIs to its client-peer without modifying attributes - the aim is to avoid routing loops. We have a smooth experience with a [BIRD routing daemon](https://bird.network.cz/) - configuration file is human-readable and can be easily automated using tools such as Puppet or Ansbile.

Let's consider 2 different servers: one host b101 (172.16.2.101) is connected to the 'old' network with BIRD while the second host b160 (172.16.2.160) is connected to the 'new' L3-BGP-network via Sonic NOS based SONIC LEAF#1 and LEAF#2 over FRR. Let's see how b101 sees b160


![image alt <>](/pics/spine_leaf_diagram.png)

<details>
<summary>
{% highlight text %}
# cat /etc/bird/bird.conf <--- click here to show more
{% endhighlight %}
</summary>
{% highlight text %}
# vim: set ft=bird nofoldenable:
#
#
#
# File managed by puppet            <----------------------------------------
#
#
#
#

router id  172.16.2.101;
log syslog all;

protocol kernel k4 {
  scan time 60;
  merge paths 32;
  ipv4 {
    import none;
    export filter {
      if source = RTS_BGP then accept;
      reject;
    };
  };
}

protocol device {
        scan time 60;
}

template bgp FRR {
  local as 65108;
  # Timers defaults Cumulus alike
  hold time 9;
  connect retry time 10;
  error wait time 2, 16;
  error forget time 16;
  enable route refresh on;
  long lived stale time 10;
  direct;
  ipv4 {
    add paths on;
    import keep filtered on;
    import filter {
        if net ~ [ 172.18.0.0/15+ , 172.16.64.0/24+ , 172.16.65.0/24+ , 172.16.0.0/12{32,32} ] then {
          bgp_community.delete([(*,*)]);
          accept;
        }
       reject;
    };
    export none;
  };
}


# frr1.ams.creativecdn.net
protocol bgp frr1 from FRR { neighbor 172.16.63.1 as 65108; }
# frr2.ams.creativecdn.net
protocol bgp frr2 from FRR { neighbor 172.16.63.2 as 65108; }
{% endhighlight %}
</details>

<details>
<summary>
{% highlight text %}
# (ams)root@b101:~# birdc show protocol <--- click here to show more
{% endhighlight %}
</summary>
{% highlight text %}
BIRD 2.0.7 ready.
Name       Proto      Table      State  Since         Info
k4         Kernel     master4    up     2021-09-12    
device1    Device     ---        up     2021-09-12    
frr1       BGP        ---        up     2021-09-12    Established   
frr2       BGP        ---        up     2021-09-12    Established   
{% endhighlight %}
</details>

As you can see each 'old' server has a 2 iBGP sessions and it's receiving over 722 NLRIs(prefixes+attributes):


<details>
<summary>
{% highlight text %}
# b101# birdc show route count <--- click here to show more
{% endhighlight %}
</summary>
{% highlight text %}
BIRD 2.0.7 ready.
722 of 722 routes for 165 networks in table master4
0 of 0 routes for 0 networks in table master6
Total: 722 of 722 routes for 165 networks in 2 tables
{% endhighlight %}
</details>

These 722 prefixes include predominantely /32 IPv4 routes - for each 'new' L3-BGP-based-server is annoucing exactly 1x IPv4 addr towards RRs.

BGP-table (also known as BGP topology table, BGP RIB) on 'old' servers is looking like this:

<details>
<summary>
{% highlight text %}
# b101:~# birdc show route all for 172.16.2.160 <--- click here to show more
{% endhighlight %}
</summary>
{% highlight text %}
BIRD 2.0.7 ready.
Table master4:
172.16.2.160/32      unicast [frr1 20:14:51.824 from 172.16.63.1] * (100) [?]
	via 172.17.1.28 on bond0
	Type: BGP univ
	BGP.origin: Incomplete
	BGP.as_path: 
	BGP.next_hop: 172.17.1.28
	BGP.med: 0
	BGP.local_pref: 100
	BGP.community: 
	BGP.originator_id: 172.16.2.160
	BGP.cluster_list: 172.16.63.0 172.17.1.28
                     unicast [frr1 11:32:06.091 from 172.16.63.1] (100) [?]
	via 172.17.0.28 on bond0
	Type: BGP univ
	BGP.origin: Incomplete
	BGP.as_path: 
	BGP.next_hop: 172.17.0.28
	BGP.med: 0
	BGP.local_pref: 100
	BGP.community: 
	BGP.originator_id: 172.16.2.160
	BGP.cluster_list: 172.16.63.0 172.17.0.28
                     unicast [frr2 11:32:06.085 from 172.16.63.2] (100) [?]
	via 172.17.0.28 on bond0
	Type: BGP univ
	BGP.origin: Incomplete
	BGP.as_path: 
	BGP.next_hop: 172.17.0.28
	BGP.med: 0
	BGP.local_pref: 100
	BGP.community: 
	BGP.originator_id: 172.16.2.160
	BGP.cluster_list: 172.16.63.0 172.17.0.28
                     unicast [frr2 20:14:51.823 from 172.16.63.2] (100) [?]
	via 172.17.1.28 on bond0
	Type: BGP univ
	BGP.origin: Incomplete
	BGP.as_path: 
	BGP.next_hop: 172.17.1.28
	BGP.med: 0
	BGP.local_pref: 100
	BGP.community: 
	BGP.originator_id: 172.16.2.160
	BGP.cluster_list: 172.16.63.0 172.17.1.28
{% endhighlight %}
</details>

FIB-table(Forwarding Information Base) on the 'old' servers is looking like this:


<details>
<summary>
{% highlight text %}
#b101:~# ip route show 172.16.2.160 <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
172.16.2.160 proto bird metric 32 
	nexthop via 172.17.0.28 dev bond0 weight 1 
	nexthop via 172.17.1.28 dev bond0 weight 1 
{% endhighlight %}
</details>

next-hop 172.17.0.28 address is de-facto a Vlan2-interface configured on SONIC-based LEAF#1 while
next-hop 172.17.1.28 address is de-facto a Vlan2-interface configured on SONIC-based LEAF#2

<details>
<summary>
{% highlight text %}
#b101:~# mtr -rwnc 10 172.16.2.160 <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
HOST: b101.creativecdn.net Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 172.17.1.28           0.0%    10    0.3   0.3   0.3   0.5   0.1
  2.|-- 172.16.2.160          0.0%    10    0.1   0.1   0.1   0.4   0.1
{% endhighlight %}
</details>

As you can see network path from b101 (server) to b160 (server) and the other way goes via Sonic leaf:

<details>
<summary>
{% highlight text %}
#b160:~#  mtr -rwnc 10 b101
{% endhighlight %}
</summary>
{% highlight text %}
HOST: b160.creativecdn.net Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 172.17.1.28           0.0%    10    0.2   0.2   0.2   0.3   0.0
  2.|-- 172.16.2.101          0.0%    10    0.1   0.1   0.1   0.1   0.0
{% endhighlight %}
</details>  



## Connecting 'new' L3-BGP-switches to the RRs


SONIC-enabled LEAFs(LESWs) are configured as follows:

each odd-numbered leaf switch is connected directly via LACP portchannel to the odd-numbered spine switch e.g. LESW#1 to SPSW#1 and LESW#2 to SPSW#2 using multiple 100G interfaces, then vlan interface is assigned to the PortChannel0001 interface:


<details>
<summary>
{% highlight text %}
#LESW1# show vlan brief <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
+-----------+-----------------+-----------------+----------------+-----------------------+
|   VLAN ID | IP Address      | Ports           | Port Tagging   | DHCP Helper Address   |
+===========+=================+=================+================+=======================+
|         2 | 172.17.0.28/12  | PortChannel0001 | tagged         |                       |
+-----------+-----------------+-----------------+----------------+-----------------------+
{% endhighlight %}
</details>


<details>
<summary>
{% highlight text %}
#LESW# SONIC config <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
###
## Uplink towards SPINE
###
config portchannel add PortChannel0001


# everyport towards SPINE-LACP
for E in ${SPINE1x100[@]}
do 
  config portchannel member add PortChannel0001 Ethernet${E} # fec done in base config
done

###
## Vrf2  - prod_vlan_2
###
config vrf add Vrf2
config vlan add 2
config interface vrf bind Vlan2 Vrf2
config interface ip add Vlan2 ${IP[Vlan2]}


# RTB House tiny hack for arp refreshing is needed on production vlan
sysctl -w net.ipv4.conf.Vlan2.arp_accept=1
#
config vlan member add 2 PortChannel0001
{% endhighlight %}
</details>

On the other side(SPSW) of PortChannel we are extracting VXLAN to VLAN(Cumulus-Linux-NOS config):

```
auto lesw1
iface lesw1
	bond-slaves swp26 swp28
	bond-use-carrier 1
	bond-lacp-rate 1
	bond-lacp-bypass-allow 0
	mstpctl-portadminedge yes
	mstpctl-portbpdufilter yes
	bridge-pvid 1000
	bridge-vids 2 110 128
```

You can see vlans configured on lesw1 below:

```
root@spsw1:mgmt-vrf:~# netshow vlan
VLAN    Flags     Interfaces
------  --------  ------------
2       Tagged    lesw1
        SVI       vlan2
        Untagged  vni-2
110     Tagged    lesw1
        SVI       vlan110
        Untagged  vni-110
128     Tagged    lesw1
        SVI       vlan128
        Untagged  vni-128
1000    Untagged  lesw1
```

As you can see this is **demarcation point** between old flat L2 EVPN-based network and the new L3-BGP-only based hosts.

The amount of traffic is constatly growing and our setup allows scaling-up: we have interconnection consisting of 16x100Gbit/s ports coupled between each Spine and Leaf pair giving 3.2Tbit/s total BW - but please be aware that we can scale up as we grow!
Now our biggest bandwidth-consuming DB cluster is using around 600Gbit/s at its peak and still growing! Each server of this cluster is serving flawlessly over 70Gbit/s TCP traffic!

![image alt <>](/pics/grafana_db_cluster_bandwidth.png)

```
show int portchannel 
Flags: A - active, I - inactive, Up - up, Dw - Down, N/A - not available,
       S - selected, D - deselected, * - not synced
  No.  Team Dev         Protocol     Ports
-----  ---------------  -----------  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 0001  PortChannel0001  LACP(A)(Up)  Ethernet172(S) Ethernet180(S) Ethernet188(S) Ethernet200(S) Ethernet152(S) Ethernet148(S) Ethernet164(S) Ethernet144(S) Ethernet184(S) Ethernet160(S) Ethernet176(S) Ethernet156(S) Ethernet192(S) Ethernet196(S) Ethernet168(S) Ethernet204(S)
```


![image alt <>](/pics/spine_leaf_bandwidth.png)

We are connecting spine and leaf with multiple 100G ports - currently each leaf is connected via 16x100G ports but the sky is the limit and de-facto switchport numbers!
Interconnect can be done at any level: e.g. leaf to leaf, leaf to spine and leaf to super-spine - possible point of connection: anywhere(L2/L3 boundary).
No bottle-neck due to CLOS spine-leaf architecture - A CLOS/Spine-Leaf or "fat tree" architecture features multiple connections between interconnection switches (spine switches) and access switches (leaf switches) to support high-performance computer clustering. In addition to flattening and scaling out Layer 2 networks at the edge, it also creates a nonblocking, low-latency fabric.

## ECMP

Equal-cost multi-path routing (ECMP) is a routing feature where instead of traditional one next-hop exists per prefix there are multiple next-hops in use at the same time.
Packet forwarding to a single destination takes place over multiple "best paths" in parralel simultaneously.
The ECMP leverages modified Dijkstra's algorithm to search for the shortest path, and uses the modulo-n hashing method in the selection of the delivery path. 
To prevent out of order packets, ECMP hashing is done on a per-flow basis, which means that all packets with the same source and destination IP addresses and the same source and destination ports always hash to the same next hop thus traffic will be uniformly spread across next-hops(load-balancing effect).
Hashing is computed with **5-tuple:**
1. src IP addr
2. dst IP addr
3. protocol
4. src port
5. dst port

You can read more about hashing in excellent Broadcom document [here](https://docs.broadcom.com/doc/12358326)

Please note that BGP offers add-on called ADD-PATH described in [RFC 7911](https://datatracker.ietf.org/doc/html/rfc7911) which is confusing - there terms are two different things!
RTBHouse combines ADD-PATH and ECMP at the very same time - this two features help us leverage inter-DC network bottlenecks!

Below example output of one IP(/32 prefix) which is fully-reachable over 6x next-hops:

```
172.16.64.31 proto bgp metric 20 
	nexthop via 172.16.2.15 dev Vlan2 weight 1 
	nexthop via 172.16.48.151 dev Vlan2 weight 1 
	nexthop via 172.16.48.152 dev Vlan2 weight 1 
	nexthop via 172.16.48.153 dev Vlan2 weight 1 
	nexthop via 172.16.63.101 dev Vlan2 weight 1 
	nexthop via 172.16.63.102 dev Vlan2 weight 1 
```

<details>
<summary>
{% highlight text %}
BGP sessions status with Route-Reflectors  <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
# show ip bgp vrf Vrf2 summary
IPv4 Unicast Summary:
BGP router identifier 172.17.1.6, local AS number 65108 vrf-id 280
BGP table version 6432
RIB entries 491, using 88 KiB of memory
Peers 54, using 38 MiB of memory
Peer groups 2, using 128 bytes of memory

Neighbor                                                           V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
frr1.ams.creativecdn.net(172.16.63.1)                              4      65108   2619247   2613784        0    0    0 03w1d01h          462       52 frr1.ams.creativecdn
frr2.ams.creativecdn.net(172.16.63.2)                              4      65108    877102    872909        0    0    0 04w2d05h          462       52 frr2.ams.creativecdn
{% endhighlight %}
</details>

FRR conf snippet related to route reflectors connection through Spine portchannel

<details>
<summary>
{% highlight text %}
#LESW1# show run bgp <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
router bgp 65108 vrf Vrf2
 bgp router-id 172.17.1.6
 neighbor PG-VRF2-SPINE peer-group
 neighbor PG-VRF2-SPINE remote-as internal
 neighbor PG-VRF2-SPINE description Spine uplink
 neighbor PG-VRF2-SRV peer-group
 neighbor PG-VRF2-SRV remote-as internal
 neighbor PG-VRF2-SRV description Servers downlink
 neighbor PG-VRF2-SRV bfd
 neighbor PG-VRF2-SRV capability extended-nexthop
 neighbor 172.16.63.1 peer-group PG-VRF2-SPINE
 neighbor 172.16.63.1 description frr1.ams.creativecdn.net
 neighbor 172.16.63.2 peer-group PG-VRF2-SPINE
 neighbor 172.16.63.2 description frr2.ams.creativecdn.net
 bgp listen range fc00:0:302::/48 peer-group PG-VRF2-SRV
 !
 address-family ipv4 unicast
  network 172.16.0.0/12
  neighbor PG-VRF2-SPINE soft-reconfiguration inbound
  neighbor PG-VRF2-SPINE route-map RMP-VRF2-SPINE-IMPORT in
  neighbor PG-VRF2-SPINE route-map RMP-VRF2-SPINE-EXPORT out
  neighbor PG-VRF2-SRV route-reflector-client
  neighbor PG-VRF2-SRV soft-reconfiguration inbound
  neighbor PG-VRF2-SRV route-map RMP-VRF2-SRV-IMPORT in
  neighbor PG-VRF2-SRV route-map RMP-VRF2-SRV-EXPORT out
 exit-address-family
!
ip prefix-list default-only seq 10 permit 0.0.0.0/0
ip prefix-list default-only seq 1000 deny any
ip prefix-list PXL-VRF2-FROM-SRV seq 10 permit 172.16.0.0/12 ge 32
ip prefix-list PXL-VRF2-FROM-SRV seq 1000 deny any
ip prefix-list PXL-VRF2-TO-SRV seq 1000 deny any
!
route-map RMP-VRF2-SRV-EXPORT permit 10
 match ip address prefix-list default-only
!
route-map RMP-VRF2-SRV-EXPORT permit 20
 match ip address prefix-list PXL-VRF2-TO-SRV
!
route-map RMP-VRF2-SRV-EXPORT deny 1000
!
route-map RMP-VRF2-SRV-IMPORT permit 10
 match ip address prefix-list PXL-VRF2-FROM-SRV
 set tag 2
 set weight 10
!
route-map RMP-VRF2-SRV-IMPORT deny 1000
!
route-map RMP-VRF2-SPINE-EXPORT permit 10
 match tag 2
!
route-map RMP-VRF2-SPINE-EXPORT deny 1000
!
route-map RMP-VRF2-SPINE-IMPORT permit 10
 match ip address prefix-list default-only
!
route-map RMP-VRF2-SPINE-IMPORT permit 20
 match ip address prefix-list PXL-VRF2-FROM-SRV
!
route-map RMP-VRF2-SPINE-IMPORT deny 1000
!
ip nht resolve-via-default
!
line vty
!
end
{% endhighlight %}
</details>

BGP neighbour output with route-reflector looking from SONIC point-of-view:

<details>
<summary>
{% highlight text %}
#LESW# show ip bgp vrf Vrf2 neighbour 172.16.63.1 <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
lesw# show ip bgp vrf Vrf2 neighbors 172.16.63.1
BGP neighbor is 172.16.63.1, remote AS 65108, local AS 65108, internal link
 Description: frr1.ams.creativecdn.net
Hostname: frr1.ams.creativecdn.net
 Member of peer-group PG-VRF2-SPINE for session parameters
  BGP version 4, remote router ID 172.16.63.1, local router ID 172.17.1.6
  BGP state = Established, up for 03w1d01h
  Last read 00:00:00, Last write 00:00:00
  Hold time is 3, keepalive interval is 1 seconds
  Neighbor capabilities:
    4 Byte AS: advertised and received
    Extended Message: advertised and received
    AddPath:
      IPv4 Unicast: TX received
      IPv4 Unicast: RX advertised IPv4 Unicast and received
    Route refresh: advertised and received(old & new)
    Enhanced Route Refresh: advertised and received
    Address Family IPv4 Unicast: advertised and received
    Hostname Capability: advertised (name: lesw,domain name: n/a) received (name: frr1.ams.creativecdn.net,domain name: n/a)
    Graceful Restart Capability: advertised and received
      Remote Restart timer is 120 seconds
      Address families by peer:
        none
  Graceful restart information:
    End-of-RIB send: IPv4 Unicast
    End-of-RIB received: IPv4 Unicast
    Local GR Mode: Helper*
    Remote GR Mode: Helper
    R bit: True
    Timers:
      Configured Restart Time(sec): 120
      Received Restart Time(sec): 120
    IPv4 Unicast:
      F bit: False
      End-of-RIB sent: Yes
      End-of-RIB sent after update: No
      End-of-RIB received: Yes
      Timers:
        Configured Stale Path Time(sec): 360
  Message statistics:
    Inq depth is 0
    Outq depth is 0
                         Sent       Rcvd
    Opens:                  3          3
    Notifications:          2          2
    Updates:             2546       7152
    Keepalives:       2612464    2613325
    Route Refresh:          0          0
    Capability:             0          0
    Total:            2615015    2620482
  Minimum time between advertisement runs is 0 seconds

 For address family: IPv4 Unicast
  PG-VRF2-SPINE peer-group member
  Update group 3, subgroup 4
  Packet Queue length 0
  Inbound soft reconfiguration allowed
  Community attribute sent to this neighbor(all)
  Inbound path policy configured
  Outbound path policy configured
  Route map for incoming advertisements is *RMP-VRF2-SPINE-IMPORT
  Route map for outgoing advertisements is *RMP-VRF2-SPINE-EXPORT
  462 accepted prefixes

  Connections established 3; dropped 2
  Last reset 03w1d01h,   Notification received (Cease/Peer Unconfigured)
Local host: 172.17.1.6, Local port: 51770
Foreign host: 172.16.63.1, Foreign port: 179
Nexthop: 172.17.1.6
Nexthop global: fe80::923c:b3ff:fec5:8d86
Nexthop local: fe80::923c:b3ff:fec5:8d86
BGP connection: shared network
BGP Connect Retry Timer in Seconds: 10
Estimated round trip time: 1 ms
Read thread: on  Write thread: on  FD used: 30
{% endhighlight %}
</details>





![image alt <>](/pics/ecmp_example.png)

##  Arp-refresher

Due to the unremedied SONIC interal bug we've implemeted workaround bash script called arp-refresher.sh which is starting every 2 minutes in the background via crontab.
Stale arp is not refreshed by SONIC - it takes a hike from bridge(PortChannel) - then the servers in the 'old' network are having issues connecting to the L3-BGP-only servers


```
# root@lesw1:~# show arp | grep 172.16.21.116
# 172.16.21.116   0c:c4:7a:ea:7e:6e  -                2
# root@lesw1:~# show mac | grep -i 0c:c4:7a:ea:7e:6e
```

As you can see from the syslog arp-refresher is doing it's job properly:

<details>
<summary>
{% highlight text %}
#lesw1:~# tail -f /var/log/syslog | grep arp  <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
Sep 21 15:00:26.024863 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10437]: AGE(455):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.22.116
Sep 21 15:00:26.320165 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10447]: AGE(455):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.114
Sep 21 15:00:26.580798 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10464]: AGE(455):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.13.109
Sep 21 15:00:26.870488 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10474]: AGE(454):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.5.242
Sep 21 15:00:27.140680 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10484]: AGE(454):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.104
Sep 21 15:00:27.420111 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10494]: AGE(454):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.25.105
Sep 21 15:00:27.693202 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10504]: AGE(454):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.22.107
Sep 21 15:00:27.957776 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10519]: AGE(453):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.23.101
Sep 21 15:00:28.209820 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10529]: AGE(453):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.13.102
Sep 21 15:00:28.464393 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10539]: AGE(453):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.122
Sep 21 15:00:28.732956 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10551]: AGE(480):  ip vrf exec Vrf110 arping -c 1 -w 0.1  10.210.0.251
Sep 21 15:00:28.997703 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10562]: AGE(479):  ip vrf exec Vrf110 arping -c 1 -w 0.1  10.210.0.5
Sep 21 15:02:01.344746 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10642]: AGE(480):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.109
Sep 21 15:02:01.650942 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10672]: AGE(479):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.102
Sep 21 15:02:01.959022 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10712]: AGE(479):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.5.251
Sep 21 15:02:02.226764 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10722]: AGE(479):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.35.201
Sep 21 15:02:02.520645 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10737]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.110
Sep 21 15:02:02.882983 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10792]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.5.50
Sep 21 15:02:03.201797 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10828]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.111
Sep 21 15:02:03.725596 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[10963]: AGE(477):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.108
Sep 21 15:02:04.136743 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11028]: AGE(477):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.109
Sep 21 15:02:04.444629 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11048]: AGE(477):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.106
Sep 21 15:02:05.238103 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11306]: AGE(480):  ip vrf exec Vrf110 arping -c 1 -w 0.1  10.210.0.254
Sep 21 15:04:01.588402 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11415]: AGE(480):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.105
Sep 21 15:04:02.049809 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11516]: AGE(479):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.103
Sep 21 15:04:02.662044 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11701]: AGE(479):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.105
Sep 21 15:04:03.365211 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11942]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.5.124
Sep 21 15:04:03.666176 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[11972]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.108
Sep 21 15:06:01.227362 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[12345]: AGE(479):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.112
Sep 21 15:06:01.711875 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[12448]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.113
Sep 21 15:06:02.024526 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[12478]: AGE(478):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.21.107
Sep 21 15:06:02.352240 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[12533]: AGE(477):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.104
Sep 21 15:06:03.010047 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[12750]: AGE(477):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.107
Sep 21 15:06:03.522982 lesw1 NOTICE /opt/rtb-network-sonic/share/bin/arp_refresher.sh[12908]: AGE(476):  ip vrf exec Vrf2 arping -c 1 -w 0.1  172.16.34.101
{% endhighlight %}
</details>

You can see the source-code of arp-refresher below:

<details>
<summary>
{% highlight text %}
# cat opt/rtb-network-sonic/share/bin# cat arp_refresher.sh 
{% endhighlight %}
</summary>
{% highlight text %}
#!/bin/bash
# for every 'old' arp we refresh it with arping

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/bin/X11
exec &> >(while read line; do logger -t "$0"  -i -- "$line"; done)


for VRF in $(ip -br link show type vrf | cut -f 1 -d ' ' ) 
do

  ip -s -4 n show vrf "$VRF"  | grep -e STALE -e REACHABLE  | while read LINE 
  do
    # if several arp refreshes fail then arp should be removed,
    # without this ip is blocked and can not be moved to routing table
    if echo "$LINE" | grep -q -P 'STALE$'
    then
    	IP=$( echo "$LINE" | cut -f 1 -d ' ' )
    	DEV=$( echo "$LINE" | cut -f 3 -d ' ' )
        echo "STALE($IP): ip -4 neigh del $IP dev $DEV"
    	ip -4 neigh del "$IP" dev "$DEV" 
    	continue
    fi
      
    
    
    # https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/ip/ipneigh.c#n213
    # https://unix.stackexchange.com/questions/473919/what-is-the-fifth-coloum-in-the-output-of-ip-stat-neighbour-show-stand-for/474006
    
    AGE_MIN=$( echo "$LINE" |  perl -ne ' /used (\d+)\/(\d+)\/(\d+) probes/ ; 
    my $min=$1;
    if ($2 < $min ) { $min = $2 }
    # if ($3 < $min ) { $min = $3 }  # this number keeps STALE ( entry was last updated ) 
    print $min;' )
           
    # we set base_reachable_time_ms to 400000 while default equals 1800000 while cumulus-linux 1080000
    if  [[ $AGE_MIN -ge $(( 400000 / 1000 )) ]]
    then
       IP=$( echo "$LINE" | cut -f 1 -d ' ' )
       echo "AGE($AGE_MIN):  ip vrf exec $VRF arping -c 1 -w 0.1  $IP"
       ip vrf exec "$VRF" arping -q -c 1 -w 0.1 "$IP"
    fi
  done
done
{% endhighlight %}
</details>

This interconnection setup is working fine for over 2 months. We have critical services deployed on the servers that are prone to any distruption or latency-spikes in the network. After implementing arp-refresher SONIC image without any changes works well for the setup described above on Broadcom Tomahawk, Tomahawk II and Trident III ASICs.
