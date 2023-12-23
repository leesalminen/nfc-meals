import express from "express"
import compression from 'compression'
import bodyParser from 'body-parser'
import cors from 'cors'
import * as dotenv from 'dotenv'
import axios from 'axios'
import serveStatic from 'serve-static'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

dotenv.config()

const port = process.env.port
const api_key = process.env.api_key
const db_location = process.env.db_location

const corsOptions = {
  origin: process.env.NODE_ENV !== "production" ? 'http://localhost:3001' : 'https://nfc.str.cr',
}

// connect to the db
const db = await open({
  filename: db_location,
  driver: sqlite3.Database
})

db.run("PRAGMA journal_mode=WAL;")

const app = express()

app.use(bodyParser.json())
app.use(compression())
app.use(cors(corsOptions))
app.use(async (req, res, next) => {
  if(req.path === '/' || req.path === '/events' || req.path === '/scan') {
    const key = req.query.key || req.body.key

    if(key !== api_key) {
      return res.sendStatus(401)
    }
  }

  next()
})
app.use(serveStatic('front_end/build', { 'index': ['index.html'] }))

app.get('/events', async (req, res) => {
  const events = await getEvents(db)

  return res.send({success: true, data: events})
})

app.post('/events', async (req, res) => {
  const message = req.body.message

  if(!message) {
    return await returnError(db, res, "message required")
  }

  await createEvent(db, message)

  const events = await getEvents(db)

  return res.send({success: true, data: events})
})

app.post('/scan', async (req, res) => {
  const serialNumber = req.body.serialNumber
  const date         = convertTZ(req.body.date, -6)
  const type         = req.body.type

  if(!serialNumber) {
    return await returnError(db, res, "serial number required")
  }

  if(!date) {
    return await returnError(db, res, "date required")
  }

  if(!type) {
    return await returnError(db, res, "type required")
  }

  const card = await getCard(db, serialNumber)

  if(!card) {
    return await returnError(db, res, `card ${serialNumber} not found`)
  }

  const allowance = await getAllowance(db, card.id, date, type)

  if(!allowance) {
    return await returnError(db, res, `card ${serialNumber} does not have allowance for ${type} on ${date}`)
  }

  const usage = await getUsage(db, allowance.id)

  if(usage) {
    return await returnError(db, res, `card ${serialNumber} already used ${type} on ${date} at ${usage.created_at}`)
  }

  await createUsage(db, allowance.id)
  await createEvent(db, `✅ Success! Used ${type} on ${date} for ${serialNumber}`)

  const events = await getEvents(db)

  return res.send({success: true, data: events})
})

const convertTZ = (date, offset) => {
  const dateObj = new Date(date)
  dateObj.setHours(dateObj.getHours() + offset)
  const dateStr = dateObj.toISOString().split('T')[0]
  return dateStr
}

const returnError = async (db, res, message) => {
  message = `❌ Error! ${message}`
  await createEvent(db, message)
  const events = await getEvents(db)
  return res.send({error: true, message, data: events})
}

const getEvents = async (db) => {
  try {
    return await db.all(
      "SELECT * FROM events ORDER BY id DESC LIMIT 100",
    )
  } catch {
    return false
  }
}

const createEvent = async (db, message) => {
  try {
    return await db.run(
      "INSERT INTO events (message) VALUES (?)",
      [
        message,
      ]
    )
  } catch {
    return false
  }
}

const getCard = async (db, serialNumber) => {
  try {
    return await db.get(
      "SELECT * FROM cards WHERE card_uid = ?",
      [
        serialNumber,
      ]
    )
  } catch {
    return false
  }
}

const createUsage = async (db, card_allowance_id) => {
  try {
    return await db.run(
      "INSERT INTO usages (card_allowance_id) VALUES (?)",
      [
        card_allowance_id,
      ]
    )
  } catch {
    return false
  }
}


const getUsage = async (db, allowanceId) => {
  try {
    return await db.get(
      "SELECT * FROM usages WHERE card_allowance_id = ?",
      [
        allowanceId,
      ]
    )
  } catch {
    return false
  }
}

const getAllowance = async (db, cardId, date, type) => {
  try {
    return await db.get(
      "SELECT * FROM card_allowances WHERE card_id = ? AND allowance_date = ? AND type = ?",
      [
        cardId,
        date,
        type,
      ]
    )
  } catch {
    return false
  }
}

const server = app.listen(port, () => console.log("Listening on port", port))
server.setTimeout(1000 * 60 * 9)