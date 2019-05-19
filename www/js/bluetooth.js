var zarizeni = {
  class: [],
  id: [],
  address: [],
  name: []
}

zz = []

var strZarizeni

function BLEzobrazSparovanaZarizeni() {
  bluetoothSerial.list(
    function(devices) {
      let SELble = document.getElementById("ble_seznam")
      let BTbleHledej = document.getElementById("ble_hledej")
      let pocet = devices.length
      let html = ""

      if (pocet > 0) {
        for (let i = 0; i < pocet; i++) {
          html += "<option value="
          html += devices[i]["address"]
          html += ">"
          html += devices[i].hasOwnProperty("name")
            ? devices[i]["name"]
            : devices[i]["id"]
          html += "</option>"
        }

        SELble.innerHTML = html
        BTbleHledej.className = ""
      }
    },
    function(er) {
      alert(er)
    }
  )
}

function BLEzobrazNEsparovanaZarizeni() {
  bluetoothSerial.discoverUnpaired(
    function(devices) {
      let SELble = document.getElementById("ble_seznam")
      let BTbleHledej = document.getElementById("ble_hledej")
      let pocet = devices.length
      let html = ""

      if (pocet > 0) {
        for (let i = 0; i < pocet; i++) {
          html += "<option value="
          html += devices[i]["address"]
          html += ">"
          html += devices[i].hasOwnProperty("name")
            ? devices[i]["name"]
            : devices[i]["id"]
          html += "</option>"
        }
        SELble.innerHTML = html
      }
      BTbleHledej.className = ""
      udelejToast("Počet nalezených zařízení: " + pocet, 500)
    },
    function(er) {
      alert(er)
    }
  )
}

function BLEpripojZarizeni(adresa) {
  bluetoothSerial.connect(
    adresa,
    function() {
      console.log("Zařízení připojeno..")
      gnnsPripojeno = true
      INFble.src = "img/ble_connected.svg"
      udelejToast("Zařízení připojeno..", 500)
    },
    function() {
      console.log("Zařízení se nepodařilo připojit..")
      gnnsPripojeno = false
      INFble.src = "img/ble_disconnected.svg"
      udelejToast("Zařízení se nepodařilo připojit..", 500)
    }
  )
}

function dostupnaBleZarizeni() {
  var zarList = []

  bluetoothSerial.list(
    function(devices) {
      var countDevices = devices.length
      var counter = 1

      devices.forEach(function(device) {
        zarList.push(device)
        counter++
        if (counter > countDevices) {
          var BTbleHledej = document.getElementById("ble_hledej")
          BTbleHledej.className = ""
        }
      })
    },
    function(er) {
      alert(er)
    }
  )
  return zarList
}
