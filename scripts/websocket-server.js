const WebSocket = require("ws")
const http = require("http")

const server = http.createServer()
const wss = new WebSocket.Server({ server })

// 연결된 클라이언트들 관리
const clients = new Map()
const pendingEvaluations = []
const completedEvaluations = []

wss.on("connection", (ws, req) => {
  const clientId = generateClientId()
  clients.set(clientId, { ws, userType: null, userId: null })

  console.log(`클라이언트 연결: ${clientId}`)

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString())
      handleMessage(clientId, data)
    } catch (error) {
      console.error("메시지 파싱 오류:", error)
    }
  })

  ws.on("close", () => {
    clients.delete(clientId)
    console.log(`클라이언트 연결 해제: ${clientId}`)
    broadcastOnlineUsers()
  })

  ws.on("error", (error) => {
    console.error("WebSocket 오류:", error)
  })
})

function handleMessage(clientId, data) {
  const client = clients.get(clientId)
  if (!client) return

  switch (data.type) {
    case "USER_LOGIN":
      client.userType = data.payload.userType
      client.userId = data.payload.userId
      broadcastOnlineUsers()
      break

    case "NEW_RECORDING_SUBMITTED":
      pendingEvaluations.push(data.payload)
      broadcast(
        {
          type: "PENDING_EVALUATIONS_UPDATE",
          payload: pendingEvaluations,
        },
        "evaluator",
      )
      break

    case "EVALUATION_COMPLETED":
      const evaluationIndex = pendingEvaluations.findIndex((item) => item.id === data.payload.id)
      if (evaluationIndex !== -1) {
        const evaluation = pendingEvaluations.splice(evaluationIndex, 1)[0]
        completedEvaluations.push({ ...evaluation, ...data.payload })

        broadcast(
          {
            type: "PENDING_EVALUATIONS_UPDATE",
            payload: pendingEvaluations,
          },
          "evaluator",
        )

        broadcast(
          {
            type: "COMPLETED_EVALUATIONS_UPDATE",
            payload: completedEvaluations,
          },
          "admin",
        )
      }
      break

    case "REQUEST_CURRENT_DATA":
      client.ws.send(
        JSON.stringify({
          type: "PENDING_EVALUATIONS_UPDATE",
          payload: pendingEvaluations,
        }),
      )
      client.ws.send(
        JSON.stringify({
          type: "COMPLETED_EVALUATIONS_UPDATE",
          payload: completedEvaluations,
        }),
      )
      break
  }
}

function broadcast(message, targetUserType = null) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!targetUserType || client.userType === targetUserType) {
        client.ws.send(JSON.stringify(message))
      }
    }
  })
}

function broadcastOnlineUsers() {
  const onlineUsers = Array.from(clients.values())
    .filter((client) => client.userId)
    .map((client) => ({
      userId: client.userId,
      userType: client.userType,
    }))

  broadcast({
    type: "ONLINE_USERS_UPDATE",
    payload: onlineUsers,
  })
}

function generateClientId() {
  return Math.random().toString(36).substring(2, 15)
}

const PORT = process.env.WS_PORT || 3001
server.listen(PORT, () => {
  console.log(`WebSocket 서버가 포트 ${PORT}에서 실행 중입니다.`)
})
