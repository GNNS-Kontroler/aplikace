function eventyVytyceni() {
  let BTpodrobnosti = document.getElementById("BTpodrobnosti")
  let BTvytyceni = document.getElementById("BTvytyceni")
  let BTzavriBody = document.getElementById("BTzavriBody")
  let BTulozBod = document.getElementById("BTulozBod")

  BTpodrobnosti.addEventListener("click", () => {
    let podrobnosti = document.getElementById("podrobnosti")

    if (podrobnosti.style.display === "block") {
      podrobnosti.style.display = "none"
      BTpodrobnosti.innerText = "Zobraz podrobnosti"
    } else {
      podrobnosti.style.display = "block"
      BTpodrobnosti.innerText = "Skryj podrobnosti"
    }
  })

  // VYKRESLENI CANVAS
  let VYTcanvas = document.getElementById("VYTcanvas")
  let vyska = VYTcanvas.offsetHeight
  let sirka = VYTcanvas.offsetWidth
  let ctx = VYTcanvas.getContext("2d")

  // Dulezite nastavit sirku a vysku pomoci html atributu pro spravne
  // zobrazeni bez deformace
  VYTcanvas.setAttribute("width", sirka)
  VYTcanvas.setAttribute("height", vyska)

  pp(ctx, sirka, vyska)

  BTvytyceni.addEventListener("click", () => {
    document.getElementById("modalBody").style.display = "block"
    document.getElementById("BTulozBod").style.display = "none"

    database.nactiBodyZakazky(idZAKAZKY, seznamBoduVytyc)
  })

  BTzavriBody.addEventListener("click", () => {
    document.getElementById("modalBody").style.display = "none"
  })

  BTulozBod.addEventListener("click", () => {
    // Potvrzeni zda chci opravdu bod ulozit (zobrazeni rozdilu souř.) nebo
    // budu pokracovat v mereni
    let poziceStav = { lat: DATA.GGA.LAT, lon: DATA.GGA.LON, alt: DATA.GGA.ALT }
    let poziceVyt = { lat: BodVytyc.lat, lon: BodVytyc.lon, alt: BodVytyc.alt }

    // vypocet
    let azimut = geodesyAzimuth(poziceStav, poziceVyt)
    let delka = geodesyDistance(poziceStav, poziceVyt)

    let sj = zaokrouhli(delka * Math.cos((azimut * Math.PI) / 180), 3)
    let vz = zaokrouhli(delka * Math.sin((azimut * Math.PI) / 180), 3)

    let dlat = zaokrouhli(poziceVyt.lat - poziceStav.lat, 12)
    let dlon = zaokrouhli(poziceVyt.lon - poziceStav.lon, 12)
    let dalt = zaokrouhli(poziceVyt.alt - poziceStav.alt + vyskaAnteny, 4)
    if (
      confirm(
        "Opravdu chcete uložit bod??\n" +
          "dLat: " +
          dlat +
          "° (" +
          Math.abs(sj) +
          " m)\n" +
          "dLon: " +
          dlon +
          "° (" +
          Math.abs(vz) +
          " m)"
      )
    ) {
      document.getElementById("BTulozBod").style.display = "none"
      document.getElementById("VYTcisloBodu").innerText = "Vytyčení bodu: "

      document.getElementById("VYTvzdalBod").innerText = ""
      document.getElementById("VYTprevyseni").innerText = ""
      document.getElementById("VYTvzHodnota").innerText = ""
      document.getElementById("VYTsjHodnota").innerText = ""
      document.getElementById("VYThPresnost").innerText = ""
      document.getElementById("VYTvPresnost").innerText = ""
      document.getElementById("VYTsj").innerText = "Jdi na sever :"
      document.getElementById("VYTvz").innerText = "Jdi na západ :"

      // ukonceni vytycovani a ulozeni aktualni pozice a
      // presnosti vytyceni do databaze
      database.ulozBod(
        idZAKAZKY,
        BodVytyc.nazevBodu + "vyt",
        DATA.GGA.LAT,
        dlat,
        DATA.GGA.LON,
        dlon,
        DATA.GGA.ALT,
        dalt,
        DATA.GGA.SEP,
        vyskaAnteny,
        "vyt"
      )
      console.log("Bod byl uložen do databáze..")
      clearInterval(intVytyceni)
      pp()
    } else {
      console.log("Pokračuji v měření..")
    }
  })
}

function pp() {
  let VYTcanvas = document.getElementById("VYTcanvas")
  let vyska = VYTcanvas.offsetHeight
  let sirka = VYTcanvas.offsetWidth
  let ctx = VYTcanvas.getContext("2d")

  ctx.clearRect(0, 0, sirka, vyska)
  let maxPolomer = sirka < vyska ? sirka / 2 - 20 : vyska / 2 - 20

  ctx.save()
  //
  ctx.translate(sirka / 2, vyska / 2)
  // vykresleni okraje
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.lineWidth = 2
  ctx.arc(0, 0, maxPolomer, 0, 2 * Math.PI)
  ctx.stroke()
  // vykresleni vnitrniho kolecka
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.fillStyle = "black"
  ctx.lineWidth = 1
  ctx.arc(0, 0, 5, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()

  // obnoveni natoceni
  ctx.restore()
}

function zobrazAzimuth() {
  function onSuccess(heading) {
    let VYTcanvas = document.getElementById("VYTcanvas")
    let vyska = VYTcanvas.offsetHeight
    let sirka = VYTcanvas.offsetWidth
    let ctx = VYTcanvas.getContext("2d")
    sipka(ctx, sirka, vyska, heading.magneticHeading)
  }

  function onError(error) {
    console.log("CompassError: " + error.code)
  }

  navigator.compass.getCurrentHeading(onSuccess, onError)
}

function seznamBoduVytyc(data) {
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
      '<button class="vytycBod" value="' +
      data[i].id +
      '"><img src="img/pointer.svg"/></button></div>'
  }

  modalBodySeznam.innerHTML = htmlSeznam

  eventyVytycBod()
}

function eventyVytycBod() {
  let body = document.getElementsByClassName("vytycBod")

  for (var i = 0; i < body.length; i++) {
    body[i].addEventListener(
      "click",
      function() {
        vytycBod(this)
      },
      false
    )
  }
}

function vytycBod(tlac) {
  document.getElementById("BTulozBod").style.display = "block"
  document.getElementById("modalBody").style.display = "none"

  database.vytycBod(tlac.value, sour => {
    BodVytyc = sour
    document.getElementById("VYTcisloBodu").innerText =
      "Vytyčení bodu: " + BodVytyc.nazevBodu
    intVytyceni = setInterval(() => {
      vytycuj()
    }, 1000)
  })
}

function vytycuj() {
  if (window.location.hash != "#vytyceni") {
    clearInterval(intVytyceni)
    console.log("ukončeni vytyčování")
    return
  }

  let poziceStav = { lat: DATA.GGA.LAT, lon: DATA.GGA.LON, alt: DATA.GGA.ALT }
  let poziceVyt = { lat: BodVytyc.lat, lon: BodVytyc.lon, alt: BodVytyc.alt }

  // vypocet
  let azimut = geodesyAzimuth(poziceStav, poziceVyt)
  let delka = geodesyDistance(poziceStav, poziceVyt)
  let vyskaAnteny = parseFloat(uloziste.getItem("vyskaAnteny"))
  let prevyseni = zaokrouhli(poziceVyt.alt - poziceStav.alt + vyskaAnteny, 3)

  let sj, vz
  if (isNaN(azimut)) {
    sj = 0
    vz = 0
  } else {
    sj = delka * Math.cos((azimut * Math.PI) / 180)
    vz = delka * Math.sin((azimut * Math.PI) / 180)
  }

  // zobrazeni informaci
  document.getElementById("VYTvzdalBod").innerText = delka + " m"
  document.getElementById("VYTprevyseni").innerText = prevyseni + " m"
  document.getElementById("VYTvzHodnota").innerText =
    Math.abs(zaokrouhli(vz, 3)) + " m"
  document.getElementById("VYTsjHodnota").innerText =
    Math.abs(zaokrouhli(sj, 3)) + " m"
  document.getElementById("VYThPresnost").innerText =
    zaokrouhli(Math.sqrt(DATA.GST.DEVlat ** 2 + DATA.GST.DEVlon ** 2), 3) + " m"
  document.getElementById("VYTvPresnost").innerText =
    zaokrouhli(DATA.GST.DEValt, 3) + " m"

  if (sj > 0) {
    document.getElementById("VYTsj").innerText = "Jdi na sever :"
  } else {
    document.getElementById("VYTsj").innerText = "Jdi na jih :"
  }

  if (vz > 0) {
    document.getElementById("VYTvz").innerText = "Jdi na východ :"
  } else {
    document.getElementById("VYTvz").innerText = "Jdi na západ :"
  }

  // VYKRESLENI GRAFU
  delka < 3 ? graf1(sj, vz) : graf2(azimut)
}

function zaokrouhli(cislo, des) {
  return Math.round(cislo * 10 ** des) / 10 ** des
}

function graf1(sj, vz) {
  let VYTcanvas = document.getElementById("VYTcanvas")
  let vyska = VYTcanvas.offsetHeight
  let sirka = VYTcanvas.offsetWidth
  let ctx = VYTcanvas.getContext("2d")

  ctx.clearRect(0, 0, sirka, vyska)
  let maxPolomer = sirka < vyska ? sirka / 2 - 20 : vyska / 2 - 20

  ctx.save()
  //
  ctx.translate(sirka / 2, vyska / 2)
  // vykresleni vnejsi okraj => odpovida 3/0.5 m
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.lineWidth = 2
  ctx.arc(0, 0, maxPolomer, 0, 2 * Math.PI)
  ctx.stroke()
  // vykresleni vnitrni okraj => odpovida 1,5/0.25 m
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.lineWidth = 2
  ctx.arc(0, 0, maxPolomer / 2, 0, 2 * Math.PI)
  ctx.stroke()
  // cary
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(maxPolomer, 0)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, maxPolomer)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-maxPolomer, 0)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -maxPolomer)
  ctx.stroke()

  // popisky
  ctx.font = "12px Arial"
  ctx.fillStyle = "black"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("S", 0, maxPolomer + 10)
  ctx.fillText("E", maxPolomer + 10, 0)
  ctx.fillText("N", 0, -(maxPolomer + 10))
  ctx.fillText("W", -(maxPolomer + 10), 0)

  // vykresleni bodu
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.fillStyle = "red"
  ctx.lineWidth = 1
  ctx.arc(vz * (maxPolomer / 3), -sj * (maxPolomer / 3), 5, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.fill()

  // obnoveni natoceni
  ctx.restore()
}

function graf2(uhel) {
  let VYTcanvas = document.getElementById("VYTcanvas")
  let vyska = VYTcanvas.offsetHeight
  let sirka = VYTcanvas.offsetWidth
  let ctx = VYTcanvas.getContext("2d")

  ctx.clearRect(0, 0, sirka, vyska)
  let maxPolomer = sirka < vyska ? sirka / 2 - 20 : vyska / 2 - 20
  // ulozeni prechozi pozice a natoceni
  ctx.save()
  // vykresleni cervene sipky
  ctx.translate(sirka / 2, vyska / 2)
  ctx.rotate((uhel * Math.PI) / 180) //
  ctx.fillStyle = "red"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(15, 0)
  ctx.lineTo(0, -maxPolomer)
  ctx.lineTo(-15, 0)
  ctx.moveTo(0, 0)
  ctx.fill()
  // vykresleni okraje
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.lineWidth = 1
  ctx.arc(0, 0, maxPolomer, 0, 2 * Math.PI)
  ctx.stroke()
  // vykresleni vnitrniho kolecka
  ctx.beginPath()
  ctx.strokeStyle = "black"
  ctx.fillStyle = "black"
  ctx.lineWidth = 2
  ctx.arc(0, 0, 10, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()

  // obnoveni natoceni
  ctx.restore()

  // ulozeni prechozi pozice a natoceni
  ctx.save()
  // zobrazeni popisku
  ctx.translate(sirka / 2, vyska / 2)
  // popisky
  ctx.font = "12px Arial"
  ctx.fillStyle = "black"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("S", 0, maxPolomer + 10)
  ctx.fillText("E", maxPolomer + 10, 0)
  ctx.fillText("N", 0, -(maxPolomer + 10))
  ctx.fillText("W", -(maxPolomer + 10), 0)

  ctx.restore()
}
