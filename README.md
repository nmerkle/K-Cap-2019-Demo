# K-Cap2019_Demo
### Preparations
* Install Nodejs together with NPM (see https://nodejs.org/en/download/).
* Install the **Selenium Webdriver Exe** from https://www.npmjs.com/package/selenium-webdriver.

### How-2-install and execute the K-Cap2019_Demo

__Start MiniWob Server:__ 
* Unzip the **miniwob-plusplus** zip file on your host system.
* Change into directory **miniwob-pluplus/html/** and execute there via command line:
``` console
http-server
```
MiniWob++ starts and is accessible via http://localhost:8080/miniwob/

__Start Demo:__ 
* Go into the **K-Cap2019_Demo** directory and execute via command line 
``` console
npm install
```
* Finally, execute:
``` console
node ./Evaluation.js 
```
* Congratulations!!! You should see how your chrome web browser is starting with the appropriate task that is trained via an agent.
![alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "MiniWob++ Task execution")

