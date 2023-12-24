import { useEffect, useState, useCallback } from "react"
import axios from 'axios'
import useRelativeTime from '@nkzw/use-relative-time';

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
  const [isAdding, setIsAdding] = useState(false)
  const [dates, setDates] = useState([])
  const [types, setTypes] = useState([])

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
    let newType = prompt("What type are scanning for?")

    if(!newType) {
      return
    }

    newType = newType.toLowerCase()

    localStorage.setItem("type", newType)
    setType(newType)
    window.location.reload()
  }

  const scan = async () => {
    if(!ndef) {
      addtoHistory("❌ Error! NFC not supported on this device.")
      errorAudio.currentTime = 0
      errorAudio.play()
      return
    }

    try {
      await ndef.scan();

      addtoHistory("✅ Success! Scan started successfully.");
      successAudio.currentTime = 0
      successAudio.play()
      setIsScanning(true)

      ndef.onreadingerror = (event) => {
        addtoHistory("❌ Error! Cannot read data from the NFC tag. Try another one?");
        errorAudio.currentTime = 0
        errorAudio.play()
      };

      ndef.onreading = (event) => {
        if(isAdding) {
          onWriting(event)
        } else {
          onReading(event)
        }
      };
    } catch (error) {
      addtoHistory(`❌ Error! Scan failed to start: ${error}.`);
      errorAudio.currentTime = 0
      errorAudio.play()
    }
  }

  const onWriting = async ({serialNumber}) => {
    serialNumber = convertSerial(serialNumber)
    console.log(serialNumber)

    const response = await axios("/cards", {
      method: "POST",
      data: {
        card_uid: serialNumber,
        dates,
        types,
        key: getApiKey(),
      }
    })

    if(response.data.error) {
      errorAudio.currentTime = 0
      errorAudio.play()
    }

    if(response.data.success) {
      successAudio.currentTime = 0
      successAudio.play()
    }

    console.log(response.data)

    if(response.data.data) {
      setHistory(response.data.data)
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
      errorAudio.currentTime = 0
      errorAudio.play()
    }

    if(response.data.success) {
      successAudio.currentTime = 0
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

  const handleNewDate = (e) => {
    if(e.target.value) {
      const newDates = [...dates]
      newDates.push(e.target.value)
      setDates(newDates)
      e.target.value = null
    }
  }

  const removeDate = (index) => {
    const newDates = [...dates]
    newDates.splice(index, 1)
    setDates(newDates)
  }

  const handleNewType = (e) => {
    if(e.target.value) {
      const newTypes = [...types]
      newTypes.push(e.target.value.toLowerCase())
      setTypes(newTypes)
      e.target.value = null
    }
  }

  const removeType = (index) => {
    const newTypes = [...types]
    newTypes.splice(index, 1)
    setTypes(newTypes)
  }

  const handleTypeEnter = (e) => {
    const keyCode = e.keyCode
    if (keyCode === 13) {
      handleNewType(e)
    }
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

            <button onClick={() => { setIsAdding(true) }} className="btn btn-secondary mx-2" disabled={isAdding}>
              Add Cards
            </button>

            <button onClick={handleSetType} className="btn btn-secondary mx-2">
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

      {isAdding &&
        <div className="row">
          <div className="col">
            <h5>Add Cards</h5>

              <p>Date(s)</p>
              <ul className="list-group">
                {
                  dates.map((el, index) => {
                    return (
                      <li className="list-group-item" key={index}>
                        {el}
                        <a onClick={() => removeDate(index)}>
                          ❌
                        </a>
                      </li>
                    )
                  })
                }
                <li className="list-group-item">
                  <input type="date" onChange={handleNewDate} />
                </li>
              </ul>


              <p>Type(s)</p>
              <ul className="list-group">
                {
                  types.map((el, index) => {
                    return (
                      <li className="list-group-item" key={index}>
                        {el}
                        <a onClick={() => removeType(index)}>
                          ❌
                        </a>
                      </li>
                    )
                  })
                }
                <li className="list-group-item">
                  <input type="text" onKeyDown={handleTypeEnter} onBlur={handleNewType} />
                </li>
              </ul>

          </div>
        </div>
      }

      <div className="row">
        <div className="col">
          <h5>Event History</h5>

          {history &&
            <ul className="list-group">
              {
                history.map((el) => {
                  return (
                    <EventHistoryItem
                      el={el}
                      key={el.id} />
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

function EventHistoryItem({el}) {
  const timeAgo = useRelativeTime(new Date(el.created_at).getTime() + 'Z');

  return (
    <li className="list-group-item">
      {el.message}
      <span className="text-end" style={{fontSize: 8}}>
        {timeAgo}
      </span>
    </li>
  )

}

export default App;