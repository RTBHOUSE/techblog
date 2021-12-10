---
layout: post
title:  "L2 to L3 Network Migration Concept"
date:   2021-11-25 18:17:33 +0000
author: Marek Grzybowski <marek.grzybowski@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle:    "Part 2 - connecting a server to a router (switch) in L3"
---

* This will become a table of contents (this text will be scrapped).
{:toc}


# Motivation (for server to switch connections design) 
 - L2 network is growing and soon it will reach its limits. We need to start adding new servers in "L3" mode to avoid broadcasts and long ARP tables, 
   but we would like to keep current features:
   - servers need to be connected in redundant manner (one server to at least two switches), and - if possible - we would like to speed up fallback time
   - we would like to keep clean network separation between bare-metal servers on network devices in L3, the same as we had using VLANs/VXLANs in L2
 - "Server IP address" in L3 network should work the same as server IP address in old L2 network: server IP addres as endpoint for the connections to the deployed app
 - we want to change switch's [NOS](https://en.wikipedia.org/wiki/Network_operating_system) to more open and commonly used one. We have chosen [SONiC](https://en.wikipedia.org/wiki/SONiC_(operating_system)). SONiC has less features than NOS that we are currently using. That is both advantage and disadvantage. Leass features means simpler configuration.

# Considerations
 
For typical server deployment, during the network configuration, there are two tasks:
 - assigning IP to server
 - adding default gateway

It could be done automatically via DHCP or statically via server network configuration.
The task is not easy when connecting multiple server interfaces to multiple routers (switches) in L3.
The configuration will usually require:
 - assigning IP(s) server "lo" interface
   - each physical host need its own IP address
   - some services (applications) need their own IP addresses because they use the same TCP listening ports as other services
   - we use anycast in some of the distributed services and we need to configure the same IP address on multiple physical servers
 - assigning an IP address for each server interface facing the router
 - assigning an IP address for each GW/Peer
 - routing daemon and routing configuration 
 

# Example scenario

![image alt <>](/pics/server-4xeth-to-2xsw-diagram.png)

Let's consider a scenario, where we have a server with four 25Gbps interfaces: eth0, eth1, eth2, eth3 and we are connecting
it to the data center network in a redundant manner via two network devices: SW1 and SW2. 
When everything is working, the server has a 100Gbps connection to the network. When one of the switches is down, we can use only half of that.


## L2/MLAG - typical traditional scenario and issues
In the typical/traditional approach the eth0, eth1, eth2 and eth3 interfaces on the server will be aggregated into
a single interface (usually [LACP](https://en.wikipedia.org/wiki/Link_aggregation) group) via [bonding or teaming](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/sec-comparison_of_network_teaming_to_bonding)
and SW1 and SW2 switches must be configured in the [MLAG](https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-42/Layer-2/Multi-Chassis-Link-Aggregation-MLAG/) cluster.

This kind of setup has some disadvantages:
  - LACP does not fully verify the link's state, so if for example RX link is blocked (single fiber cut in a dual fiber connection), the port will be up in the group in one direction and packets could be dropped on that link.
  - LACP link down detection is slow (only two modes to choose from, in fast mode LACPDU packet is sent every second, Link is down after 3 frames are lost).
  - MLAG cluster usually sacrifices few physical ports for peerlink between switches (depending on silicon chip).
  - When the LACP port group is configured, you need to connect servers to the exact same ports in the group.
  - From the switch MLAG cluster perspective, disaggregated LACP interfaces facing the server can not be configured as L3 (IP address can't be  assigned) and they need to be in the bridge (probably because MLAG+STP are closely connected in the implementation to avoid loops).

In this MLAG example scenario, network layer separation between servers could be achieved by adding MLAG interfaces to a separate VLANs.

# L3 Network layer ID/Separation

As mentioned in [Part1]({% post_url 2021-11-24-L2-EVPN-to-L3-concept-part1 %}) we intend to replace VLAN/VXLAN 
by VRF number as a network identifier, to implement network layer separations. 
Some of our servers may need to be in more than one network.
For example a front server needs to be connected to the DMZ VLAN/VRF (network) and to the backend VLAN/VRF (network).
In L3 we can create dedicated sub port for each Ethernet port on the switch device, then bind this sub port to the chosen VRF.
The following example shows production network ID "2" and ID "3" that will be available to the servers on "302" and "303" sub port interface:

![image alt <>](/pics/vrf-separation.png)

<details>
<summary>
{% highlight text %}
$ show vrf  Vrf2 # <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
VRF    Interfaces
-----  ---------------
Vrf2   Vlan2            # <- uplink, see part 3 of this blog series
       Ethernet16.302
       Ethernet8.302
       Ethernet17.302
       Ethernet26.302
       Ethernet32.302
       Ethernet25.302
       Ethernet40.302
       Ethernet11.302
       Ethernet132.302
       Ethernet10.302
       Ethernet84.302
       Ethernet3.302
       Ethernet56.302
       Ethernet100.302
       Ethernet59.302
       Ethernet0.302
       Ethernet140.302
       Ethernet41.302
       Ethernet43.302
       Ethernet9.302
       Ethernet19.302
       Ethernet92.302
       Ethernet48.302
       Ethernet112.302
       Ethernet33.302
       Ethernet136.302
       Ethernet64.302
       Ethernet57.302
       Ethernet34.302
       Ethernet80.302
       Ethernet75.302
       Ethernet73.302
       Ethernet120.302
       Ethernet51.302
       Ethernet104.302
       Ethernet116.302
       Ethernet74.302
       Ethernet1.302
       Ethernet96.302
       Ethernet27.302
       Ethernet18.302
       Ethernet50.302
       Ethernet66.302
       Ethernet67.302
       Ethernet65.302
       Ethernet108.302
       Ethernet2.302
       Ethernet35.302
       Ethernet88.302
       Ethernet124.302
       Ethernet58.302
       Ethernet72.302
       Ethernet24.302
       Ethernet128.302
       Ethernet42.302
       Ethernet49.302
{% endhighlight %}
</details>

Each production network will have a different unique pair of VRF and sub port number.

PXE/deploy network also has its own VRF, but since it requires native port, L3 interface needs to be terminated on Vlan,
for example:
```
$ show vrf Vrf110
VRF     Interfaces
------  ------------
Vrf110  Vlan210
        Vlan110     # <- uplink, see part 3 of this blog series
```

<details>
<summary>
{% highlight text %}
$ show vlan brief # <--- Click this to show more
{% endhighlight %}
</summary>
{% highlight text %}
+-----------+-----------------+-----------------+----------------+-----------------------+
|   VLAN ID | IP Address      | Ports           | Port Tagging   | DHCP Helper Address   |
+===========+=================+=================+================+=======================+
|         2 | 172.17.0.6/12   | PortChannel0001 | tagged         |                       |
+-----------+-----------------+-----------------+----------------+-----------------------+
|       110 | 10.210.0.106/24 | PortChannel0001 | tagged         |                       |
+-----------+-----------------+-----------------+----------------+-----------------------+
|       210 | 10.210.106.1/24 | Ethernet0       | untagged       | 10.210.0.5            |
|           |                 | Ethernet1       | untagged       |                       |
|           |                 | Ethernet2       | untagged       |                       |
|           |                 | Ethernet3       | untagged       |                       |
|           |                 | Ethernet8       | untagged       |                       |
|           |                 | Ethernet9       | untagged       |                       |
|           |                 | Ethernet10      | untagged       |                       |
|           |                 | Ethernet11      | untagged       |                       |
|           |                 | Ethernet16      | untagged       |                       |
|           |                 | Ethernet17      | untagged       |                       |
|           |                 | Ethernet18      | untagged       |                       |
|           |                 | Ethernet19      | untagged       |                       |
|           |                 | Ethernet24      | untagged       |                       |
|           |                 | Ethernet25      | untagged       |                       |
|           |                 | Ethernet26      | untagged       |                       |
|           |                 | Ethernet27      | untagged       |                       |
|           |                 | Ethernet32      | untagged       |                       |
|           |                 | Ethernet33      | untagged       |                       |
|           |                 | Ethernet34      | untagged       |                       |
|           |                 | Ethernet35      | untagged       |                       |
|           |                 | Ethernet40      | untagged       |                       |
|           |                 | Ethernet41      | untagged       |                       |
|           |                 | Ethernet42      | untagged       |                       |
|           |                 | Ethernet43      | untagged       |                       |
|           |                 | Ethernet48      | untagged       |                       |
|           |                 | Ethernet49      | untagged       |                       |
|           |                 | Ethernet50      | untagged       |                       |
|           |                 | Ethernet51      | untagged       |                       |
|           |                 | Ethernet56      | untagged       |                       |
|           |                 | Ethernet57      | untagged       |                       |
|           |                 | Ethernet58      | untagged       |                       |
|           |                 | Ethernet59      | untagged       |                       |
|           |                 | Ethernet64      | untagged       |                       |
|           |                 | Ethernet65      | untagged       |                       |
|           |                 | Ethernet66      | untagged       |                       |
|           |                 | Ethernet67      | untagged       |                       |
|           |                 | Ethernet72      | untagged       |                       |
|           |                 | Ethernet73      | untagged       |                       |
|           |                 | Ethernet74      | untagged       |                       |
|           |                 | Ethernet75      | untagged       |                       |
|           |                 | Ethernet80      | untagged       |                       |
|           |                 | Ethernet84      | untagged       |                       |
|           |                 | Ethernet88      | untagged       |                       |
|           |                 | Ethernet92      | untagged       |                       |
|           |                 | Ethernet96      | untagged       |                       |
|           |                 | Ethernet100     | untagged       |                       |
|           |                 | Ethernet104     | untagged       |                       |
|           |                 | Ethernet108     | untagged       |                       |
|           |                 | Ethernet112     | untagged       |                       |
|           |                 | Ethernet116     | untagged       |                       |
|           |                 | Ethernet120     | untagged       |                       |
|           |                 | Ethernet124     | untagged       |                       |
|           |                 | Ethernet128     | untagged       |                       |
|           |                 | Ethernet132     | untagged       |                       |
|           |                 | Ethernet136     | untagged       |                       |
|           |                 | Ethernet140     | untagged       |                       |
+-----------+-----------------+-----------------+----------------+-----------------------+
{% endhighlight %}
</details>


### SONiC Gotchas

  - In above setup we discovered that SONiC sometimes does not send "ARP who has" to default GW in PXE/deploy network. 
    It could be caused by [keepalived](https://keepalived.readthedocs.io/en/latest/introduction.html) that we have configured on the default GW 
    (keepalived is configured to periodically send [GARP](https://www.practicalnetworking.net/series/arp/gratuitous-arp/) packets)
    or due to long inactivity (server's untagged interface is used only for deployment and for rootfs decryption during boot). 
    This issue can be mitigated by setting: ``` sysctl -w net.ipv4.conf.Vlan110.arp_accept=1 ``` on SONiC interface.
  - Configuration order seems to matter. So far we deployed "sub ports + untagged VLAN to the server" concept
    on Broadcom Tomahawk, Tomahawk 2 and Trident 3 based devices. Everything seems to work fine as long as untagged VLAN is configured last.
    For each setup change, we clear device configuration by ```config realod```, then we apply subport and vlan configuration
    in the right order. SONiC becomes more stable by each release, this issue may be already solved.

  


# BGP Unnumbered like  - SONIC configuration

BGP Unnumbered is a method to connect two (theoretically more is possible, but we did not find any implementation that supports it)
BGP peers without the need to specify peer's IP address. Part of it is based on [rfc5549](https://datatracker.ietf.org/doc/html/rfc5549) 
and the rest is vendor specific.
(Despite that the term "BGP Unnumbered" is widely used in the network industry,
it has no RFC or standard, and some vendors may understand it differently.)

The idea behind BGP Unnumbered is to leverage IPv6 standard features to find a peer and establish BGP session:
  - Link local IPv6 address creation on each interface, allows to automatically assign IP for both sides.
  - Router Advertisements ICMPv6 packets allow to inform the other side what IP is assigned to the router 
    and what IPv6 pool is available to the peers.

Routing demon then can discover peer IPV6 adddress on interface and using local IPV6 starts BGP session.
Then rfc5549 is implemented to advertise IPv4 Network Layer Reachability Information (NLRI) via this IPv6 BGP session between discovered peers.

IPv4 NLRI from the IPv6 peer needs a gateway. Since peer is IPv6, it could not be assigned as a gateway for IPv4, especially 
when switch silicon is not designed to handle that scenario.
For example Cumulus Linux started implementing this by tricking the routing table to send packets through the correct interface: 
```
# ip r
10.10.0.7  proto bgp  metric 20 
	nexthop via 169.254.0.1  dev swp5 weight 1 onlink
	nexthop via 169.254.0.1  dev swp30 weight 1 onlink
	nexthop via 169.254.0.1  dev swp29 weight 1 onlink
	nexthop via 169.254.0.1  dev swp6 weight 1 onlink
	nexthop via 169.254.0.1  dev swp8 weight 1 onlink
	nexthop via 169.254.0.1  dev swp7 weight 1 onlink
10.10.0.8  proto bgp  metric 20 
	nexthop via 169.254.0.1  dev swp5 weight 1 onlink
	nexthop via 169.254.0.1  dev swp30 weight 1 onlink
	nexthop via 169.254.0.1  dev swp29 weight 1 onlink
	nexthop via 169.254.0.1  dev swp6 weight 1 onlink
	nexthop via 169.254.0.1  dev swp8 weight 1 onlink
	nexthop via 169.254.0.1  dev swp7 weight 1 onlink
10.10.0.9  proto bgp  metric 20 
	nexthop via 169.254.0.1  dev swp5 weight 1 onlink
	nexthop via 169.254.0.1  dev swp30 weight 1 onlink
	nexthop via 169.254.0.1  dev swp29 weight 1 onlink
	nexthop via 169.254.0.1  dev swp6 weight 1 onlink
	nexthop via 169.254.0.1  dev swp8 weight 1 onlink
	nexthop via 169.254.0.1  dev swp7 weight 1 onlink
...
```
and forcing right destination MAC address by placing it in neighbor table:
```
root@spsw1401:mgmt-vrf:~# ip n show | grep 169.254.0.1
169.254.0.1 dev swp4 lladdr 00:25:90:b2:a9:b0 PERMANENT
169.254.0.1 dev swp9 lladdr 00:25:90:b2:8f:7d PERMANENT
169.254.0.1 dev swp6 lladdr 00:25:90:b3:77:42 PERMANENT
169.254.0.1 dev swp24 lladdr 00:25:90:b2:82:d2 PERMANENT
169.254.0.1 dev swp21 lladdr 00:25:90:b2:ab:39 PERMANENT
169.254.0.1 dev swp10 lladdr 00:25:90:b2:8f:75 PERMANENT
169.254.0.1 dev swp3 lladdr 00:25:90:b2:a9:a8 PERMANENT
169.254.0.1 dev swp7 lladdr 00:25:90:b3:7d:e1 PERMANENT
169.254.0.1 dev swp20 lladdr 00:25:90:b2:97:28 PERMANENT
169.254.0.1 dev swp1 lladdr 00:25:90:b2:81:cc PERMANENT
169.254.0.1 dev swp8 lladdr 00:25:90:b3:7d:e9 PERMANENT
169.254.0.1 dev swp15 lladdr 00:25:90:b2:f1:91 PERMANENT
169.254.0.1 dev swp16 lladdr 00:25:90:b2:f1:89 PERMANENT
169.254.0.1 dev swp13 lladdr 00:25:90:b2:f1:da PERMANENT
169.254.0.1 dev swp11 lladdr 00:25:90:b2:ee:6e PERMANENT
...
```


Implementation with fixed "169.254.0.1" as a fake gateway is limiting BGP Unnumbered to only single peer (!) per interface.
(because even link local IP address must be unique per interface/network) 

On recent Linux kernels and latest FRR implementations, protocols were mixed by kernel developers (LoL):

```
$ ip r show
default nhid 2044 proto bgp metric 20 
	nexthop via inet6 fe80::ae1f:6bff:fed5:9a04 dev eth0 weight 1 
```
So forcing right destination MAC for 169.254.0.1 in neighbor table seems to be no longer required.


[SONIC is forcing use of IPv6 global addresses on interfaces to establish IPv6 BGP session](https://github.com/Azure/sonic-frr/issues/16#issuecomment-520587718).
Additionally, [router advertiser](https://en.wikipedia.org/wiki/Neighbor_Discovery_Protocol) (RA) could be sent only from link local IPv6 that was mapped to switch ASIC.
Due to these limitations, it seems to be impossible to use BGP Unnumbered directly on sub port (at least we were unable to do so). We needed a workaround
We figured out that it is necessary to manually set both IPv6 Global and IPv6 link local addresses on each interface 
to allow SONIC to send RA and allow BGP session to establish over Global IPv6.

### IPv6 address magic formula
IPv6 address formula for "fake BGP Unnumbered" interfaces was created to make assigning IPv6 addresses more manageable:

```
    ipv6="fc00:0000:${SUB_PORT_VLAN_NUMBER}:$(( ${ETH_NUMBER} + 1000 * ${SW_NUMBER} ))::1/64"
    llipv6="fe80:0000:${SUB_PORT_VLAN_NUMBER}:$(( ${ETH_NUMBER} + 1000 * ${SW_NUMBER} ))::1/64" 
```
  - SUB_PORT_VLAN_NUMBER: VLAN number that was assigned for the sub port interface, there is one number per VRF needed
  - ETH_NUMBER: number of Ethernet interface, each IP address, even link local need to be unique, so it could be applied to the switch ASIC 
  - SW_NUMBER: TOR switch number. (It could be beneficial to have more than two TOR switches, for N+1 redundancy)
  - fc00::/7 - [Unique local addresses](https://en.wikipedia.org/wiki/Unique_local_address)

Each interface has IPv6 addresses assigned by those SONIC CLI commands:

```
VRF=2
SUB_PORT_VLAN_NUMBER=$((300+$VRF)) # warning, interface name length is limited to 15 chars so SUB_PORT_VLAN_NUMBER should be short.

for E in ${SRV_PORTS[@]}
do

  ipv6="fc00:0000:${SUB_PORT_VLAN_NUMBER}:$(( ${ETH_NUMBER} + 1000 * ${SW_NUMBER} ))::1/64"
  llipv6="fe80:0000:${SUB_PORT_VLAN_NUMBER}:$(( ${ETH_NUMBER} + 1000 * ${SW_NUMBER} ))::1/64" 

  config interface ip add  Ethernet${E}.${SUB_PORT_VLAN_NUMBER} $ipv6 # subinterface creation
  config interface vrf bind  Ethernet${E}.${SUB_PORT_VLAN_NUMBER}  Vrf${EV} # VRF bind will clear subinterface IP , we need to set ip again 
  config interface ip add  Ethernet${E}.${SUB_PORT_VLAN_NUMBER}  $llipv6
  config interface ip add  Ethernet${E}.${SUB_PORT_VLAN_NUMBER}  $ipv6

done

```

### FRR config
For each sub port interface we need to configure FRR/zebra to send RA packets according to the IPv6 magic formula:

```
interface Ethernet0.302 vrf Vrf2
 ipv6 nd prefix fc00:0:302:1000::/64
 ipv6 nd ra-interval 5
 no ipv6 nd suppress-ra
!
interface Ethernet1.302 vrf Vrf2
 ipv6 nd prefix fc00:0:302:1001::/64
 ipv6 nd ra-interval 5
 no ipv6 nd suppress-ra
!
interface Ethernet10.302 vrf Vrf2
 ipv6 nd prefix fc00:0:302:1010::/64
 ipv6 nd ra-interval 5
 no ipv6 nd suppress-ra
!
interface Ethernet100.302 vrf Vrf2
 ipv6 nd prefix fc00:0:302:1100::/64
 ipv6 nd ra-interval 5
 no ipv6 nd suppress-ra
!
interface Ethernet104.302 vrf Vrf2
 ipv6 nd prefix fc00:0:302:1104::/64
 ipv6 nd ra-interval 5
 no ipv6 nd suppress-ra
!  ...
```

  - **ipv6 nd prefix fc00:0:302:1100::/64** : is advertising fc00:0:302:1100::/64 network for the clients to use.
     fc00:0:302:1100::1/64 will be on sub port interface according to magic formula that was mentioned above.
     Any other address in this network could be taken by the connected server.
  - **ipv6 nd ra-interval 5** :  increase rate for sending RA
  - **no ipv6 nd suppress-ra** : enabling [zebra](https://docs.frrouting.org/en/latest/zebra.html) to send RA ICMPv6 frames on the interface


For each VRF router we configure server group and **listen range** to allow any server that has acquired 
IPv6 from RA to establish BGP session on **any interface**:

```
router bgp 65108
!
router bgp 65108 vrf Vrf2
 bgp router-id 172.17.0.6
 bgp default show-hostname
 bgp cluster-id 172.17.0.6
 neighbor BGP-SERVERS peer-group
 neighbor BGP-SERVERS remote-as internal
 neighbor BGP-SERVERS description session to each host
 neighbor BGP-SERVERS bfd
 neighbor BGP-SERVERS capability extended-nexthop
 bgp listen range fc00:0:302::/48 peer-group BGP-SERVERS
 !
 address-family ipv4 unicast
  network 172.16.0.0/12
  neighbor BGP-SERVERS route-reflector-client
  neighbor BGP-SERVERS soft-reconfiguration inbound
  neighbor BGP-SERVERS prefix-list from-servers-prefixes in
  neighbor BGP-SERVERS prefix-list to-servers-prefixes out
 exit-address-family
!
ip prefix-list from-servers-prefixes seq 20 permit 172.16.0.0/12 ge 32
ip prefix-list from-servers-prefixes seq 500 deny any
ip prefix-list to-servers-prefixes seq 10 permit 0.0.0.0/0
ip prefix-list to-servers-prefixes seq 500 deny any
```


### BGP summary
After establishing sessions, diagnosing/inspecting/finding interfaces is pretty straight forward:

<details>
<summary>
{% highlight text %}
show ip bgp vrf Vrf2 summary # <---- Click this to show the rest of content 
{% endhighlight %}
</summary>
{% highlight text %}
IPv4 Unicast Summary:
BGP router identifier 172.17.0.6, local AS number 65108 vrf-id 645
BGP table version 11782
RIB entries 331, using 59 KiB of memory
Peers 55, using 1124 KiB of memory
Peer groups 2, using 128 bytes of memory

Neighbor                                                   V         AS MsgRcvd MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd
rr1.creativecdn.net(172.16.63.1)                           4      65108 3306615 3282928        0    0    0 05w2d23h          252
rr2.creativecdn.net(172.16.63.2)                           4      65108 3306276 3282928        0    0    0 05w2d23h          252
*b308.creativecdn.net(fc00:0:302:1000:bace:f6ff:fe86:1d5b) 4      65108 1220657 1220642        0    0    0 02w0d03h            1
*b309.creativecdn.net(fc00:0:302:1001:bace:f6ff:fe85:b41b) 4      65108 1220656 1220642        0    0    0 02w0d03h            1
*b313.creativecdn.net(fc00:0:302:1002:bace:f6ff:fe86:7753) 4      65108 1220656 1220640        0    0    0 02w0d03h            1
*b299.creativecdn.net(fc00:0:302:1008:bace:f6ff:fe85:e873) 4      65108 1220654 1220640        0    0    0 02w0d03h            1
*b300.creativecdn.net(fc00:0:302:1009:bace:f6ff:fe86:776b) 4      65108 1220653 1220639        0    0    0 02w0d03h            1
*b306.creativecdn.net(fc00:0:302:1010:bace:f6ff:fe86:774b) 4      65108 1220653 1220637        0    0    0 02w0d03h            1
*b307.creativecdn.net(fc00:0:302:1011:bace:f6ff:fe86:76f3) 4      65108 1220653 1220637        0    0    0 02w0d03h            1
*b294.creativecdn.net(fc00:0:302:1016:bace:f6ff:fe86:1ef3) 4      65108 1220651 1220635        0    0    0 02w0d03h            1
*b295.creativecdn.net(fc00:0:302:1017:bace:f6ff:fe86:7773) 4      65108 1220651 1220635        0    0    0 02w0d03h            1
*b297.creativecdn.net(fc00:0:302:1018:bace:f6ff:fe86:76fb) 4      65108 1220649 1220634        0    0    0 02w0d03h            1
*b298.creativecdn.net(fc00:0:302:1019:bace:f6ff:fe86:13bb) 4      65108 1220649 1220634        0    0    0 02w0d03h            1
*b286.creativecdn.net(fc00:0:302:1024:bace:f6ff:fe86:1703) 4      65108 1220647 1220632        0    0    0 02w0d03h            1
*b290.creativecdn.net(fc00:0:302:1025:bace:f6ff:fe85:b3ab) 4      65108 1220646 1220631        0    0    0 02w0d03h            1
*b291.creativecdn.net(fc00:0:302:1026:bace:f6ff:fe86:7763) 4      65108 1220644 1220630        0    0    0 02w0d03h            1
*b293.creativecdn.net(fc00:0:302:1027:bace:f6ff:fe86:7733) 4      65108 1220644 1220629        0    0    0 02w0d03h            1
*b273.creativecdn.net(fc00:0:302:1032:bace:f6ff:fe85:e4f3) 4      65108 1220644 1220628        0    0    0 02w0d03h            1
*b274.creativecdn.net(fc00:0:302:1033:bace:f6ff:fe86:3103) 4      65108 1220642 1220628        0    0    0 02w0d03h            1
*b275.creativecdn.net(fc00:0:302:1034:bace:f6ff:fe86:1d93) 4      65108 1220641 1220626        0    0    0 02w0d03h            1
*b260.creativecdn.net(fc00:0:302:1040:bace:f6ff:fe87:377b) 4      65108 1220640 1220625        0    0    0 02w0d03h            1
*b263.creativecdn.net(fc00:0:302:1041:bace:f6ff:fe86:7743) 4      65108 1220640 1220625        0    0    0 02w0d03h            1
*b264.creativecdn.net(fc00:0:302:1042:bace:f6ff:fe86:3113) 4      65108 1220639 1220625        0    0    0 02w0d03h            1
*b268.creativecdn.net(fc00:0:302:1043:bace:f6ff:fe86:1ebb) 4      65108 1220637 1220623        0    0    0 02w0d03h            1
*b250.creativecdn.net(fc00:0:302:1048:bace:f6ff:fe86:9353) 4      65108 1149739 1149721        0    0    0 01w6d07h            1
*b252.creativecdn.net(fc00:0:302:1049:bace:f6ff:fe86:1ce3) 4      65108 1220636 1220621        0    0    0 02w0d03h            1
*b256.creativecdn.net(fc00:0:302:1050:bace:f6ff:fe86:1db3) 4      65108 1220635 1220620        0    0    0 02w0d03h            1
*b243.creativecdn.net(fc00:0:302:1056:bace:f6ff:fe86:2fdb) 4      65108 1220634 1220619        0    0    0 02w0d03h            1
*b244.creativecdn.net(fc00:0:302:1057:bace:f6ff:fe86:2ffb) 4      65108 1220633 1220618        0    0    0 02w0d03h            1
*b245.creativecdn.net(fc00:0:302:1058:bace:f6ff:fe86:1dc3) 4      65108 1220633 1220617        0    0    0 02w0d03h            1
*b247.creativecdn.net(fc00:0:302:1059:bace:f6ff:fe86:263b) 4      65108 1220633 1220618        0    0    0 02w0d03h            1
*b237.creativecdn.net(fc00:0:302:1064:bace:f6ff:fe86:1d3b) 4      65108 1220630 1220615        0    0    0 02w0d03h            1
*b238.creativecdn.net(fc00:0:302:1065:bace:f6ff:fe86:1d73) 4      65108 1220632 1220616        0    0    0 02w0d03h            1
*b239.creativecdn.net(fc00:0:302:1066:bace:f6ff:fe86:1d83) 4      65108 1220629 1220614        0    0    0 02w0d03h            1
*b242.creativecdn.net(fc00:0:302:1067:bace:f6ff:fe86:1d7b) 4      65108 1220630 1220613        0    0    0 02w0d03h            1
*b233.creativecdn.net(fc00:0:302:1072:bace:f6ff:fe86:730b) 4      65108 1220627 1220612        0    0    0 02w0d03h            1
*b234.creativecdn.net(fc00:0:302:1073:bace:f6ff:fe86:7303) 4      65108 1220627 1220611        0    0    0 02w0d03h            1
*b235.creativecdn.net(fc00:0:302:1074:bace:f6ff:fe86:137b) 4      65108 1220626 1220610        0    0    0 02w0d03h            1
*b236.creativecdn.net(fc00:0:302:1075:bace:f6ff:fe86:1d1b) 4      65108 1220625 1220608        0    0    0 02w0d03h            1
*b276.creativecdn.net(fc00:0:302:1080:bace:f6ff:fe97:3f0e) 4      65108 1220623 1220608        0    0    0 02w0d03h            1
*b277.creativecdn.net(fc00:0:302:1084:bace:f6ff:fe9c:c9be) 4      65108 1220623 1220607        0    0    0 02w0d03h            1
*b278.creativecdn.net(fc00:0:302:1088:bace:f6ff:fe9c:c9ce) 4      65108 1220619 1220605        0    0    0 02w0d03h            1
*b279.creativecdn.net(fc00:0:302:1092:bace:f6ff:fe97:3f16) 4      65108 1220619 1220605        0    0    0 02w0d03h            1
*b281.creativecdn.net(fc00:0:302:1096:bace:f6ff:fe97:3f26) 4      65108 1220616 1220602        0    0    0 02w0d03h            1
*b282.creativecdn.net(fc00:0:302:1100:bace:f6ff:fe97:3efe) 4      65108 1220619 1220604        0    0    0 02w0d03h            1
*b283.creativecdn.net(fc00:0:302:1104:bace:f6ff:fe97:32e6) 4      65108 1220617 1220601        0    0    0 02w0d03h            1
*b285.creativecdn.net(fc00:0:302:1108:bace:f6ff:fe9c:c99e) 4      65108 1220617 1220601        0    0    0 02w0d03h            1
*b217.creativecdn.net(fc00:0:302:1112:bace:f6ff:fe97:3f1e) 4      65108 1220615 1220600        0    0    0 02w0d03h            1
*b218.creativecdn.net(fc00:0:302:1116:bace:f6ff:fe9c:c9d6) 4      65108 1220615 1220598        0    0    0 02w0d03h            1
*b222.creativecdn.net(fc00:0:302:1120:bace:f6ff:fe97:3f2e) 4      65108 1220613 1220598        0    0    0 02w0d03h            1
*b225.creativecdn.net(fc00:0:302:1124:bace:f6ff:fe97:3ef6) 4      65108 1220612 1220596        0    0    0 02w0d03h            1
*b229.creativecdn.net(fc00:0:302:1128:bace:f6ff:fe97:3f06) 4      65108 1220611 1220597        0    0    0 02w0d03h            1
*b230.creativecdn.net(fc00:0:302:1132:bace:f6ff:fe9c:c9de) 4      65108 1220610 1220596        0    0    0 02w0d03h            1
*b231.creativecdn.net(fc00:0:302:1136:bace:f6ff:fe60:c1a6) 4      65108 1220611 1220594        0    0    0 02w0d03h            1
*b232.creativecdn.net(fc00:0:302:1140:bace:f6ff:fe9c:c9a6) 4      65108 1220612 1220594        0    0    0 02w0d03h            1

Total number of neighbors 55
* - dynamic neighbor
53 dynamic neighbor(s), limit 100

{% endhighlight %}
</details>

# Server side configuration (Linux - Debian/Ubuntu) 

Goals:
  - identical config on any hardware
  - minimal network config requirements
     - hostname 
     - IPv4 address to advertise
     - sub port interface id/number to select the network VRF
  

In our opinion it is good practice to get rid of new kernel/systemd interface names, so interface names on each type of hardware is identical.
Usually it is done by adding kernel parameters:
```
net.ifnames=0 biosdevname=0
```

### /etc/network/interfaces

We accommodate config for servers that have up to eight network interfaces, any of the interfaces can be connected to the switch.
IPv4 server address is assigned to lo:101.
IPv6 addresses for BGP sessions etc. are assigned to 302 sub port on every physical interface by RA.
Below you can find example config:
 
<details>
<summary>
{% highlight bash %}
$ cat /etc/network/interfaces # <--- Click this to show content 
{% endhighlight %}
</summary>

{% highlight bash %}

# This file describes the network interfaces available on your system
# and how to activate them. For more information, see interfaces(5).

# The loopback network interface
auto  lo
iface lo inet loopback


auto  lo:101
iface lo:101 inet static
    address 172.16.2.200
    netmask 255.255.255.255



allow-hotplug eth0
iface  eth0  inet manual
allow-hotplug  eth0.302
iface eth0.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

allow-hotplug eth1
iface  eth1  inet manual
allow-hotplug  eth1.302
iface eth1.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra


allow-hotplug eth2
iface  eth2  inet manual
allow-hotplug  eth2.302
iface eth2.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

allow-hotplug eth3
iface  eth3  inet manual
allow-hotplug  eth3.302
iface eth3.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

allow-hotplug eth4
iface  eth4  inet manual
allow-hotplug  eth4.302
iface eth4.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

allow-hotplug eth5
iface  eth5  inet manual
allow-hotplug  eth5.302
iface eth5.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

allow-hotplug eth6
iface  eth6  inet manual
allow-hotplug  eth6.302
iface eth6.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

allow-hotplug eth7
iface  eth7  inet manual
allow-hotplug  eth7.302
iface eth7.302 inet manual
   # https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6
   up echo 0 > /proc/sys/net/ipv6/conf/$IFACE/use_tempaddr
   # 2 Overrule forwarding behaviour. Accept Router Advertisements even if forwarding is enabled.
   up echo 2 > /proc/sys/net/ipv6/conf/$IFACE/accept_ra

{% endhighlight %}

</details>

### LLDP BGP peer discovery replacement
It would be nice to have native [LLDP Peer Discovery](https://datatracker.ietf.org/doc/draft-acee-idr-lldp-peer-discovery/).
Unfortunately, this feature has not been implemented yet. We decided to write simple scripts based on **lldpd** linux package
to discover server peers. Here is a current PoC that we are working on.

  - service to monitor LLDP changes and write all detected BGP peers to /etc/rtbbgp/peers directory:

```
$ systemctl status lldp-peer-dicovery.service
● lldp-peer-dicovery.service - LLDP discovery bgp peers https://dokuwiki.rtbhouse.net/dokuwiki/doku.php?id=devel:admin:l3-sonic-migration-propsal&#peer_discovery
     Loaded: loaded (/etc/systemd/system/lldp-peer-dicovery.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2021-08-24 08:16:24 UTC; 2 weeks 6 days ago
   Main PID: 2990 (lldp_peer_dicov)
      Tasks: 4 (limit: 154285)
     Memory: 1.5M
     CGroup: /system.slice/lldp-peer-dicovery.service
             ├─2990 /bin/bash /opt/puppet-files/admin-tools/rtbbgp/bin/lldp_peer_dicovery.sh
             ├─2994 /bin/bash /opt/puppet-files/admin-tools/rtbbgp/bin/lldp_peer_dicovery.sh
             ├─2995 /bin/bash /opt/puppet-files/admin-tools/rtbbgp/bin/lldp_peer_dicovery.sh
             └─3061 lldpcli -f keyvalue watch

Warning: journal has been rotated since unit was started, output may be incomplete.
```

```
$ cat /etc/systemd/system/lldp-peer-dicovery.service
[Unit]
Description=LLDP discovery bgp peers https://dokuwiki.rtbhouse.net/dokuwiki/doku.php?id=devel:admin:l3-sonic-migration-propsal&#peer_discovery
After=lldpd.service
BindsTo=lldpd.service

[Service]
ExecStart=/opt/puppet-files/admin-tools/rtbbgp/bin/lldp_peer_dicovery.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

<details>
<summary>
{% highlight text %}
$ cat /opt/puppet-files/admin-tools/rtbbgp/bin/lldp_peer_dicovery.sh # <--- Click this to show content 
{% endhighlight %}
</summary>
{% highlight bash %}
#!/bin/bash

PEERDIR="/etc/rtbbgp/peers/"
mkdir -p $PEERDIR

( lldpcli -f keyvalue show neighbors ; lldpcli -f keyvalue watch ) | \
while read -r line
do
# lets find switch numbers, it is alweys first
if [[ "$line" =~ chassis.name=.*([0-9])$ ]]
then
  SWNR="${BASH_REMATCH[1]}"
fi

if [[ "$line" =~ port.descr=Ethernet([0-9]+)$ ]]
then
  PORTNR="${BASH_REMATCH[1]}"

  for VLAN in $( cat   /proc/net/vlan/config  |  cut -f 2 -d '|' | grep -o -P '\d+' | sort | uniq ) 
  do 
    peer_ipv6="fc00:0:${VLAN}:$(( ${PORTNR} + ( $SWNR * 1000 ) ))::1"
    echo "Found: SWNR=$SWNR PORTNR=$PORTNR peer_ipv6=$peer_ipv6"
    
    case $VLAN in
      302) AS=65108 ;;
      428) AS=65200 ;;
      *) echo "Unknown peer AS. exiting ... " ;  exit 3 ;;
    esac
  
    if [[ ! -e "$PEERDIR"/"$peer_ipv6" ]]
    then
       echo "PEER.ASN=$AS" > "$PEERDIR"/"$peer_ipv6" 
    fi
  done
  
fi
done
{% endhighlight %}
</details>

### Server FRR - config generator 
Servers have simple FRR configuration generator script. Additional systemd service will generate and reload FRR config each time a new peer is added to /etc/rtbbgp/peers.
As long as switch has IPv6 configured on sub ports according to the magic formula, server connection can be physically moved (online) between ports or even devices.
(Nice fature to have, if remote hands are not careful in DC :) ):

```
$ systemctl status frr-reload.path
● frr-reload.path - Look for changes in dir and run service
     Loaded: loaded (/etc/systemd/system/frr-reload.path; enabled; vendor preset: enabled)
     Active: active (waiting) since Tue 2021-08-24 08:16:22 UTC; 2 weeks 6 days ago
   Triggers: ● frr-reload.service

Warning: journal has been rotated since unit was started, output may be incomplete.
$ systemctl status frr-reload.service
● frr-reload.service - Build config and reload frr service
     Loaded: loaded (/etc/systemd/system/frr-reload.service; enabled; vendor preset: enabled)
     Active: inactive (dead) since Tue 2021-08-24 08:16:25 UTC; 2 weeks 6 days ago
TriggeredBy: ● frr-reload.path
   Main PID: 2901 (code=exited, status=0/SUCCESS)
```

```
$ cat /etc/systemd/system/frr-reload.path
[Unit]
Description=Look for changes in dir and run service

[Path]
PathModified=/etc/rtbbgp/peers/

[Install]
WantedBy=multi-user.target
```

```
$ cat /etc/systemd/system/frr-reload.service
[Unit]
Description=Build config and reload frr service
After=frr.service
BindsTo=frr.service

[Service]
ExecStart=/opt/puppet-files/admin-tools/rtbbgp/bin/frr-reload.sh

[Install]
WantedBy=multi-user.target
```

<details>
<summary>
{% highlight text %}
$ cat /opt/puppet-files/admin-tools/rtbbgp/bin/frr-reload.sh # <---  Click this to show script content 
{% endhighlight %}
</summary>
{% highlight bash %}
#!/bin/bash

mkdir -p /etc/rtbbgp/frr/tmp

set -x 

/opt/puppet-files/admin-tools/rtbbgp/bin/frr_conf_to_stdout.sh > /etc/rtbbgp/frr/tmp/new.conf


/usr/lib/frr/frr-reload.py --test /etc/rtbbgp/frr/tmp/new.conf && \
/usr/lib/frr/frr-reload.py --reload --overwrite /etc/rtbbgp/frr/tmp/new.conf
```

```
$ cat /opt/puppet-files/admin-tools/rtbbgp/bin/frr_conf_to_stdout.sh
#!/bin/bash

echo "#####
##
## this file is autogenereated by $0
##
##### "

echo "

hostname $(hostname)

router bgp 65108
 bgp router-id $(ifdata  -pa 'lo:101')       `# lo:101 ro routerid`
 bgp default show-hostname
 bgp default show-nexthop-hostname
 bgp bestpath as-path multipath-relax
 bgp bestpath compare-routerid
 neighbor LESW peer-group
 neighbor LESW remote-as internal
 neighbor LESW description To sonic router
 neighbor LESW bfd profile fast
 neighbor LESW timers 1 3
 neighbor LESW timers connect 1
 neighbor LESW capability extended-nexthop
"

for F in /etc/rtbbgp/peers/*
do
  # we assume that asn is a 5 digit number 
  if grep -q  PEER.ASN=65108 "$F"
  then
    PEER=$(basename "$F")
    echo "neighbor $PEER peer-group LESW"
  fi
done


echo " 
 !
 address-family ipv4 unicast
  redistribute connected route-map EXPORTLO
  neighbor LESW soft-reconfiguration inbound
  maximum-paths 64
 exit-address-family
!
ip prefix-list from-lo-accepted seq 100 permit 0.0.0.0/0 ge 32
ip prefix-list from-lo-accepted seq 500 deny any
!
route-map EXPORTLO permit 1
 match interface lo
 match ip address prefix-list from-lo-accepted
!
route-map EXPORTLO deny 100
!
line vty
!
bfd
 profile fast
  transmit-interval 10
  receive-interval 10
  no shutdown
 !
!
end
"
{% endhighlight %}
</details>


FRR config highlights:
  - **route-map EXPORTLO**: will discover lo addresses and advertise them to the switches. You can add/remove lo addresses at the runtime and they will be discovered and advertised.
  - **multipath-relax**: Enables ECMP
 
### Final result on server side
Example server routing table (four interfaces connected):
```
# ip r
default nhid 4223 proto bgp metric 20 
	nexthop via inet6 fc00:0:302:2036::1 dev eth2.302 weight 1 
	nexthop via inet6 fc00:0:302:2040::1 dev eth0.302 weight 1 
	nexthop via inet6 fc00:0:302:1036::1 dev eth3.302 weight 1 
	nexthop via inet6 fc00:0:302:1040::1 dev eth1.302 weight 1 
169.254.111.0/24 dev docker0 proto kernel scope link src 169.254.111.1 linkdown 
```
<details>
<summary>
{% highlight text %}
$ ip a # <--- Click this to show content 
{% endhighlight %}
</summary>
{% highlight text %}
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet 172.16.2.109/32 brd 172.16.2.109 scope global lo:101
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:02 brd ff:ff:ff:ff:ff:ff
    altname enp65s0f0np0
    inet6 fe80::ae1f:6bff:fed5:9a02/64 scope link 
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:03 brd ff:ff:ff:ff:ff:ff
    altname enp65s0f1np1
    inet6 fe80::ae1f:6bff:fed5:9a03/64 scope link 
       valid_lft forever preferred_lft forever
4: eth2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:04 brd ff:ff:ff:ff:ff:ff
    altname enp66s0f0np0
    inet6 fe80::ae1f:6bff:fed5:9a04/64 scope link 
       valid_lft forever preferred_lft forever
5: eth3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:05 brd ff:ff:ff:ff:ff:ff
    altname enp66s0f1np1
    inet6 fe80::ae1f:6bff:fed5:9a05/64 scope link 
       valid_lft forever preferred_lft forever
6: eth3.302@eth3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:05 brd ff:ff:ff:ff:ff:ff
    inet6 fc00:0:302:1036:ae1f:6bff:fed5:9a05/64 scope global dynamic mngtmpaddr 
       valid_lft 2592000sec preferred_lft 604800sec
    inet6 fe80::ae1f:6bff:fed5:9a05/64 scope link 
       valid_lft forever preferred_lft forever
7: eth0.302@eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:02 brd ff:ff:ff:ff:ff:ff
    inet6 fc00:0:302:2040:ae1f:6bff:fed5:9a02/64 scope global dynamic mngtmpaddr 
       valid_lft 2591997sec preferred_lft 604797sec
    inet6 fe80::ae1f:6bff:fed5:9a02/64 scope link 
       valid_lft forever preferred_lft forever
8: eth1.302@eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:03 brd ff:ff:ff:ff:ff:ff
    inet6 fc00:0:302:1040:ae1f:6bff:fed5:9a03/64 scope global dynamic mngtmpaddr 
       valid_lft 2592000sec preferred_lft 604800sec
    inet6 fe80::ae1f:6bff:fed5:9a03/64 scope link 
       valid_lft forever preferred_lft forever
9: eth2.302@eth2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ac:1f:6b:d5:9a:04 brd ff:ff:ff:ff:ff:ff
    inet6 fc00:0:302:2036:ae1f:6bff:fed5:9a04/64 scope global dynamic mngtmpaddr 
       valid_lft 2591997sec preferred_lft 604797sec
    inet6 fe80::ae1f:6bff:fed5:9a04/64 scope link 
       valid_lft forever preferred_lft forever
10: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:fa:4f:52:34 brd ff:ff:ff:ff:ff:ff
    inet 169.254.111.1/24 brd 169.254.111.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:faff:fe4f:5234/64 scope link 
       valid_lft forever preferred_lft forever
{% endhighlight %}
</details>

<details>
<summary>
{% highlight text %}
$ ip n # <--- Click this to show content 
{% endhighlight %}
</summary>
{% highlight text %}
169.254.0.1 dev eth0.302 lladdr 02:00:00:00:00:01 PERMANENT proto zebra 
169.254.0.1 dev eth1.302 lladdr 02:00:00:00:00:01 PERMANENT proto zebra 
169.254.0.1 dev eth3.302 lladdr 02:00:00:00:00:01 PERMANENT proto zebra 
169.254.0.1 dev eth2.302 lladdr 02:00:00:00:00:01 PERMANENT proto zebra 
fe80:0:302:1036::1 dev eth3.302 lladdr 1c:ea:0b:e0:9f:01 router STALE
fe80:0:302:2040::1 dev eth0.302 lladdr 1c:ea:0b:e0:c3:01 router STALE
fe80::e42:a1ff:fef7:b5b6 dev eth3 lladdr 0c:42:a1:f7:b5:b6 router STALE
fc00:0:302:1040::1 dev eth1.302 lladdr 1c:ea:0b:e0:9f:01 router REACHABLE
fe80::1eea:bff:fee0:9f01 dev eth1.302 lladdr 1c:ea:0b:e0:9f:01 router STALE
fe80::1eea:bff:fee0:c301 dev eth2.302 lladdr 1c:ea:0b:e0:c3:01 router STALE
fe80::1eea:bff:fee0:9f01 dev eth3.302 lladdr 1c:ea:0b:e0:9f:01 router STALE
fe80:0:302:2036::1 dev eth2.302 lladdr 1c:ea:0b:e0:c3:01 router STALE
fe80::e42:a1ff:fef7:b5b6 dev eth1 lladdr 0c:42:a1:f7:b5:b6 router STALE
fe80::1eea:bff:fee0:c301 dev eth0.302 lladdr 1c:ea:0b:e0:c3:01 router STALE
fc00:0:302:2036::1 dev eth2.302 lladdr 1c:ea:0b:e0:c3:01 router REACHABLE
fc00:0:302:1036::1 dev eth3.302 lladdr 1c:ea:0b:e0:9f:01 router REACHABLE
fe80:0:302:1040::1 dev eth1.302 lladdr 1c:ea:0b:e0:9f:01 router STALE
fc00:0:302:2040::1 dev eth0.302 lladdr 1c:ea:0b:e0:c3:01 router REACHABLE
{% endhighlight %}
</details>


BGP sessions:

```
b109.creativecdn.net# show ip bgp summ

IPv4 Unicast Summary:
BGP router identifier 172.16.2.109, local AS number 65108 vrf-id 0
BGP table version 514
RIB entries 2, using 384 bytes of memory
Peers 4, using 85 KiB of memory
Peer groups 1, using 64 bytes of memory

Neighbor                                V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt
lesw2801(fc00:0:302:1036::1)            4      65108   4773515   4773501        0    0    0 07:32:56            1        1
lesw2801(fc00:0:302:1040::1)            4      65108   4773426   4773409        0    0    0 06:04:56            1        1
lesw2802.deploy.lan(fc00:0:302:2036::1) 4      65108   3973826   3973824        0    0    0 02w5d07h            1        1
lesw2802.deploy.lan(fc00:0:302:2040::1) 4      65108   3973791   3973786        0    0    0 02w5d07h            1        1

Total number of neighbors 4
```

```
b109.creativecdn.net# show  ip bgp ipv4 neighbors lesw2801 received-routes
BGP table version is 514, local router ID is 172.16.2.109, vrf id 0
Default local pref 100, local AS 65108
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete

   Network          Next Hop            Metric LocPrf Weight Path
*> 0.0.0.0/0        fc00:0:302:1036::1
                                             0    150      0 204995 i

Total number of prefixes 1
```

```
b109.creativecdn.net# show  ip bgp ipv4 neighbors lesw2801 advertised-routes
BGP table version is 514, local router ID is 172.16.2.109, vrf id 0
Default local pref 100, local AS 65108
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete

   Network          Next Hop            Metric LocPrf Weight Path
*> 172.16.2.109/32  0.0.0.0                  0    100  32768 ?

Total number of prefixes 1
```


### Nice unexpected features
 - Docker default network/NAT is working perfectly fine and does not require any additional changes on the system



Please continue to the next post, if you want to find more about how 
we connected those L3 SONIC switches to old EVPN/BGP network.

