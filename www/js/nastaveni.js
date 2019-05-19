function eventyNastaveni() {
  let BTbleHledej = document.getElementById("ble_hledej")
  let BTblePripoj = document.getElementById("ble_pripoj")
  let SELble = document.getElementById("ble_seznam")

  let NTRIPip = document.getElementById("NTRIPip")
  let NTRIPport = document.getElementById("NTRIPport")
  let NTRIPuziv = document.getElementById("NTRIPuziv")
  let NTRIPheslo = document.getElementById("NTRIPheslo")
  let NTRIPmntp = document.getElementById("NTRIPmntp")
  let NTRIPpripoj = document.getElementById("NTRIPpripoj")
  let MNTPseznam = document.getElementById("mount_seznam")

  // kontrola zapnuti BLE
  BLEzobrazSparovanaZarizeni()
  // vlozeni predchozich hodnot
  NTRIPip.value = uloziste.getItem("NTRIPip")
  NTRIPport.value = uloziste.getItem("NTRIPport")
  NTRIPuziv.value = uloziste.getItem("NTRIPuziv")
  NTRIPheslo.value = uloziste.getItem("NTRIPheslo")

  // Pokud je client pripojen nastavi se tlacitko na odpojeni
  NTRIPcon.pripojeno
    ? (NTRIPpripoj.innerText = "Odpoj")
    : (NTRIPpripoj.innerText = "Připoj")

  NTRIPip.addEventListener("change", () => {
    uloziste.setItem("NTRIPip", NTRIPip.value)
  })

  NTRIPport.addEventListener("change", () => {
    uloziste.setItem("NTRIPport", NTRIPport.value)
  })

  NTRIPuziv.addEventListener("change", () => {
    uloziste.setItem("NTRIPuziv", NTRIPuziv.value)
  })
  NTRIPheslo.addEventListener("change", () => {
    uloziste.setItem("NTRIPheslo", NTRIPheslo.value)
  })

  NTRIPpripoj.addEventListener("click", () => {
    navigator.vibrate(25)
    // kontrola vstupu
    if (navigator.connection.type === "none") {
      udelejToast("Připojení k internetu není k dispozici.", 500)
      return
    }
    if (NTRIPcon.ZDtabulka.length == 0) {
      udelejToast("Vyhledej dostupné mountpointy.", 500)
      return
    }

    if (NTRIPpripoj.innerText === "Připoj") {
      NTRIPClient(
        NTRIPip.value,
        NTRIPport.value,
        NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][1],
        Number(NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][11]),
        NTRIPuziv.value,
        NTRIPheslo.value
      )

      NTRIPpripoj.innerText = "Odpoj"
    } else {
      NTRIPpripoj.innerText = "Připoj"
      client.close()
    }
  })

  NTRIPmntp.addEventListener("click", () => {
    navigator.vibrate(25)
    // kontrola vstupu
    zdrojovaTabulka(NTRIPip.value, NTRIPport.value)
  })

  MNTPseznam.addEventListener("change", () => {
    podrobnostiMNTP()
  })

  BTbleHledej.addEventListener("click", () => {
    navigator.vibrate(25)
    BTbleHledej.className = "rotate_slow"
    BLEzobrazNEsparovanaZarizeni()
  })

  BTblePripoj.addEventListener("click", () => {
    navigator.vibrate(25)
    BLEpripojZarizeni(SELble.value)
    localStorage.setItem("BTadresa", SELble.value)
  })
}

function podrobnostiMNTP() {
  let MNTPseznam = document.getElementById("mount_seznam")
  var mntpTable = document.getElementById("mntpTable")
  var str = ""
  let delka

  let pozicePrijim = {
    lat: DATA.GGA.LAT,
    lon: DATA.GGA.LON,
    alt: DATA.GGA.ALT
  }
  let poziceSource = {
    lat: parseFloat(NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][9]),
    lon: parseFloat(NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][10]),
    alt: 0
  }

  // vypocet delky mezi referencnim a nasim prijmacem
  // pokud se jedna o virtualni stanice nebo nemame pripojeny prijimac delka nebude spoctena
  if (
    DATA.GGA.LAT == 0 ||
    Number(NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][11])
  ) {
    delka = " / "
  } else {
    delka = zaokrouhli(geodesyDistance(poziceSource, pozicePrijim) / 1000, 1)
  }

  str += '<table class="ntrip"><tr><td>Název MNTP</td><td id="nazevMNTP">'
  str += NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][2]
  str += '</td></tr><tr><td>Vzdálenost k bodu</td><td id="vzdalMNTP">'
  str += delka + " km"
  str += '</td></tr><tr><td>Poskytovatel korekcí</td><td id="poskytovatelMNTP">'
  str += NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][7]
  str += '</td></tr><tr><td>Zpoplatnění dat</td><td id="zpoplatneniMNTP">'
  str += NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][16] === "Y" ? "ANO" : "NE"
  str += '</td></tr><tr><td>Přenosová rychlost</td><td id="rychlostMNTP">'
  str += NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][17]
  str += '</td></tr><tr><td>Typ korekcí</td><td id="korekceMNTP">'
  str += NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][3]
  str += '</td></tr><tr><td>Typ stanice</td><td id="staniceMNTP">'
  str += Number(NTRIPcon.ZDtabulka[MNTPseznam.selectedIndex][11])
    ? "Virtuální"
    : "Fyzická"
  str += "</td></tr></table>"

  mntpTable.innerHTML = str
}
