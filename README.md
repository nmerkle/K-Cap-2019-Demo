# K-Cap-2019-Demo

## Preface
> This demo presents only an **excerpt** of the entire agent framework that has been implemented and discussed in the K-Cap 2019 paper. The idea of this demo is to show how the **[Miniwob++](https://github.com/stanfordnlp/miniwob-plusplus)** benchmark was utilized for evaluating different agents (e.g. trained DQNN agent, untrained DQNN agent, rule-based agent) regarding warm-start and adaptivity to new tasks. Therefore, we pre-trained by the simulation framework (see previous works **[[1]](http://few.vu.nl/~vbr240/semantics2018/Semantics_2018_paper_33.pdf)** and **[[2]](https://link.springer.com/chapter/10.1007/978-3-030-03667-6_16))** and a created **[JSON-LD task instance](https://raw.githubusercontent.com/nmerkle/K-Cap-2019-Demo/master/task.json)** representing the considered MiniWob web tasks, a **[DQNN](https://raw.githubusercontent.com/nmerkle/K-Cap-2019-Demo/master/MiniWobTask.json)** that is utilized by one of the agents (QLearnAgent). As we illustrate in the paper, the pre-trained agent outperforms the other agents regarding warm-start and success rate which is measured by the cumulative rewards. With this demo, we want to make our evaluation that we conducted for the K-Cap paper, reproducible for the reviewers of the K-Cap 2019 conference. 
The MiniWob web task is represented by a simplified Markov Decision Process (MDP) (see following image):

![alt text](https://github.com/nmerkle/K-Cap-2019-Demo/blob/master/MDP.png "Simplified MDP for the considered web tasks")

### Preparations
The demo is only implemented for and evaluated with <b>Chrome</b> web driver and was tested on a Windows OS. For other OSs (e.g. Linux, Mac, Unix) please consider and use the appropriate driver executables.

* Install **Nodejs** together with **NPM** on your host system (see https://nodejs.org/en/download/).
* Install the **Selenium Webdriver Exe** from https://www.npmjs.com/package/selenium-webdriver. 

### How-to-install and execute the K-Cap2019_Demo
* Clone this repo to your host system.

__Start MiniWob Server:__ 
* Unzip the **miniwob-plusplus zip** file in your cloned repo on your host system.
* Change  via command line into directory **miniwob-pluplus/html/** and execute there:
``` console
http-server
```
MiniWob++ starts and its web tasks are accessible via http://localhost:8080/miniwob/.

__Start Demo:__ 
* Go into the **K-Cap2019_Demo** directory and execute via command line: 
``` console
npm install
```
All required javascript libraries are installed automatically.

* Finally, execute:
``` console
npm start 
```
* **Congratulations!!!** You should see how your chrome web browser starts and runs with the appropriate task that is solved via one of the three agents. Every agent performs 10 x 1000 episodes in this run-through. So if you let run the demo it may take several days until all agents have finished the execution. 

![alt text](https://github.com/nmerkle/K-Cap2019_Demo/blob/master/screenshot.png "MiniWob++ Task execution")

