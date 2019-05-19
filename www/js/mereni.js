function eventyMereni() {
  let SLdobaMereni = document.getElementById("SliderDobaMereni")
  BTmereni = document.getElementById("BTmereni")
  let BTRaw = document.getElementById("BTRaw")
  let MERvyskaAnteny = document.getElementById("MERvyskaAnteny")
  let MERnazevBodu = document.getElementById("MERnazevBodu")

  // Elementy tabulky
  let MERcas = document.getElementById("MERcas")
  let MERzemSirka = document.getElementById("MERzemSirka")
  let MERzemDelka = document.getElementById("MERzemDelka")
  let MERvyska = document.getElementById("MERvyska")
  let MERpdop = document.getElementById("MERpdop")
  let MERlatP = document.getElementById("MERlatP")
  let MERlonP = document.getElementById("MERlonP")
  let MERaltP = document.getElementById("MERaltP")

  // Nastaveni hodnot podle predchozich
  MERvyskaAnteny.value = uloziste.getItem("vyskaAnteny")
  database.posledniBodZakazky(idZAKAZKY, cb => {
    MERnazevBodu.value = cb[0]["nazevBodu"] + 1
  })

  if (MERENI.bool) {
    BTmereni.innerText = "ULOŽ"
  }

  zobrazDobuMereni()

  intInfoMereni = setInterval(function() {
    zobrazInfoMereni()
  }, 1000)

  SLdobaMereni.addEventListener("change", () => {
    zobrazDobuMereni()
  })

  BTmereni.addEventListener("click", () => {
    let text = BTmereni.innerText

    text === "MĚŘ" ? zacniMerit() : ulozMereni()
  })

  BTRaw.addEventListener("click", () => {
    logovaniRawDat()
  })

  MERvyskaAnteny.addEventListener("change", () => {
    uloziste.setItem("vyskaAnteny", MERvyskaAnteny.value)
    vyskaAnteny = parseFloat(MERvyskaAnteny.value)
  })
}

function zobrazDobuMereni() {
  let slider = document.getElementById("SliderDobaMereni")
  let zobrazCas = document.getElementById("MERzobrazCas")
  let doba = slider.value

  zobrazCas.innerText = delkaMereniSTR(doba)
}

function zacniMerit() {
  let MERnazevBodu = document.getElementById("MERnazevBodu")
  let MERvyskaAnteny = document.getElementById("MERvyskaAnteny")
  MERcas = document.getElementById("MERcas")
  BTmereni = document.getElementById("BTmereni")

  // kontrola vstupnich dat a pripojeni prijimace
  if (gnnsPripojeno) {
    if (MERnazevBodu.value === "" || MERvyskaAnteny.value === "") {
      udelejToast("Vyplň název bodu a výšku antény.")
    } else {
      console.log("Měřím")
      MERENI.bool = true
      BTmereni.innerText = "ULOŽ"
      BTmereni.style.backgroundColor = "red"
      // prazdny objekt pro ulozeni merenych dat
      MERENI.data = []

      MERENI.delkaMereni = 0

      intMereni = setInterval(function() {
        MERENI.delkaMereni++
        MERENI.data.push(JSON.parse(JSON.stringify(DATA)))

        if (window.location.hash === "#mereni") {
          MERcas = document.getElementById("MERcas")
          MERcas.innerText = delkaMereniSTR(MERENI.delkaMereni)
        }

        if (
          MERENI.delkaMereni > document.getElementById("SliderDobaMereni").value
        ) {
          if (app.status === "paused") {
            cordova.plugins.notification.local.schedule({
              title: "Měřený bod ",
              text: "Bylo dosaženo požadované doby měření.."
            })
            app.status = "notification"
          }
          BTmereni.style.backgroundColor = "green"
        } else {
          BTmereni.style.backgroundColor = "red"
        }
      }, 1000)
    }
  } else {
    udelejToast("Gnss přijimač není připojen..", 500)
  }
}

function ulozMereni() {
  let MERnazevBodu = document.getElementById("MERnazevBodu")
  let MERvyskaAnteny = document.getElementById("MERvyskaAnteny")
  MERcas = document.getElementById("MERcas")
  let noveCislo, stareCislo, vyskaAnteny

  // preruseni logovani Raw dat, pokud byla ukladana
  if (UBX.bool) {
    UBX = {
      bool: false,
      nazevZakazky: "",
      nazevSouboru: "",
      RAW: new Uint8Array()
    }
  }

  // změna popisku
  BTmereni.innerText = "MĚŘ"
  BTmereni.style.backgroundColor = "orange"
  MERcas.innerText = delkaMereniSTR(0)

  vyskaAnteny = MERvyskaAnteny.value
  stareCislo = MERnazevBodu.value
  noveCislo = isNaN(parseInt(MERnazevBodu.value))
    ? MERnazevBodu + 1
    : parseInt(MERnazevBodu.value) + 1
  MERnazevBodu.value = noveCislo
  // ukonceni zaznamenavani dat
  clearInterval(intMereni)
  MERENI.bool = false

  // analyza namerenych dat + ulozeni
  ulozZmerenyBod(MERENI.data, stareCislo, vyskaAnteny)
}

function ulozZmerenyBod(data, nazevBodu, vyskaAnteny) {
  let lat = 0
  let lon = 0
  let alt = 0
  let sep = 0
  let ctr = 0

  data.forEach(el => {
    // kontrola pozadovane konfigurace PDOP, fix typ
    if (true) {
      // pridani dat k vypoctu prumeru
      lat += parseFloat(el.GGA.LAT)
      lon += parseFloat(el.GGA.LON)
      alt += parseFloat(el.GGA.ALT)
      sep += parseFloat(el.GGA.SEP)
      ctr++
    }
  })

  // vypocet prumernych hodnot
  let pLat = zaokrouhli(lat / ctr, 12)
  let pLon = zaokrouhli(lon / ctr, 12)
  let pAlt = zaokrouhli(alt / ctr, 4)
  let pSep = zaokrouhli(sep / ctr, 4)

  // urceni maxmalniho rozdilu od prumeru
  let dLat = 0
  let dLon = 0
  let dAlt = 0

  data.forEach(el => {
    dLat =
      Math.abs(pLat - parseFloat(el.GGA.LAT)) > dLat
        ? Math.abs(pLat - parseFloat(el.GGA.LAT))
        : dLat
    dLon =
      Math.abs(pLon - parseFloat(el.GGA.LON)) > dLon
        ? Math.abs(pLon - parseFloat(el.GGA.LON))
        : dLon
    dAlt =
      Math.abs(pAlt - el.GGA.ALT) > dAlt ? Math.abs(pAlt - el.GGA.ALT) : dAlt
  })

  database.ulozBod(
    idZAKAZKY,
    nazevBodu,
    pLat,
    dLat,
    pLon,
    dLon,
    pAlt,
    dAlt,
    pSep,
    vyskaAnteny,
    "mer"
  )
}

function logovaniRawDat() {
  let MERnazevBodu = document.getElementById("MERnazevBodu")
  let MERvyskaAnteny = document.getElementById("MERvyskaAnteny")
  let datum = new Date()

  // kontrola vstupnich dat a pripojeni prijimace
  if (gnnsPripojeno) {
    if (MERnazevBodu.value === "" || MERvyskaAnteny.value === "") {
      udelejToast("Vyplň název bodu a výšku antény.")
    } else {
      // Generovani nazvu souboru
      let str = ""
      str += datum
        .getFullYear()
        .toString()
        .slice(2)

      str +=
        datum.getMonth() + 1 < 10
          ? "0" + (datum.getMonth() + 1).toString()
          : (datum.getMonth() + 1).toString()

      str +=
        datum.getDate() < 10
          ? "0" + datum.getDate().toString()
          : datum.getDate().toString()

      str += "_"
      str +=
        datum.getHours() < 10
          ? "0" + datum.getHours().toString()
          : datum.getHours().toString()
      str +=
        datum.getMinutes() < 10
          ? "0" + datum.getMinutes().toString()
          : datum.getMinutes().toString()
      str +=
        datum.getSeconds() < 10
          ? "0" + datum.getSeconds().toString()
          : datum.getSeconds().toString()
      str += "_"
      str += MERnazevBodu.value
      // mozna pridat i vysku anteny do nazvu

      // spusteni normalniho mereni
      zacniMerit()
      // potvrzeni logovani raw dat + vyplneni nazvu souboru
      UBX = {
        bool: true,
        nazevZakazky: naZakazky,
        nazevSouboru: str,
        RAW: new Uint8Array()
      }
    }
  } else {
    udelejToast("Gnss přijimač není připojen..", 500)
  }
}

function zobrazInfoMereni() {
  if (gnnsPripojeno && window.location.hash === "#mereni") {
    MERzemSirka.innerText = DATA.GGA.LAT + "°"
    MERlatP.innerText = "(" + DATA.GST.DEVlat + " m)"
    MERzemDelka.innerText = DATA.GGA.LON + "°"
    MERlonP.innerText = "(" + DATA.GST.DEVlon + " m)"
    MERvyska.innerText = DATA.GGA.ALT + " m"
    MERaltP.innerText = "(" + DATA.GST.DEValt + " m)"
    MERpdop.innerText = DATA.GSA.PDOP
  } else {
    clearInterval(intInfoMereni)
  }
}

function delkaMereniSTR(vteriny) {
  //
  let hodiny = Math.floor(vteriny / 3600)
  let minuty = Math.floor((vteriny - hodiny * 3600) / 60)
  let sec = vteriny - hodiny * 3600 - minuty * 60

  let str = ""
  str += hodiny + ":"
  str += minuty < 10 ? "0" + minuty : minuty
  str += ":"
  str += sec < 10 ? "0" + sec : sec

  return str
}
