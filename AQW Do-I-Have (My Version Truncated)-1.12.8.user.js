// ==UserScript==
// @name        AQW Do-I-Have (My Version Truncated)
// @description Inspired by DragoNext's project AQWDoIHave, highlights items on Wiki Pages that you have in your inventory/bank
// @author      yenelle
// @downloadURL https://github.com/NickolasPhan/AQW-Do-I-Have--Y-Ver.-/raw/main/AQW_Do-I-Have_My_Version-1.12.6.user.js
// @updateURL   https://github.com/NickolasPhan/AQW-Do-I-Have--Y-Ver.-/raw/main/AQW_Do-I-Have_My_Version-1.12.6.user.js
// @match       https://account.aq.com/AQW/*
// @match       http://aqwwiki.wikidot.com/*
// @match       https://account.aq.com/Login
// @match       http://aqwwiki.wikidot.com/system:page-tags/tag/unidentified#pages
// @exclude     http://*aqwwiki.wikidot.com/main*
// @exclude     http://aqwwiki.wikidot.com/character-page-badges*
// @version     1.12.8
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM.deleteValue
// @grant       GM.xmlHttpRequest
// @grant       GM_addValueChangeListener
// @require     https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @run-at      document-end
// ==/UserScript==

/* global $ */

// https://stackoverflow.com/questions/25864833t

wikiPageLoader();
loginListener();

function wikiPageLoader() {
    if(window.location.href == 'http://aqwwiki.wikidot.com/' || window.location.href == 'https://account.aq.com/Login') {
        return;
    } // end if

    waitForElm('#page-content').then(() => {
        loadWikiBtns();
    }); // end waitForElm

    GM.xmlHttpRequest({
        method: "GET",
        url: "https://account.aq.com/AQW/InventoryData",
    }).then((result) => {
        try {
            if(result.finalUrl !== 'https://account.aq.com/AQW/InventoryData') {
                throw new Error("Could not retrieve user data.")};
            // console.log(JSON.parse(result.responseText).data);
            parseInventory(JSON.parse(result.responseText).data);
        } catch(error) {
            alert(error);
            let loginWin = popupWindow('https://account.aq.com/Login', 'AQW Login', window, 500, 700);

            GM_addValueChangeListener("loginWinState", function(key, oldValue, newValue, remote) {
                if(!newValue) {
                    loginWin.close();
                } // end if
            }); // end valueChangeListener
        } // end try catch
    }); // end getInventory promise

} // end wikiPageLoader

function popupWindow(url, windowName, win, w, h) {
    const y = win.top.outerHeight / 2 + win.top.screenY - ( h / 2);
    const x = win.top.outerWidth / 2 + win.top.screenX - ( w / 2);
    return win.open(url, windowName, `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);
} // end popupWindow

function loginListener() {
    if(window.location.href !== 'https://account.aq.com/Login') {
        return;
    } // end if

    GM.setValue("loginWinState", true);
    window.onunload = function() {
        GM.setValue("loginWinState", false);
    } // end onunload
} // end loginListener

async function parseInventory(inventoryJson) {
    let userInventory = {}
    let inventoryItem = {
        "name": "",
        "wikiLink": "",
        "type": "",
        "location": "",
        "member": "",
        "date": "",
        "ac": "",
        clear: function() {
            this.name = "";
            this.wikiLink = "";
            this.type = "";
            this.location = "";
            this.member = "";
            this.date = "";
            this.ac = "";
            if (typeof this.alias !== 'undefined') delete this.alias;
            if (typeof this.userQty !== 'undefined') {
                delete this.userQty;
                delete this.maxQty;
            } // end qtyif
        }, // end clear
        defQtys: function(qty) {
            this.userQty = qty;
            // this.maxQty = maxQty;
        }, // end defQtys
        defAlias: function(alias) {
            this.alias = alias
        } // end defAlias
    }; // end parseInventory

    let uniIndex = await GM.getValue("unidentifiedIndex", false);

    if(!uniIndex) {
        indexUnidentifieds();
    } else {
        uniIndex = JSON.parse(JSON.parse(JSON.stringify(uniIndex)));
    } // end if else

    const re_trailNum = / x[\d,]+$/g

    let i = 0;
    while(i < inventoryJson.length) {
        inventoryItem.name = inventoryJson[i][0].replace(re_trailNum, "");
        inventoryItem.wikiLink = "http://aqwwiki.wikidot.com/" + inventoryItem.name.replace(/ /g, "-");
        inventoryItem.type = inventoryJson[i][1];
        inventoryItem.location = inventoryJson[i][3];
        inventoryItem.member = inventoryJson[i][5];
        inventoryItem.date = inventoryJson[i][6];
        inventoryItem.ac = inventoryJson[i][4];

        if(inventoryItem.name.includes("Unidentified")) {
            inventoryItem.defAlias(uniIndex[inventoryItem.name]);
            // console.log(inventoryItem.alias);
            inventoryItem.wikiLink = "http://aqwwiki.wikidot.com/" + inventoryItem.alias.replace(/ /g, "-");
        }; // end if

        try {
            let qty = inventoryJson[i][0].match(/ x([\d,]+)$/)[1];
            inventoryItem.defQtys(parseInt(qty));
        } catch(e) {
            // console.log(e)
        } // end try catch

        userInventory[inventoryItem.name] = JSON.parse(JSON.stringify(inventoryItem));
        inventoryItem.clear();
        i++;
    } // end while

    // console.log(userInventory);
} // end parseInventory

function loadWikiBtns() {
    let extensionDiv = `
        </br>
        <div id="extensionDiv" style="position: sticky; top: 1%; z-index: 1; width: fit-content;">
            <div id="inventoryButtons">
                <button id="updateInventoryButton" class="inventoryButton" title="Refreshes open account inventory page and updates highlighted items on the wiki page.\nRequires account inventory page to be open.">
                    Update Wiki
                </button><button id="optionsInventoryButton" class="inventoryButton">
                    ▼
                </button><button id="openInventoryButton" class="inventoryButton" title="Opens account inventory page in a new tab.\nPlease make sure your inventory search box and filter boxes is empty." style="background: linear-gradient(rgb(191, 0, 0), rgb(93, 0, 0));">
                    Open Inventory
                </button>
            </div>

            <div id="optionsBoxDiv">
                <span id="showItemLoc" class="tooltip optionBox" style="background: linear-gradient(rgb(0, 80, 122), rgb(0, 26, 39));">
                    <input id="showItemLoc_checkbox" class="optionCheckboxes" type="checkbox">
                    <label for="showItemLoc_checkbox" title="Displays an icon next to items to indicate whether it is in your inventory or bank">
                        Show inventory item location
                    </label>
                </span>

                <span id="showItemType" class="tooltip optionBox" style="background: linear-gradient(rgb(0, 80, 122), rgb(0, 26, 39));">
                    <input id="showItemType_checkbox" class="optionCheckboxes" type="checkbox">
                    <label for="showItemType_checkbox" title="Displays an icon next to items to indicate their type">
                        Show inventory item type
                    </label>
                </span>

                <span id="showItemCt" class="tooltip optionBox" style="background: linear-gradient(rgb(0, 80, 122), rgb(0, 26, 39));">
                    <input id="showItemCt_checkbox" class="optionCheckboxes" type="checkbox">
                    <label for="showItemCt_checkbox" title="Example: (x125) Tainted Gem">
                        Show your misc. item count
                    </label>
                </span>

                <span id="showPreview" class="tooltip optionBox" style="background: linear-gradient(rgb(0, 80, 122), rgb(0, 26, 39));">
                    <input type="image" id="viewOptionToggle_L" class="viewOptionToggles" src="https://i.imgur.com/Aj0Hq4n.png" style="margin-left: 15px;">
                    <span id="viewOptionPreview" style="margin-right: 10px; margin-left: 10px;">
                        Example Item x50 (x10/100)
                    </span>
                    <input type="image" id="viewOptionToggle_R" class="viewOptionToggles" src="https://i.imgur.com/vkSFrJB.png" style="margin-right: 5px;">
                </span>

                <span id="showStackLimit" class="tooltip optionBox" style="background: linear-gradient(rgb(0, 80, 122), rgb(0, 26, 39));">
                    <input id="showStackLimit_checkbox" class="optionCheckboxes" style="margin-left: 15px;" type="checkbox">
                    <label for="showStackLimit_checkbox" title="Example: (x125/1000) Tainted Gem\nWARNING: If the extension has been installed for the first time or reinstalled, inventory load time may take significantly long. (Track progress on inventory page)">
                        Show stack limits on misc. items
                    </label>
                </span>

                <span id="reloadLoop" class="tooltip optionBox">
                    <input id="reloadLoop_checkbox" class="optionCheckboxes" type="checkbox">
                    <label for="reloadLoop_checkbox" title="Updates wiki at every chosen time interval. Uncheck or press button during countdown to disable looping." style="vertical-align: sub;">
                        Update wiki every
                    </label>
                    <select id="reloadLoop_select" style="margin-left: 5px;">
                        <option value="5">5s</option>
                        <option value="10">10s</option>
                        <option value="15">15s</option>
                        <option value="30">30s</option>
                        <option value="45">45s</option>
                        <option value="60">60s</option>
                    </select>
                </span>
            </div>
            <span id="invUpdNotif" class="tooltip">
                Inventory loading...
            </span>
        </div>
        </br>
    ` // end extensionDiv

    let extensionCss = `
        <style>
             .inventoryButton {
                 position: relative;
                 z-index: 999;
                 font-family: verdana,arial,helvetica,sans-serif;
                 font-size: 14pt;
                 color: rgb(255, 255, 255);
                 background: linear-gradient(#bf0000, #5d0000);
                 padding: 15px;
                 box-shadow: 1px 1px 1px #000;
                 border-radius: 10px;
                 border: 3.5px outset #ffcc00;
                 margin-right: 0px;
                 margin-left: 0px;
             }
             .optionCheckboxes {
                 margin-right: 10px;
             }
             .viewOptionToggles {
                 height: 20px;
             }
             .viewOptionToggles:hover {
                 color: rgb(255, 255, 255);
                 filter: brightness(130%);
             }
             .viewOptionToggles:active {
                 transform: scale(0.75);
             }
             #viewOptionPreview {
                 user-select: none;
             }
             #updateInventoryButton {
                 position: relative;
                 z-index: 998;
                 margin-left: 0px;
                 margin-right: 0px;
                 border-radius: 10px 0px 0px 10px;
                 border-right: 0px;
             }
             #optionsInventoryButton {
                 margin-left: 0px;
                 margin-right: 10px;
                 padding: 15px 2px 15px 2px;
                 border-radius: 0px 10px 10px 0px;
                 border-left: 3px solid #ffcc00;
             }
             .inventoryButton:hover {
                 cursor: pointer;
                 color: rgb(255, 255, 255);
                 filter: brightness(120%);
             }
             .inventoryButton:active {
                 cursor: pointer;
                 color: rgb(255, 255, 255);
                 box-shadow: inset 2px 2px 5px #000;
             }
             .tooltip {
                 display: none;
                 position: fixed;
                 width: fit-content;
                 left: 50%;
                 top: 35%;
                 z-index: 1000;
                 padding: 15px;
                 color: #ffffff;
                 background: linear-gradient(#484848, #1c1c1c);
                 border: 5px outset #ffcc00;
                 border-radius: 10px;
             }
             #optionsBoxDiv {
                 position: absolute;
                 display: none;
                 flex-direction: column;
                 border: 3.5px outset #ffcc00;
                 border-radius: 10px;
                 overflow: hidden;
             }
             .optionBox {
                 display: flex;
                 flex: 1;
                 position: relative;
                 width: inherit;
                 padding: 5px;
                 left: 0%;
                 border: none;
                 border-radius: 0px;
                 align-items: center;
             }
             .optionBox:hover {
                 color: rgb(255, 255, 255);
                 filter: brightness(130%);
             }
             .optionBox:active *, .optionBox:hover * {
                 cursor: pointer;
             }
             #invUpdNotif {
                 text-align: center;
             }
             #extensionDiv *:not(.viewOptionToggles) {
                 transition: all;
                 transition-duration: 0.2s;
             }
         </style>
     ` // end extensionCss

    // $('#page-content').prepend(extensionDiv);
    // $('#page-content').css('display', 'unset');
    // $('head').append(extensionCss);
} // end loadWikiBtns

/* ---------------------------------------------------------------------------------------------------- */
/* ------------------------------------- General Helper Functions ------------------------------------- */
/* ---------------------------------------------------------------------------------------------------- */

async function indexUnidentifieds() {
    // let uniURL = await GM.xmlHttpRequest({
    let uniUrl = await GM.xmlHttpRequest({
        method: "GET",
        url: "http://aqwwiki.wikidot.com/system:page-tags/tag/unidentified#pages",
    }); // end xmlHttpRequest

    let uniDom = document.createElement('html');
    uniDom.innerHTML = uniUrl.responseText;

    let uniLinks = $('#tagged-pages-list a', uniDom);
    let i=0, len = uniLinks.length;
    let uniJson = {};

    while(i<len) {
        if(uniLinks[i].innerHTML.includes('\(')){
            let uniIndex = uniLinks[i].innerHTML.match(/(.*?)(?= \()/g)[0];
            let uniName = uniLinks[i].innerHTML.match(/\(([^)]+)\)/g)[0].replace(/\(|\)/g, '');
            uniJson[uniIndex] = uniName;
        } // end if

        i++;
    } // end while

    GM.setValue('unidentifiedIndex', JSON.stringify(uniJson));
} // end indexUnidentifieds

// wait for elements on page to load
function waitForElm(selector) { // https://stackoverflow.com/questions/5525071
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        } // end if

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            } // end if
        }); // end observer defintition

        observer.observe(document.body, {
            childList: true,
            subtree: true
        }); // end observer
    }); // end promise
} // end waitForElm