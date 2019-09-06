# K-Cap2019_Demo

### Preparations
* Install Nodejs together with NPM (see https://nodejs.org/en/download/).
* Install the **Selenium Webdriver Exe** from https://www.npmjs.com/package/selenium-webdriver.

### How-2-install and execute the K-Cap2019_Demo
* Clone this repo to your host system.

__Start MiniWob Server:__ 
* Unzip the **miniwob-plusplus** zip file in your cloned repo on your host system.
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
* Congratulations!!! You should see how your chrome web browser is starting with the appropriate task that is trained via one of the three agents. Every agent performs ten times 1000 episodes in order to train a task. So if you let run the demo it may take several days until all agents are trained.
![alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "MiniWob++ Task execution")

