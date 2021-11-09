# Game API

Game : Game API

### Tech

- [node.js] - Node.js is a platform built on Google Chrome’s JavaScript Engine (V8 Engine) for easily building fast and scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.
- [Express] - fast node.js network app framework

### Installation

- Run `yarn install`
- Create `.env` file by cloning `.env.example` from app/conf folder

### Commands

- `yarn start` Starts the server in port 3000 ( its a default port )
- `yarn migration` Run sequelize migration

### API Details

### Sign up/Sign in

### POST `/authenticate`
**Mandatory fields:** phone, email, and name

### Request body - application/json

```json
{
  "phone": "+86 1235555552",
  "email": "deepakgcsevpm@gmail.com",
  "name": "deepak",
  "score": 200
}
```

### Success Response

```json
{
  "status": 200,
  "message": "Login success",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZW1haWwiOiJkZWVwYWsuZ0BrcmRzLmNvbSIsInBob25lIjoiKzg2IDU1NTM0MzQzNDM0MzQifQ.BHnux6Tb7MiM5Qh3yI0YQQtvCYXCBYRwkXkKCnu8c0w",
  "user": {
    "id": 1,
    "email": "deepakgcsevpm@gmail.com",
    "phone": "+86 5553434343434"
  }
}
```

### Failure Response

```json
{
  "success": false,
  "message": "phone or email required"
}
```

### PROFILE

### GET PROFILE

### Success Response

```json
{
  "success": true,
  "id": 15,
  "name": "deepak",
  "email": "deepakgcsevpm+1@gmail.com",
  "phone": "123123"
}
```

### SAVE GAME

### POST `/save`

### Request body - application/json

```json
{
  "startTime": 1625567805074,
  "endTime": 1625567823010,
  "score": 200
}
```

### Success Response

```json
{
  "success": true,
  "status": 200,
  "message": "Game saved successfully",
  "score": 200
}
```

### LEADERBOARD

### GET `/leaderboard`

### Success Response

```json
{
  "success": true,
  "data": [
    {
      "user_id": 2,
      "name": "test",
      "highScore": 1020,
      "rank": 1,
      "isCurrentUser": true
    },
    {
      "user_id": 1,
      "name": "deepak",
      "highScore": 340,
      "rank": 2,
      "isCurrentUser": false
    },
    {
      "user_id": 4,
      "name": "deepak.g+1",
      "highScore": 300,
      "rank": 3,
      "isCurrentUser": false
    }
  ]
}
```

### Logout

### GET `/logout`

```javascript
{
  "message": "Logout success"
}
```

### Download overall report

### GET `/report/download?date=2021-10-19` (YYYY-MM-DD format)

### Basic Auth credentials

| User Name | Password |
| ------ | ------ |
| admin | password   |

### response

report.csv file will be downloaded
