function zdrojovaTabulka(adresa, port) {
  let ODPOVED = ""
  if (navigator.connection.type === "none") {
    udelejToast("Připojení k internetu není k dispozici.", 500)
  } else {
    client.open(adresa, port, function() {
      var dataString =
        "GET / HTTP/1.0\r\n" +
        "Host: " +
        adresa +
        "\r\n" +
        "User-Agent: NTRIPClient for Arduino v1.0\r\n" +
        "Connection: close\r\n\r\n"

      var data = new Uint8Array(dataString.length)
      for (var i = 0; i < data.length; i++) {
        data[i] = dataString.charCodeAt(i)
      }

      client.write(
        data,
        () => {
          console.log("poslano..")
        },
        message => {
          console.log("Err: " + JSON.stringify(message))
        }
      )
    })

    client.onData = function(data) {
      let str = ""

      data.forEach(el => {
        str += String.fromCharCode(el)
      })

      ODPOVED += str
    }

    client.onError = function(errorMessage) {
      // zavola se pokud probehne najaka chyba v prubehu komunikace
      console.log(errorMessage)
    }
    client.onClose = function(hasError) {
      // zavola se po ukonceni spojeni
      vysledkyTabulky(ODPOVED.split("\n"))
    }
  }
}

function NTRIPClient(adresa, port, mountpoint, virtual, uzivatel, heslo) {
  if (navigator.connection.type === "none") {
    udelejToast("Připojení k internetu není k dispozici.", 500)
  } else {
    client.open(adresa, port, function() {
      var dataString =
        "GET / " +
        mountpoint +
        " HTTP/1.0\r\n" +
        "Host: " +
        adresa +
        "\r\n" +
        "User-Agent: NTRIPClient for Arduino v1.0\r\n" +
        "Authorization: Basic " +
        utf8_to_b64(uzivatel + ":" + heslo) +
        "\r\n\r\n"
      // podminka : pokud je potreba poslat aktualni pozici --> lastGGA
      if (virtual) {
        dataString += lastGGA
        dataString += "\r\n"
        // zaslani zpresnene polohy s casovym odstupem
        ntripInt = setInterval(() => {
          let dataStringNew = lastGGA + "\r\n"

          var dataNew = new Uint8Array(dataStringNew.length)
          for (var i = 0; i < dataNew.length; i++) {
            dataNew[i] = dataStringNew.charCodeAt(i)
          }

          client.write(
            dataNew,
            () => {
              console.log("Aktuální poloha zaslána..")
            },
            message => {
              console.log("Err: " + JSON.stringify(message))
            }
          )
        }, 15000)
      }

      var data = new Uint8Array(dataString.length)
      for (var i = 0; i < data.length; i++) {
        data[i] = dataString.charCodeAt(i)
      }

      client.write(
        data,
        () => {
          console.log("poslano..")
        },
        message => {
          console.log("Err: " + JSON.stringify(message))
        }
      )
    })

    client.onData = function(data) {
      let str = ""

      data.forEach(el => {
        str += String.fromCharCode(el)
      })
      // poslani korekcnich dat pres BT
      bluetoothSerial.write(data)
      NTRIPcon.pripojeno = true
    }

    client.onError = function(errorMessage) {
      // Vypis chybove hlasky
      console.log(errorMessage)
      NTRIPcon.pripojeno = false
    }
    client.onClose = function(hasError) {
      // Vypis po ukonceni komunikace

      console.log("Byl error? :" + hasError)
      NTRIPcon.pripojeno = false
      clearInterval(ntripInt)
    }
  }
}

function stringFromArray(data) {
  var count = data.length
  var str = ""

  for (var index = 0; index < count; index += 1)
    str += String.fromCharCode(data[index])

  return str
}

function vysledkyTabulky(tabulka) {
  let delka = tabulka.length
  let str = ""
  NTRIPcon.ZDtabulka = []
  let k = 0

  for (let i = 0; i < delka; i++) {
    if (tabulka[i].slice(0, 3) === "STR") {
      if (k == 0) {
        k = i
      }
      let mntp = tabulka[i].split(";")
      //
      str += '<option value="' + (i - k) + '">' + mntp[1] + "</option>"
      // ulozeni do globalni promene
      NTRIPcon.ZDtabulka.push(mntp)
    }
  }

  // vyplneni select MountPointu
  document.getElementById("mount_seznam").innerHTML = str
  // zobrazeni podrobnosti o zvolenem MountPointu
  podrobnostiMNTP()
}

// kodovani base64
function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)))
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)))
}
