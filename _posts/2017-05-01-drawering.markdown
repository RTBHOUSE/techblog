---
layout: post
title:  "Improving the performance of neural networks in regression tasks using drawering"
date:   2017-05-01 14:05:00 +0200
author: Bartłomiej Romański <bartlomiej.romanski@rtbhouse.com>
image: "img/deeplearning-bg.jpg"

subtitle:    "See our recent work at IJCNN 2017 in Anchorage, Alaska, USA."
description: "See our recent work at IJCNN 2017 in Anchorage, Alaska, USA."
excerpt:     "See our recent work at IJCNN 2017 in Anchorage, Alaska, USA."
---

**drawering** – our newest idea for improving the performance of neural networks in regression tasks will be presented during <a href="http://www.ijcnn.org/">The 2017 International Joint Conference on Neural Networks</a> in in Anchorage, Alaska, USA.

In our case the improvement is very clear (see the accuracy-loss chart below), but we strongly believe the method should work well in most of the regression tasks. Let us know how this idea works on your model!

<img src="/pics/drawering-chart.png">

Here's the abstract:

> The method presented extends a given regression
> neural network to make its performance improve. The modifi-
> cation affects the learning procedure only, hence the extension
> may be easily omitted during evaluation without any change in
> prediction. It means that the modified model may be evaluated
> as quickly as the original one but tends to perform better.
>
> This improvement is possible because the modification gives
> better expressive power, provides better behaved gradients
> and works as a regularization. The knowledge gained by
> the temporarily extended neural network is contained in the
> parameters shared with the original neural network.
> 
> The only cost is an increase in learning time.

And here's the full <a href="https://arxiv.org/abs/1612.01589">paper</a>.

