# K-Cap-2019-Demo

## Preface
> This demo presents an **excerpt** of the entire agent framework that has been implemented and is discussed in the **[K-Cap 2019 paper](https://dl.acm.org/doi/10.1145/3360901.3364417)**. The idea of this demo is to show how the **[Miniwob++](https://github.com/stanfordnlp/miniwob-plusplus)** benchmark was utilized for evaluating different agents (e.g. trained DQNN agent, untrained DQNN agent, rule-based agent) regarding warm-start and adaptivity to new tasks. Therefore, we pre-trained by the __simulation framework__ (see previous works **[[1]](http://few.vu.nl/~vbr240/semantics2018/Semantics_2018_paper_33.pdf)** and **[[2]](https://link.springer.com/chapter/10.1007/978-3-030-03667-6_16))** a **[DQNN](https://raw.githubusercontent.com/nmerkle/K-Cap-2019-Demo/master/MiniWobTask.json)** that is utilized by one of the agents (QLearnAgent), and created a **[JSON-LD task instance](https://raw.githubusercontent.com/nmerkle/K-Cap-2019-Demo/master/task.json)** representing the considered MiniWob web tasks. As we illustrate in the paper, the pre-trained agent outperforms the other agents regarding warm-start and success rate which is measured by the number of collected positive rewards. With this demo, we want to make our evaluation that we conducted for the K-Cap paper, reproducible for the reviewers of the K-Cap 2019 conference. 

The MiniWob web task is represented by a simplified Markov Decision Process (MDP) (see following figure) that covers different web tasks (e.g. *click-button, click-button-sequence, choose-list, click-checkboxes-large, click-checkboxes-soft, click-checkboxes-transfer, click-checkboxes, book-flight, book-flight-nodelay*). For space reasons, we have left the flight booking tasks out of the MDP figure. The nodes of the MDP represent the states, while the arrows represent the actions that should be performed in the appropriate state. Every *state-action-state transition* has an assigned reward value *r*. The reward can range between the maximum reward of **+1** and the minimum negativ reward of **-1**. Regarding the transition probability, we assume that the execution of every action is equal likely so that the transition probability is computed by 1/#actions:

![alt text](https://github.com/nmerkle/K-Cap-2019-Demo/blob/master/MDP.png "Simplified MDP for the considered web tasks")

---

### Citation of the Demo and Paper
You can cite the K-Cap Demo or the corresponding paper by the following citation:
```
@inproceedings{DBLP:conf/kcap/MerkleP19,
  author    = {Nicole Merkle and
               Patrick Philipp},
  editor    = {Mayank Kejriwal and
               Pedro A. Szekely and
               Rapha{\"{e}}l Troncy},
  title     = {Cooperative Web Agents by Combining Semantic Technologies with Reinforcement
               Learning},
  booktitle = {Proceedings of the 10th International Conference on Knowledge Capture,
               {K-CAP} 2019, Marina Del Rey, CA, USA, November 19-21, 2019},
  pages     = {205--212},
  publisher = {{ACM}},
  year      = {2019},
  url       = {https://doi.org/10.1145/3360901.3364417},
  doi       = {10.1145/3360901.3364417},
  timestamp = {Sun, 25 Oct 2020 22:55:43 +0100},
  biburl    = {https://dblp.org/rec/conf/kcap/MerkleP19.bib},
  bibsource = {dblp computer science bibliography, https://dblp.org}
}
```

---

### Preparations
The demo is implemented for and evaluated with Selenium <b>Chrome</b> web driver and was tested on a Windows OS. For other OSs (e.g. Linux, Mac, Unix) please consider and use the appropriate **[Selenium web driver executables](https://www.npmjs.com/package/selenium-webdriver)**.

* Install **[Nodejs + NPM](https://nodejs.org/en/download/)** on your host system.
* Install the **Selenium Webdriver Exe** from https://www.npmjs.com/package/selenium-webdriver. 
* Clone the **[MiniWob++](https://github.com/stanfordnlp/miniwob-plusplus)** repo to your host system.
* Clone **this repo** to your host system.

---

### How-to-execute the K-Cap-2019-Demo

__Start MiniWob Server:__ 
* Change  via command line into the cloned directory **miniwob-plusplus/html/** and execute there:
``` console
http-server
```
MiniWob++ starts and its web tasks are accessible via http://localhost:8080/miniwob/.

---

__Configuration of the Demo (optional):__

It is not required to change the configuration of the demo. However, you have the possibility to specify the web tasks that shall be executed as well as different parameters for the DQNN learning algorithm. The **[.env](https://github.com/nmerkle/K-Cap-2019-Demo/blob/master/.env)** configuration file contains all configurable parameters as key-value pairs. The following parameters can be defined:
* TASK -- a comma seperated list of web task names. The listed tasks will be executed by the demo.
* LEARNING_RATE -- the learning rate of the DQNN algorithm.
* EPSILON -- Greedy value that specifies the likelihood of random actions (exploration steps).
* EPISODES -- The number of episodes that shall be performed for a single task.
* ITERATIONS -- The number of executions of a single task. For instance, per iteration the given number of episodes are performed. If we have 10 iterations, the mean cumulative rewards of these iterations are evaluated. 
* BROWSER -- Supported browser. In this demo the Chrome web driver has been utilized. However, it is also possible to execute other browsers (e.g. Mozilla Firefox, Opera, etc.) if the appropriate Selenium web driver is installed on the host system.

---

__Start Demo:__ 
* Go into the **K-Cap-2019-Demo** directory and execute via command line: 
``` console
npm install
```
All required javascript libraries are installed automatically.

* Finally, execute:
``` console
npm start 
```
* **Congratulations!!!** You should see how your chrome web browser starts and runs with the appropriate task that is solved via one of the three agents. Every agent performs for every task 10 x 1000 episodes in this run-through. So if you let run the demo it may take several days until all agents have finished the execution of all specified tasks. The outcome for every performed task and agent will be a CSV file containing the *episode number* and collected *mean reward value* for every episode.

![alt text](https://github.com/nmerkle/K-Cap2019_Demo/blob/master/screenshot.png "MiniWob++ Task execution")

