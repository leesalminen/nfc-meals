  import { useEffect, useState, useCallback } from "react"
  import axios from 'axios'
  
  const abortController = new AbortController()

  const errorAudio = new Audio('error.mp3');
  const successAudio = new Audio('success.mp3')

  const getNdef = () => {
    if("NDEFReader" in window) {
      return new window.NDEFReader({ signal: abortController.signal })
    }

    return false
  }

  function App() {
    const [history, setHistory] = useState([])
    const [isScanning, setIsScanning] = useState(false)
    const [ndef, setNdef] = useState(getNdef())
    const [type, setType] = useState(localStorage.getItem("type"))

    useEffect(() => {
      if(ndef) {
        // scan()
        getHistory()
      }
    }, []);

    async function addtoHistory(message) {
      const response = await axios("/events", {
        method: "POST",
        data: {
         message,
         key: getApiKey(),
        },
      })
    
      setHistory(response.data.data)
    }

    async function getHistory() {
      const response = await axios(`/events?key=${getApiKey()}`)
      setHistory(response.data.data)
    }

    const handleSetType = () => {
      let type = prompt("What type are scanning for?")

      if(!type) {
        return
      }

      type = type.toLowerCase()

      localStorage.setItem("type", type)
      setType(type)
    }

    const scan = async () => {
      if(!ndef) {
        addtoHistory("❌ Error! NFC not supported on this device.")
        errorAudio.play()
        return
      }

      try {
        await ndef.scan();

        addtoHistory("✅ Success! Scan started successfully.");
        successAudio.play()
        setIsScanning(true)

        ndef.onreadingerror = (event) => {
          addtoHistory("❌ Error! Cannot read data from the NFC tag. Try another one?");
          errorAudio.play()
        };

        ndef.onreading = (event) => {
          onReading(event); //Find function below
        };
      } catch (error) {
        addtoHistory(`❌ Error! Scan failed to start: ${error}.`);
        errorAudio.play()
      }
    }

    const onReading = async ({serialNumber}) => {
      serialNumber = convertSerial(serialNumber)
      console.log(serialNumber)

      const response = await axios("/scan", {
        method: "POST",
        data: {
          serialNumber,
          date: new Date().toISOString(),
          type,
          key: getApiKey(),
        }
      })

      if(response.data.data) {
        setHistory(response.data.data)
      }

      if(response.data.error) {
        errorAudio.play()
      }

      if(response.data.success) {
        successAudio.play()
      }

    }

    const convertSerial = (serialNumber) => {
      return serialNumber.toUpperCase().replaceAll(":", "")
    }

    const getApiKey = () => {
      const params = (new URL(document.location)).searchParams;
      const key = params.get("key");

      if(key && key.length > 0) {
        return key
      }

      return ""
    }

    if(!ndef) {
      return (
        <div className="container">
          <div className="row">
            <div className="col">
              <div className="alert alert-danger">
                NFC not supported on this device.
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container">
        
        <div className="row">
          <div className="col">
            <h3>NFC Meals</h3>
          </div>
        </div>

        <div className="row">
          <div className="col">
            <h5>Scan NFC</h5>

              {!isScanning && !type && 
                <div className="alert alert-success">
                  <b>Click Set Type to get started...</b>
                </div>
              }


              {!isScanning && type && 
                <div className="alert alert-success">
                  <b>Click Start Scanning to get started...</b>
                </div>
              }

              <button onClick={handleSetType} className="btn btn-primary mx-2">
                Set Type
              </button>
              
              {type &&
                <button onClick={scan} className="btn btn-primary mx-2" disabled={isScanning}>
                  {isScanning && <span>Scanning...</span>}
                  {!isScanning && <span>Start Scanning</span>}
                </button>
              }


          </div>
        </div>

        <hr />


        <div className="row">
          <div className="col">
            <h5>Event History</h5>

            {history &&
              <ul className="list-group">
                {
                  history.map((el) => {
                    return (
                      <li key={el.id} className="list-group-item">
                        {el.message}
                      </li>
                    )
                  })
                }
              </ul>
            }


          </div>
        </div>

      </div>
    );
  }

  export default App;