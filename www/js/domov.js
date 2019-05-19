function aktualniDatum() {
  var ad = new Date()

  var datum =
    ad.getYear() -
    100 +
    2000 +
    "-" +
    (ad.getMonth() + 1 < 10 ? "0" + (ad.getMonth() + 1) : ad.getMonth() + 1) +
    "-" +
    (ad.getDate() < 10 ? "0" + ad.getDate() : ad.getDate())

  return datum
}

function eventyDomov() {
  var BTplus = document.getElementById("BTpridejZakazku")
  var BTzavri = document.getElementById("BTzavri")
  var BTexportMereni = document.getElementById("BTexportMereni")
  var BTzalozZakazku = document.getElementById("BTzalozZakazku")
  var BTvymazZakazku = document.getElementById("BTvymazZakazku")
  var BTzobrazUlozeneBody = document.getElementById("BTzobrazUlozeneBody")
  var BTimportBodu = document.getElementById("BTimportBodu")
  var Select = document.getElementById("seznamZakazek")

  var INPnazevZakazky = document.getElementById("INPnazevZakazky")
  var INPdatum = document.getElementById("INPdatum")
  var INPpopis = document.getElementById("INPpopis")

  var BTzavriBody = document.getElementById("BTzavriBody")

  // EVENTY
  BTplus.addEventListener("click", () => {
    document.getElementById("modalZakazka").style.display = "block"
  })

  BTzavri.addEventListener("click", () => {
    document.getElementById("modalZakazka").style.display = "none"
  })

  BTzalozZakazku.addEventListener("click", () => {
    if (INPnazevZakazky.value === "") {
      udelejToast("Vyplň název zakázky..", 500)
    } else {
      database.vytvorZakazku(
        INPnazevZakazky.value,
        INPdatum.value,
        INPpopis.value
      )

      INPnazevZakazky.value = ""
      INPdatum.value = aktualniDatum()
      INPpopis.value = ""

      database.seznamZakazek()

      document.getElementById("modalZakazka").style.display = "none"
    }
  })

  BTvymazZakazku.addEventListener("click", () => {
    let Select = document.getElementById("seznamZakazek")

    let odpoved = confirm(
      "Opravdu chcete vymazat zakázku - " +
        //naZakazky +
        Select.options[Select.selectedIndex].innerText +
        " ??"
    )

    if (odpoved) {
      database.vymazZakazku(Select.value)
      database.seznamZakazek()
      Select.selectedIndex = 0
      idZAKAZKY = Select.value
      domov()
    }
  })

  BTexportMereni.addEventListener("click", () => {
    database.exportujZakazku(idZAKAZKY)
  })

  BTimportBodu.addEventListener("click", () => {
    // Otevreni nativni aplikace, kde se vybere soubor, ktery obsahuje
    // seznam souradnic

    // link:
    //https://ourcodeworld.github.io/cordova/cordova-filebrowser.html
    window.OurCodeWorld.Filebrowser.filePicker.single({
      success: function(data) {
        if (!data.length) {
          // Zadny soubor neni vybran
          return
        }
        // Pole s cestou k souboru
        // data = ["file:///storage/emulated/0/CVUT_gnss/2/2_body.txt"]
        // extrahovani cesty k souboru
        // napr.  ["CVUT_gnss/2/2_body.txt"]
        importujMereni(data[0].slice(26))
      },
      error: function(err) {
        console.log(err)
      }
    })
  })

  Select.addEventListener("change", () => {
    console.log("Zvolena zakázka: " + Select.value)
    idZAKAZKY = Select.value
    database.nazevZakazky(idZAKAZKY)
    window.localStorage.setItem("zakazka", idZAKAZKY.toString())
    database.infoZakazka(Select.value)
  })

  BTzobrazUlozeneBody.addEventListener("click", () => {
    document.getElementById("modalBody").style.display = "block"

    database.nactiBodyZakazky(idZAKAZKY, seznamUlozenychBodu)
  })

  BTzavriBody.addEventListener("click", () => {
    document.getElementById("modalBody").style.display = "none"
    domov()
  })
  // NASTAVENI

  INPdatum.value = aktualniDatum()
}

function seznamUlozenychBodu(data) {
  let pocet = data.length
  let modalBodySeznam = document.getElementById("modalBodySeznam")
  let htmlSeznam = ""

  for (let i = 0; i < pocet; i++) {
    htmlSeznam +=
      '<div class="bod">' +
      '<div class="info">' +
      "<p><b>" +
      data[i].nazevBodu +
      "</b></p>" +
      "<p>Zem. šířka: " +
      Round(data[i].lat, 9) +
      "°</p>" +
      "<p>Zem. délka: " +
      Round(data[i].lon, 9) +
      "°</p>" +
      "<p>Výška : " +
      Round(data[i].alt, 4) +
      " m</p>" +
      "</div>" +
      '<button class="vymazBod" value="' +
      data[i].id +
      '"><img src="img/delete.svg" /></button></div>'
  }

  modalBodySeznam.innerHTML = htmlSeznam

  eventyVymazBod()
}

function eventyVymazBod() {
  let body = document.getElementsByClassName("vymazBod")

  for (var i = 0; i < body.length; i++) {
    body[i].addEventListener(
      "click",
      function() {
        vymazBod(this)
      },
      false
    )
  }
}

function vymazBod(tlac) {
  let rodic = tlac.parentNode
  let prarodic = rodic.parentNode

  if (confirm("Opravdu chcete vymazat bod ?")) {
    prarodic.removeChild(rodic)
    database.vymazBod(tlac.value)
  }
}

function Round(num, precision) {
  var val = 1
  for (var i = 0; i < precision; i++) {
    val = val * 10
  }
  return Math.round(num * val) / val
}
