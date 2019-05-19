function SKY() {
  if (location.hash === "#skyplot") {
    vykresliSkyplot(maxPolomer, sirka, vyska)
    vykresliPopisky(maxPolomer, sirka, vyska)
    vykresliSatelity(DRUZICE.GL, maxPolomer, sirka, vyska, 0)
    vykresliSatelity(DRUZICE.GP, maxPolomer, sirka, vyska, 1)
    vyplnTabulku()
  } else {
    clearInterval(sky)
  }
}

function vytvorSkyplot() {
  var plocha = document.getElementById("plocha")
  var canvas = document.createElement("canvas")
  var tabulka = document.createElement("table")
  var hr = document.createElement("hr")

  var sirka = plocha.offsetWidth
  var vyska = plocha.offsetHeight

  canvas.setAttribute("id", "skyPlot")
  canvas.setAttribute("class", "skyplot")
  canvas.setAttribute("width", sirka)
  canvas.setAttribute("height", vyska)
  tabulka.setAttribute("id", "skyTable")
  tabulka.setAttribute("class", "tableSat")
  tabulka.setAttribute("align", "center")
  plocha.appendChild(canvas)
  plocha.appendChild(hr)
  plocha.appendChild(tabulka)

  // urceni maximalni polomeru Skyplotu
  var maxPolomer = sirka < vyska ? sirka / 2 - 15 : vyska / 2 - 15

  var ctx = canvas.getContext("2d")

  return [maxPolomer, sirka, vyska, ctx, canvas]
}

function vykresliSatelity(objekt, maxPolomer, sirka, vyska, typ) {
  // vyhledani aktivnich satelitu v GSA zprave
  var aktivniSatelity = []

  DATA.GSA.GP.forEach(sat => aktivniSatelity.push(sat))
  DATA.GSA.GL.forEach(sat => aktivniSatelity.push(sat))

  objekt.forEach(el => {
    // kazdy el (element) ma tyto parametry :
    // id : identifikacni cislo satelitu
    // elevationDeg: elevace druzice
    // azimuthTrue: azimut druzice
    // SNRdB: kvalita signalu druzice (Signal Noice Ratio)

    // vzdalenost druzice od stredu skyplotu - uvazujeme linearni vztah
    var R = maxPolomer * (1 - el.elevationDeg / 90)
    var pozSatX = sirka / 2 + R * Math.cos(toRad(el.azimuthTrue - 90))
    var pozSatY = vyska / 2 + R * Math.sin(toRad(el.azimuthTrue - 90))

    if (typ == 0) {
      ctx.beginPath()
      ctx.strokeStyle = "black"
      ctx.fillStyle = aktivniSatelity.includes(parseInt(el.id))
        ? "green"
        : "red"

      ctx.lineWidth = 1
      ctx.arc(pozSatX, pozSatY, maxPolomer / 15, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    } else {
      var diff = maxPolomer / 8
      ctx.beginPath()
      ctx.strokeStyle = "black"
      ctx.fillStyle = aktivniSatelity.includes(parseInt(el.id))
        ? "green"
        : "red"
      ctx.lineWidth = 1
      ctx.rect(pozSatX - diff / 2, pozSatY - diff / 2, diff, diff)
      ctx.fill()
      ctx.stroke()
    }

    ctx.font = "12px Arial"
    ctx.fillStyle = "black"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(el.id, pozSatX, pozSatY + 2)
  })
}

function vykresliSkyplot(maxPolomer, sirka, vyska) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  var barva1 = "rgb(221, 221, 211)"
  var barva2 = "rgb(99, 99, 99)"

  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.fillStyle = i % 2 ? barva1 : barva2
    ctx.arc(sirka / 2, vyska / 2, maxPolomer * ((6 - i) / 6), 0, 2 * Math.PI)
    ctx.fill()
  }

  ctx.translate(sirka / 2, vyska / 2)

  for (let uhel = 0; uhel < 360; uhel += 45) {
    var uuhel = uhel * (Math.PI / 180)

    ctx.beginPath()
    ctx.strokeStyle = "black"
    ctx.moveTo(0, 0)
    ctx.lineTo(maxPolomer * Math.sin(uuhel), maxPolomer * Math.cos(uuhel))
    ctx.stroke()
  }
  ctx.translate(-(sirka / 2), -(vyska / 2))
}

function vykresliPopisky(maxPolomer, sirka, vyska) {
  var elev = ["75°", "60°", "45°", "30°", "15°"]
  var azim = ["N", "45°", "E", "135°", "S", "225°", "W", "315°"]

  for (let j = 0; j < 8; j++) {
    var xx =
      sirka / 2 +
      (maxPolomer + (j % 2 ? 15 : 10)) * Math.cos(toRad(j * 45 - 90))
    var yy =
      vyska / 2 +
      (maxPolomer + (j % 2 ? 15 : 10)) * Math.sin(toRad(j * 45 - 90))

    ctx.font = "12px Arial"
    ctx.fillStyle = "black"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(azim[j], xx, yy)
  }
}

function vyplnTabulku() {
  let str = ""
  str +=
    "<tr><th>Typ</th><th>ID</th><th>Elev. [°]</th><th>Azimut [°]</th><th>SNR [dB]</th></tr>"

  for (let i = 0; i < DRUZICE.GP.length; i++) {
    str += "<tr><td>GP</td><td>"
    str += DRUZICE.GP[i]["id"]
    str += "</td><td>"
    str += DRUZICE.GP[i]["elevationDeg"]
    str += "</td><td>"
    str += DRUZICE.GP[i]["azimuthTrue"]
    str += "</td><td>"
    str += DRUZICE.GP[i]["SNRdB"]
    str += "</td></tr>"
  }

  for (let j = 0; j < DRUZICE.GL.length; j++) {
    str += "<tr><td>GL</td><td>"
    str += DRUZICE.GL[j]["id"]
    str += "</td><td>"
    str += DRUZICE.GL[j]["elevationDeg"]
    str += "</td><td>"
    str += DRUZICE.GL[j]["azimuthTrue"]
    str += "</td><td>"
    str += DRUZICE.GL[j]["SNRdB"]
    str += "</td></tr>"
  }

  document.getElementById("skyTable").innerHTML = str
}

function toRad(uhel) {
  // funkce prevadi stupne na radiany
  return uhel * (Math.PI / 180)
}

function toDeg(uhel) {
  // funkce prevadi radiany na stupne
  return uhel * (180 / Math.PI)
}
