function SSOubor(name) {
  window.requestFileSystem(
    LocalFileSystem.PERSISTENT,
    0,
    function(fs) {
      console.log(fs)
      console.log("file system open: " + fs.name)
      fs.root.getFile(
        name + ".txt",
        { create: true, exclusive: false },
        function(fileEntry) {},
        onError
      )
    },
    onError
  )
}

function importujMereni(filePath) {
  // funkce otevre soubor se seznamem bodů pro import
  // format dat: [| cislo bodu | lat | lon | alt |]
  window.requestFileSystem(
    LocalFileSystem.PERSISTENT,
    0,
    function(fs) {
      fs.root.getFile(
        filePath,
        {},
        function(fileEntry) {
          // Vytvori se objekt predstavujici soubor,
          // ktery se nasledne precte pomoci FileReader.

          fileEntry.file(function(file) {
            var reader = new FileReader()

            reader.onloadend = function(e) {
              //console.log(this.result)
              rozdeleniDat(this.result)
            }
            reader.readAsText(file)
          }, onError)
        },
        onError
      )
    },
    onError
  )
}

function exportujMereni(jmenoZakazky, info) {
  window.requestFileSystem(
    LocalFileSystem.PERSISTENT,
    0,
    function(fs) {
      fs.root.getDirectory(
        "GNSS_Kontroler",
        { create: true, exclusive: false },
        function(subDirEntry) {
          // Vytvoreni slozky GNSS_Kontroler, kde se ukladaji jednotlive podslozky zakazek
          subDirEntry.getDirectory(
            jmenoZakazky,
            { create: true },
            // Vytvoreni slozky zakazky
            function(subDirEntry) {
              // Vytvoreni souboru body
              subDirEntry.getFile(
                jmenoZakazky + "_body.txt",
                { create: true, exclusive: false },
                function(fileEntry) {
                  // Zapis informaci do souboru,

                  fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function(e) {
                      console.log("Export měření proběhl v pořádku.")
                    }

                    fileWriter.onerror = function(e) {
                      console.log("Export měření selhal: " + e.toString())
                    }

                    // Novy blob - vlozeni naseho textu
                    /* var blob = new Blob(info, { type: "text/plain" }) */
                    fileWriter.write(info)
                    udelejToast("Měření exportováno...", 500)
                  }, onError)
                },
                onError
              )
            },
            onError
          )
        },
        onError
      )
    },
    onError
  )
}

function onError(e) {
  console.log(e)
}

function rozdeleniDat(txt) {
  let roz1 = txt.split("\n")
  let pocet = roz1.length
  let vysledek = {}

  for (let i = 0; i < pocet; i++) {
    vysledek[i] = roz1[i].split(",")
  }

  importDat(vysledek)
}

function ulozRawData(jmenoZakazky, nazevSoubor, data) {
  window.requestFileSystem(
    LocalFileSystem.PERSISTENT,
    0,
    function(fs) {
      fs.root.getDirectory(
        "GNSS_Kontroler",
        { create: true, exclusive: false },
        function(subDirEntry) {
          // Vytvoreni slozky GNSS_Kontroler, kde se ukladaji jednotlive podslozky zakazek
          subDirEntry.getDirectory(
            jmenoZakazky,
            { create: true },
            // Vytvoreni slozky zakazky
            function(subDirEntry) {
              // Vytvoreni souboru body
              subDirEntry.getFile(
                nazevSoubor + ".ubx",
                { create: true, exclusive: false },
                function(fileEntry) {
                  // Zapis informaci do souboru,

                  fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function(e) {
                      console.log("Data zapsána...")
                    }

                    fileWriter.onerror = function(e) {
                      console.log("Export měření selhal: " + e.toString())
                    }
                    // presun kurzoru na konec souboru
                    fileWriter.seek(fileWriter.length)
                    // zapis dat

                    fileWriter.write(data)
                  }, onError)
                },
                onError
              )
            },
            onError
          )
        },
        onError
      )
    },
    onError
  )
}
