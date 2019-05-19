/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* GLOBALNI PROMENNE */

// informacni panel
var INFsatelity = document.getElementById("INFsatelity")
var INFbaterka = document.getElementById("INFbaterka")
var INFfix = document.getElementById("INFfix")
var INFble = document.getElementById("INFble")

var lastGGA = ""
var gnnsPripojeno = false

var BLUETOOTH
var database = new Databaze() // WebSQL databaze
var client
var uloziste = window.localStorage
// nacteni posledni ulozene zakazky pokud, je aplikace spustena poprve nacte se ukazkova zakazka
var idZAKAZKY = uloziste.zakazka ? Number(uloziste.zakazka) : 1
var naZakazky
var MERENI = {
  bool: false,
  data: [],
  delkaMereni: 0
}
var delkaMereni
var vyskaAnteny

var NTRIPcon = {
  pripojeno: false,
  mntpID: 0,
  ZDtabulka: []
}

var UBX = {
  bool: false,
  nazevZakazky: "",
  nazevSouboru: "",
  RAW: new Uint8Array()
}

var DATA = {
  GGA: {
    LAT: 0,
    LON: 0,
    ALT: 0,
    SEP: 0,
    NUMSAT: 0,
    fixType: "",
    differentialAge: 0,
    differentialRefStn: ""
  },
  GSV: { GP: [], GL: [] },
  GSA: { GP: [], GL: [], HDOP: 0, PDOP: 0, VDOP: 0 },
  GST: { DEVlat: 0, DEVlon: 0, DEValt: 0 },
  FixStatus: false
}
var DRUZICE = {
  GP: [],
  GL: []
}

// globalni promena pro ukonceni intervalu funkce
var intInfoMereni = null
var intMereni = null
var intVytyceni = null
var ntripInt = null
var BodVytyc
var sky
var MERcas
var BTmereni

// zvuky
var zvukFix
var zvukNoFix

var app = {
  // kontruktor aplikace
  initialize: function() {
    document.addEventListener("deviceready", app.init)
  },
  init: function() {
    eventy()
    database.initDB()
    database.vytvorTabulky()
    database.nazevZakazky(idZAKAZKY)
    vyskaAnteny = parseFloat(uloziste.getItem("vyskaAnteny"))
    client = new Socket() // TCP/NTRIP client

    // Kontrola zapnuti Bluetooh a
    // nacteni adresy posledniho pripojeného zarizeni
    bluetoothSerial.isEnabled(
      function() {
        if (uloziste.BTadresa) {
          setTimeout(() => {
            BLEpripojZarizeni(uloziste.BTadresa)
          }, 1000)
        }
      },
      function() {
        setTimeout(() => {
          udelejToast("Zapni Bluetooth!!")
        }, 3000)
      }
    )
    // prirazeni zvuku
    zvukFix = new Media("/android_asset/www/sound/fix_status.mp3")
    zvukNoFix = new Media("/android_asset/www/sound/nofix_status.mp3")

    domov()
    aktivOkno("domov")

    var intt = setInterval(function() {
      nactiData(gnnsPripojeno)
    }, 1000)
    document.addEventListener("pause", app.paused)
    document.addEventListener("resume", app.resumed)
  },
  paused: function(ev) {
    console.log(ev)
    app.status = "paused"
  },
  resumed: function(ev) {
    console.log(ev)
    app.status = "ready"
  },
  history: ["#domov"],
  status: "ready"
}

app.initialize()

function nactiData(pripojeno) {
  // tato funkce zkontroluje pripojeni k arduinu/gnns prijimaci a pokud je pripojen, zacne
  // ukladat data prijata v nmea zpravach..

  // kontrola pripojeni
  bluetoothSerial.isConnected(
    function() {
      // pripojeno
      gnnsPripojeno = true
    },
    function() {
      // nepripojeno/odpojeni
      gnnsPripojeno = false

      DATA = {
        GGA: {
          LAT: 0,
          LON: 0,
          ALT: 0,
          SEP: 0,
          NUMSAT: 0,
          fixType: "",
          differentialAge: 0,
          differentialRefStn: ""
        },
        GSV: { GP: [], GL: [] },
        GSA: { GP: [], GL: [], HDOP: 0, PDOP: 0, VDOP: 0 },
        GST: { DEVlat: 0, DEVlon: 0, DEValt: 0 }
      }

      DRUZICE = {
        GP: [],
        GL: []
      }
    }
  )

  if (pripojeno) {
    bluetoothSerial.subscribe(
      "\n",
      function(data) {
        // kontrola zacatku nmea zpravy
        if (data.slice(0, 2) === "$G") {
          prekladNMEA(data, ulozeniGnnsDat)
        } else {
          // Prohledani surovych dat, ktere se neoddelují <CR><LF>
          // a prvni NMEA zprava (tzn. GGA) se pripoji k nim
          var zacGGA = data.search("GNGGA")

          if (zacGGA != -1) {
            // data obsahuji GGA zpravu
            prekladNMEA(data.slice(zacGGA - 1), ulozeniGnnsDat)
          }
        }
      },
      false
    )

    bluetoothSerial.subscribeRawData(function(data) {
      // tato metoda vraci zasilana binarni data v podobe ArrayBuffer
      let newArr = new Uint8Array(data)
      if (UBX.bool) {
        UBX.RAW = new Uint8Array([...UBX.RAW, ...newArr])
        //
        if (UBX.RAW.length > 10000) {
          console.log("ukladam!!")
          ulozRawData(UBX.nazevZakazky, UBX.nazevSouboru, UBX.RAW.buffer)
          UBX.RAW = new Uint8Array()
        }
      }
    }, false)
  } else {
    // pokud se prijimac odpoji vymazou se nactena data o poloze
    INFsatelity.innerText = "0/0"
    INFble.src = "img/ble_disconnected.svg"
  }
}

function prekladNMEA(veta, ulozeni) {
  // V teto podmince se rozhoduje zda se jedna o vetu, kterou chceme prelozit nebo nikoliv
  if (
    veta.slice(3, 6) === "ZDA" ||
    veta.slice(3, 6) === "RCM" ||
    veta.slice(3, 6) === "TXT"
  ) {
    // nic
  } else if (veta.slice(3, 6) === "ARD") {
    // informace poslane arduinem : stav baterie atd.
  } else if (veta.slice(3, 6) === "GST") {
    // informace o presnosti mereni
    let rozdel = veta.split(",")

    DATA.GST.DEVlat = parseFloat(rozdel[6])
    DATA.GST.DEVlon = parseFloat(rozdel[7])
    DATA.GST.DEValt = parseFloat(rozdel[8].slice(0, -3))
  } else if (veta.slice(3, 6) === "GGA") {
    lastGGA = veta
    var preklad = nmeaParse(veta)
    ulozeni(preklad)
  } else {
    var preklad = nmeaParse(veta)
    ulozeni(preklad)
  }
}

var ulozeniGnnsDat = function(objekt) {
  var typVety = objekt.sentence
  var mluvci = objekt.talker_id
  if (typVety === "GGA") {
    DATA.GGA.LAT = parseLatitude(objekt.lat, objekt.latPole)
    DATA.GGA.LON = parseLongitude(objekt.lon, objekt.lonPole)
    DATA.GGA.ALT = objekt.alt
    DATA.GGA.SEP = objekt.geoidalSep
    DATA.GGA.NUMSAT = objekt.numSat
    DATA.GGA.fixType = objekt.fixType
    DATA.GGA.differentialAge = objekt.differentialAge
    DATA.GGA.differentialRefStn = objekt.differentialRefStn

    // Zmena barvy indikatoru kvality souradnic
    switch (objekt.fixType) {
      case "delta": // DGNSS
        INFfix.style.fill = "blue"
        if (DATA.FixStatus == true) {
          DATA.FixStatus = false
          zvukNoFix.play()
        }
        break
      case "rtk": // RTK - fix
        INFfix.style.fill = "green"
        if (DATA.FixStatus == false) {
          DATA.FixStatus = true
          zvukFix.play()
        }
        break
      case "frtk": // RTK - float
        INFfix.style.fill = "orange"
        if (DATA.FixStatus == true) {
          DATA.FixStatus = false
          zvukNoFix.play()
        }
        break
      case "estimated": //
        INFfix.style.fill = "red"
        if (DATA.FixStatus == true) {
          DATA.FixStatus = false
          zvukNoFix.play()
        }
        break
      default:
        // kodove mereni
        INFfix.style.fill = "black"
        if (DATA.FixStatus == true) {
          DATA.FixStatus = false
          zvukNoFix.play()
        }
        break
    }
  } else if (typVety === "GSA") {
    // znaceni satelitu
    // GP      : 1-32
    // SBAS    : 33-64,152-158
    // Gallieo : 301-336
    // BeiDou  : 401-437
    // IMES    : 173-182
    // QZSS    : 193-197
    // GLONASS : 65-96
    if (objekt.satellites[0] < 33) {
      // GP satelity
      DATA.GSA.HDOP = objekt.HDOP
      DATA.GSA.PDOP = objekt.PDOP
      DATA.GSA.VDOP = objekt.VDOP
      DATA.GSA.GP = objekt.satellites
      INFsatelity.innerText = DATA.GSA.GP.length + "/" + DATA.GSA.GL.length
    } else if (64 < objekt.satellites[0] < 97) {
      // GLONASS satelity
      DATA.GSA.GL = objekt.satellites
      INFsatelity.innerText = DATA.GSA.GP.length + "/" + DATA.GSA.GL.length
    }
  } else if (typVety === "GSV") {
    if (mluvci === "GL") {
      if (objekt.msgNum == 1) {
        DATA.GSV.GL = []
        objekt.satellites.forEach(satelit => {
          DATA.GSV.GL.push(satelit)
        })
      } else {
        objekt.satellites.forEach(satelit => {
          DATA.GSV.GL.push(satelit)
        })

        if (objekt.msgNum == objekt.numMsgs) {
          DRUZICE.GL = DATA.GSV.GL
        }
      }
    } else if (mluvci === "GP") {
      if (objekt.msgNum == 1) {
        DATA.GSV.GP = []
        objekt.satellites.forEach(satelit => {
          DATA.GSV.GP.push(satelit)
        })
      } else {
        objekt.satellites.forEach(satelit => {
          DATA.GSV.GP.push(satelit)
        })
        if (objekt.msgNum == objekt.numMsgs) {
          DRUZICE.GP = DATA.GSV.GP
        }
      }
    } else {
      // pokud bychom prijmali data z jinych druzic nez GLONASS a GPS
      console.log(objekt.talker_id)
    }
  }
}

function udelejToast(text, delka) {
  window.simpleToastPlugin.show(
    text,
    0,
    function(e) {
      //success callback
    },
    function(e) {
      //error callback
      alert("neco je spatne" + e)
    }
  )
  navigator.vibrate(delka)
}

function eventy() {
  document.getElementById("domov").addEventListener(
    "click",
    function() {
      domov()
      aktivOkno("domov")
    },
    false
  )
  document.getElementById("mereni").addEventListener(
    "click",
    function() {
      mereni()
      aktivOkno("mereni")
    },
    false
  )
  document.getElementById("vytyceni").addEventListener(
    "click",
    function() {
      vytyceni()
      aktivOkno("vytyceni")
    },
    false
  )
  document.getElementById("skyplot").addEventListener(
    "click",
    function() {
      skyplot()
      aktivOkno("skyplot")
    },
    false
  )
  document.getElementById("nastaveni").addEventListener(
    "click",
    function() {
      nastaveni()
      aktivOkno("nastaveni")
    },
    false
  )

  document.addEventListener(
    "backbutton",
    function(e) {
      if (window.location.hash === "#domov") {
        e.preventDefault()
        navigator.app.exitApp()
      } else {
        zpet()
      }
    },
    false
  )
}

function zpet() {
  var totoOkno = app.history.pop()
  var predchoziOkno = app.history.pop()

  switch (predchoziOkno) {
    case "#domov":
      domov()
      aktivOkno("domov")
      break
    case "#mereni":
      mereni()
      aktivOkno("mereni")
      break
    case "#vytyceni":
      vytyceni()
      aktivOkno("vytyceni")
      break
    case "#skyplot":
      skyplot()
      aktivOkno("skyplot")
      break
  }
}

function domov() {
  app.history.push("#domov")
  window.location.hash = "domov"
  var rodic = document.getElementById("plocha")

  vymazPlochu(rodic)
  rodic.innerHTML = HTMLdomov

  database.seznamZakazek()
  database.infoZakazka(idZAKAZKY)
  eventyDomov()
}

function mereni() {
  app.history.push("#mereni")
  window.location.hash = "mereni"
  var rodic = document.getElementById("plocha")
  vymazPlochu(rodic)

  rodic.innerHTML = HTMLmereni

  eventyMereni()
}

function vytyceni() {
  app.history.push("#vytyceni")
  window.location.hash = "vytyceni"
  var rodic = document.getElementById("plocha")
  vymazPlochu(rodic)

  rodic.innerHTML = HTMLvytyceni

  eventyVytyceni()
}

function skyplot() {
  app.history.push("#skyplot")
  window.location.hash = "skyplot"
  var rodic = document.getElementById("plocha")
  vymazPlochu(rodic)
  ;[maxPolomer, sirka, vyska, ctx, canvas] = vytvorSkyplot()

  sky = setInterval(function() {
    SKY()
  }, 1000)
}

function nastaveni() {
  app.history.push("#nastav")
  window.location.hash = "nastav"
  var rodic = document.getElementById("plocha")
  vymazPlochu(rodic)
  rodic.innerHTML = HTMLnastaveni

  eventyNastaveni()
}

function vymazPlochu(rodic) {
  // tato funkce vymaze vsechny potomky daneho oddilu
  while (rodic.firstChild) {
    rodic.removeChild(rodic.firstChild)
  }
}

function aktivOkno(okno) {
  navigator.vibrate(25)
  var zmacknuto = "rgb(50,50,50)"
  var nezmacknuto = "rgb(79,79,79)"
  var BtDomov = document.getElementById("domov")
  var BtMereni = document.getElementById("mereni")
  var BtVytyceni = document.getElementById("vytyceni")
  var BtSkyplot = document.getElementById("skyplot")
  var BtNastaveni = document.getElementById("nastaveni")

  switch (okno) {
    case "domov":
      // zmena barvy
      BtDomov.style.backgroundColor = zmacknuto
      BtMereni.style.backgroundColor = nezmacknuto
      BtVytyceni.style.backgroundColor = nezmacknuto
      BtSkyplot.style.backgroundColor = nezmacknuto
      BtNastaveni.className = ""
      return
    case "mereni":
      // zmena barvy
      BtDomov.style.backgroundColor = nezmacknuto
      BtMereni.style.backgroundColor = zmacknuto
      BtVytyceni.style.backgroundColor = nezmacknuto
      BtSkyplot.style.backgroundColor = nezmacknuto
      BtNastaveni.className = ""
      return
    case "vytyceni":
      // zmena barvy
      BtDomov.style.backgroundColor = nezmacknuto
      BtMereni.style.backgroundColor = nezmacknuto
      BtVytyceni.style.backgroundColor = zmacknuto
      BtSkyplot.style.backgroundColor = nezmacknuto
      BtNastaveni.className = ""
      return
    case "skyplot":
      // zmena barvy
      BtDomov.style.backgroundColor = nezmacknuto
      BtMereni.style.backgroundColor = nezmacknuto
      BtVytyceni.style.backgroundColor = nezmacknuto
      BtSkyplot.style.backgroundColor = zmacknuto
      BtNastaveni.className = ""
      return
    case "nastaveni":
      // zmena barvy
      BtDomov.style.backgroundColor = nezmacknuto
      BtMereni.style.backgroundColor = nezmacknuto
      BtVytyceni.style.backgroundColor = nezmacknuto
      BtSkyplot.style.backgroundColor = nezmacknuto
      BtNastaveni.className = "rotate_slow"
      return
  }
}

var HTMLnastaveni =
  '<div class="nast"> <p>Nastavení bluetooth připojení:</p><div> <button id="ble_hledej" class=""><img src="img/refresh.svg"/></button> <select id="ble_seznam"> </select> <button id="ble_pripoj">PŘIPOJ BT</button> </div></div><hr/><div class="nast"> <p>Nastavení NTRIP připojení:</p><input type="text" placeholder="Ip adresa serveru..." id="NTRIPip"/> <input type="text" placeholder="port..." id="NTRIPport"/> <br/> <button id="NTRIPmntp">MoutnPointy</button> <br/> <select id="mount_seznam"> </select> <br/> <input type="text" placeholder="Uživatelské jméno" id="NTRIPuziv"/> <input type="password" placeholder="Heslo" id="NTRIPheslo"/> <button id="NTRIPpripoj">Připoj</button></div><hr/><div class="nast"><p>Podrobnosti mountpointu</p><div id="mntpTable"></div></div>'

var HTMLdomov =
  '<div class="domov"> <div class="zakazkaInfo"> <b>Informace o aktuální zakázce</b><br/> <p id="INFOnazevZakazky">Název zakázky :</p><p id="INFOdatumVytvoreni">Datum vytvoření :</p><p id="INFOpocetBodu">Počet změřených bodů :</p></div><hr/> <div> <div class="BTselect"> <button class="plus" id="BTpridejZakazku">+</button> <select name="zakazky" id="seznamZakazek"> <option value="">Vytvoř zakázku</option> </select> </div><button id="BTzobrazUlozeneBody">Zobraz uložené body</button> </div><hr/> <div> <button id="BTexportMereni">Exportuj měření</button> <button id="BTimportBodu">Importuj body</button> <button id="BTvymazZakazku">Vymaž zakázku</button> </div><div class="modal" id="modalZakazka"> <button class="close" id="BTzavri"> <img src="img/close.svg" alt=""/> </button> <p>Název zakázky</p><input type="text" id="INPnazevZakazky"/> <p>Datum</p><input type="date" id="INPdatum"/> <p>Popis</p><textarea id="INPpopis" class="popis"></textarea> <button id="BTzalozZakazku">Založ zakázku</button> </div><div class="modal" id="modalBody"> <button class="close" id="BTzavriBody"> <img src="img/close.svg" alt=""/> </button> <p class="modalInfo">Uložené body:</p><div class="Seznam" id="modalBodySeznam"></div></div></div>'

var HTMLdomovOld =
  '<div class="domov"> <div class="zakazkaInfo"> <b>Informace o aktuální zakázce</b><br/> <p id="INFOnazevZakazky">Název zakázky :</p><p id="INFOdatumVytvoreni">Datum vytvoření :</p><p id="INFOpocetBodu">Počet změřených bodů :</p></div><hr/> <div> <div class="BTselect"> <button class="plus" id="BTpridejZakazku">+</button> <select name="zakazky" id="seznamZakazek"> <option value="">Vytvoř zakázku</option> </select> </div><button id="BTzobrazUlozeneBody">Zobraz uložené body</button> </div><hr/> <div> <button id="BTexportMereni">Exportuj měření</button> <button id="BTimportBodu">Importuj body</button> <button id="BTvymazZakazku">Vymaž zakázku</button> </div><div class="modal" id="modalZakazka"> <button class="close" id="BTzavri"> <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 51.976 51.976" style="enable-background:new 0 0 51.976 51.976;" xml:space="preserve" > <g> <path d="M44.373,7.603c-10.137-10.137-26.632-10.138-36.77,0c-10.138,10.138-10.137,26.632,0,36.77s26.632,10.138,36.77,0C54.51,34.235,54.51,17.74,44.373,7.603z M36.241,36.241c-0.781,0.781-2.047,0.781-2.828,0l-7.425-7.425l-7.778,7.778c-0.781,0.781-2.047,0.781-2.828,0c-0.781-0.781-0.781-2.047,0-2.828l7.778-7.778l-7.425-7.425c-0.781-0.781-0.781-2.048,0-2.828c0.781-0.781,2.047-0.781,2.828,0l7.425,7.425l7.071-7.071c0.781-0.781,2.047-0.781,2.828,0c0.781,0.781,0.781,2.047,0,2.828l-7.071,7.071l7.425,7.425C37.022,34.194,37.022,35.46,36.241,36.241z"/> </g> </svg> </button> <p>Název zakázky</p><input type="text" id="INPnazevZakazky"/> <p>Datum</p><input type="date" id="INPdatum"/> <p>Popis</p><textarea id="INPpopis" class="popis"></textarea> <button id="BTzalozZakazku">Založ zakázku</button> </div></div>'

var HTMLmereni =
  '<div class="mereni"> <label for="nazevBodu">Název bodu :</label> <input type="text" id="MERnazevBodu"/> <label for="vyskaAnteny">Výška antény [m] :</label> <input type="number" id="MERvyskaAnteny"/> <p class="zobrazCas" id="MERzobrazCas">0:01:50</p><input type="range" min="10" max="300" step="5" value="10" class="Slider" id="SliderDobaMereni"/> <button id="BTmereni">MĚŘ</button> <hr/> <table> <tr> <th>Doba měření :</th> <td id="MERcas">0:00:00</td></tr><tr> <th>Zem. šířka :</th> <td id="MERzemSirka"></td><td id="MERlatP"></td></tr><tr> <th>Zem. délka :</th> <td id="MERzemDelka"></td><td id="MERlonP"></td></tr><tr> <th>Výška :</th> <td id="MERvyska"></td><td id="MERaltP"></td></tr><tr> <th>PDOP :</th> <td id="MERpdop"></td></tr></table><hr /><button id="BTRaw" class="BTRaw">Logování RAW dat</button></div>'

var HTMLvytyceni =
  '<div class="vytyceni"> <p><b id="VYTcisloBodu">Vytyčení bodu:</b></p><canvas id="VYTcanvas"></canvas> <hr/> <table> <tr> <th>Vzdálenost k bodu :</th> <td id="VYTvzdalBod"></td></tr><tr> <th id="VYTsj">Jdi na sever :</th> <td id="VYTsjHodnota"></td></tr><tr> <th id="VYTvz">Jdi na západ :</th> <td id="VYTvzHodnota"></td></tr></table> <button id="BTpodrobnosti" class="VYTcollapse">Zobraz podrobnosti</button> <div id="podrobnosti" class="collapsible"> <table> <tr> <th>Převýšení :</th> <td id="VYTprevyseni"></td></tr><tr> <th>H :</th> <td id="VYThPresnost"></td></tr><tr> <th>V :</th> <td id="VYTvPresnost"></td></tr></table> </div><hr/> <button id="BTulozBod" class="schovany">Ulož bod</button> <button id="BTvytyceni">Vyber bod k vytyčení</button> <div class="modal" id="modalBody"> <button class="close" id="BTzavriBody"> <img src="img/close.svg" alt=""/> </button> <p class="modalInfo">Vyber bod pro vytyčení:</p><div class="Seznam" id="modalBodySeznam"></div></div></div>'
