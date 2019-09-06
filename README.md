# K-Cap2019_Demo

### Preparations
* Install **Nodejs** together with **NPM** on your host system (see https://nodejs.org/en/download/).
* Install the **Selenium Webdriver Exe** from https://www.npmjs.com/package/selenium-webdriver. 
<dl><p style="color:red">The demo is only implemented for and evaluated with <b>Chrome</b> web driver and was tested on a Windows OS. For other OSs (e.g. Linux, Mac, Unix) please consider and use the appropriate driver executables.</p></dl>

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

