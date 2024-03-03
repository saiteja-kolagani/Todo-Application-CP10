var format = require('date-fns/format')
var isValid = require('date-fns/isValid')
const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const {parseISO} = require('date-fns')
app.use(express.json())
let db = null
const dbPath = path.join(__dirname, 'todoApplication.db')

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

initializeDBAndServer()

//Middleware Function For Body
const bodyCheck = async (request, response, next) => {
  const {priority, status, category, dueDate, todo} = request.body
  if (todo !== '') {
    request.todo = todo
  } else {
    response.status(400).send('Invalid Todo')
    return
  }
  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const chechPriority = priorityArray.includes(priority)
    if (chechPriority === true) {
      request.priority = priority
    } else {
      response.status(400).send('Invalid Todo Priority')
      return
    }
  }
  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const statusCheck = statusArray.includes(status)
    if (statusCheck === true) {
      request.status = status
    } else {
      return response.status(400).send('Invalid Todo Status')
    }
  }
  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const checkCategory = categoryArray.includes(category)
    if (checkCategory === true) {
      request.category = category
    } else {
      response.status(400).send('Invalid Todo Category')
      return
    }
  }
  if (dueDate !== undefined) {
    const parsedDate = parseISO(dueDate)
    const checkDate = await isValid(parsedDate)
    if (checkDate === true) {
      const formatedDate = await format(new Date(parsedDate), 'yyyy-MM-dd')
      request.dueDate = formatedDate
    } else {
      response.status(400).send('Invalid Due Date')
      return
    }
  }
  next()
}

//MiddleWare Function For Query
const queryCheck = async (request, response, next) => {
  const {priority, status, category, date} = request.query
  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const chechPriority = priorityArray.includes(priority)
    if (chechPriority === true) {
      request.priority = priority
    } else {
      response.status(400).send('Invalid Todo Priority')
      return
    }
  }
  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const statusCheck = statusArray.includes(status)
    if (statusCheck === true) {
      request.status = status
    } else {
      return response.status(400).send('Invalid Todo Status')
    }
  }
  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const checkCategory = categoryArray.includes(category)
    if (checkCategory === true) {
      request.category = category
    } else {
      response.status(400).send('Invalid Todo Category')
      return
    }
  }
  if (date !== undefined) {
    const parsedDate = parseISO(date)
    const checkDate = await isValid(parsedDate)
    if (checkDate === true) {
      const formatedDate = await format(new Date(parsedDate), 'yyyy-MM-dd')
      request.date = formatedDate
    } else {
      response.status(400).send('Invalid Due Date')
      return
    }
  }
  next()
}

//Converting Database Object To Response Object
const convertDBObjToResponseObj = obj => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  }
}

//API 1
app.get('/todos/', queryCheck, async (request, response) => {
  try {
    const {priority, status, category, search_q = ''} = request.query
    let getTodo = `
      SELECT 
      *
      FROM 
      todo 
      WHERE 
      todo LIKE '%' || ? || '%'
    `
    let queryParams = [search_q]
    if (status !== undefined) {
      getTodo += ` AND status = ?`
      queryParams.push(status)
    }
    if (priority !== undefined) {
      getTodo += ` AND priority = ?`
      queryParams.push(priority)
    }
    if (category !== undefined) {
      getTodo += ` AND category = ?`
      queryParams.push(category)
    }

    const dbResponse = await db.all(getTodo, queryParams)
    response.send(dbResponse.map(each => convertDBObjToResponseObj(each)))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API 2
app.get('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const getTodoQuery = `
      SELECT 
      *
      FROM
      todo
      WHERE 
      id = ?
    `
    const dbResponse = await db.get(getTodoQuery, [todoId])
    response.send(convertDBObjToResponseObj(dbResponse))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API 3
app.get('/agenda/', queryCheck, async (request, response) => {
  try {
    const {date} = request.query
    const getTodoQuery = `
      SELECT 
      *
      FROM
      todo
      WHERE 
      due_date = ?
    `
    const dbResponse = await db.all(getTodoQuery, [date])
    response.send(dbResponse.map(each => convertDBObjToResponseObj(each)))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API 4
app.post('/todos/', bodyCheck, async (request, response) => {
  try {
    const {id, todo, priority, status, category, dueDate} = request.body
    const createTodoQuery = `
      INSERT INTO
      todo(id, todo, priority, status, category, due_date)
      VALUES(?,?,?,?,?,?)
    `
    await db.run(createTodoQuery, [
      id,
      todo,
      priority,
      status,
      category,
      dueDate,
    ])
    return response.send('Todo Successfully Added')
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API 5
app.put('/todos/:todoId/', bodyCheck, async (request, response) => {
  try {
    const {todoId} = request.params
    const {priority, status, category, todo, dueDate} = request.body
    let updateTodoQuery = `
      UPDATE 
      todo
      SET
    `
    if (priority !== undefined) {
      updateTodoQuery += `priority = ? WHERE id = ?`
      await db.run(updateTodoQuery, [priority, todoId])
      response.send('Priority Updated')
    }
    if (status !== undefined) {
      updateTodoQuery += `status = ? WHERE id = ?`
      await db.run(updateTodoQuery, [status, todoId])
      response.send('Status Updated')
    }
    if (category !== undefined) {
      updateTodoQuery += `category = ? WHERE id = ?`
      await db.run(updateTodoQuery, [category, todoId])
      response.send('Category Updated')
    }
    if (todo !== '') {
      updateTodoQuery = `todo = ? WHERE id = ?`
      await db.run(updateTodoQuery, [todo, todoId])
      response.send('Todo Updated')
    }
    if (dueDate !== undefined) {
      updateTodoQuery += `due_date = ? WHERE id = ?`
      await db.run(updateTodoQuery, [dueDate, todoId])
      response.send('Due Date Updated')
    }
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API 6
app.delete('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const deleteTodoQuery = `
      DELETE FROM 
      todo
      WHERE 
      id = ?
    `
    await db.run(deleteTodoQuery, [todoId])
    response.send('Todo Deleted')
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

module.exports = app
