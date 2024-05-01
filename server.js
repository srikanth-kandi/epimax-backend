const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const app = express();
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DB_CA
  }
};

const PORT = process.env.PORT || 3000;

const validStatus = ['to do', 'in progress', 'done'];

const client = new Client(dbConfig);

const initializeDBAndServer = async () => {
  try {
    await client.connect();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
  } catch (e) {
    console.error(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Endpoint for creating new users
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username === '' || password === '' || !username || !password) {
            return res.status(400).json({ message: "username and password are required" });
        }
        const existingUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
        const existingUser = await client.query(existingUserQuery);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "User with this username already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserQuery = `
            INSERT INTO users (username, password_hash)
            VALUES ('${username}', '${hashedPassword}');
        `;
        await client.query(createUserQuery);
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Endpoint for user login
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username === '' || password === '' || !username || !password) {
            return res.status(400).json({ message: "username and password are required" });
        }
        const existingUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
        const existingUser = await client.query(existingUserQuery);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ message: "User with this username does not exist" });
        }
        const hashedPassword = existingUser.rows[0].password_hash;
        const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid password" });
        }
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "24h" });
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Middleware to authentication
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const selectUserIdQuery = `SELECT id FROM users WHERE username = '${decodedToken.username}';`;
        const userId = await client.query(selectUserIdQuery);
        req.userData = { user_id: userId.rows[0].id };
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Authentication failed" });
    }
};

// Endpoint to create a new task
app.post("/tasks", authenticateToken, async (req, res) => {
    try {
        const { title, description, status } = req.body;
        if (title === '' || !title || !description || description === '' || !status || status === '') {
            return res.status(400).json({ message: "title, description and status are required" });
        }
        // check if status is valid
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status, status must be 'to do' or 'in progress' or 'done'" });
        }
        const createTaskQuery = `
            INSERT INTO tasks (title, description, status, assignee_id)
            VALUES ('${title}', '${description}', '${status}', ${req.userData.user_id});
        `;
        await client.query(createTaskQuery);
        res.status(201).json({ message: "Task created successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Endpoint to get all tasks of logged in user
app.get("/tasks", authenticateToken, async (req, res) => {
    try {
        const getTasksQuery = `SELECT * FROM tasks WHERE assignee_id = ${req.userData.user_id};`;
        const tasks = await client.query(getTasksQuery);
        if (tasks.rows.length === 0) {
            return res.status(404).json({ message: "No tasks found for this user" });
        } else {
            const responses = tasks.rows.map(task => {
                return {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status
                };
            });
            res.status(200).json(responses);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Endpoint get a task by id
app.get("/tasks/:taskId", authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.taskId;
        // check if taskId is a number
        if (isNaN(taskId) || parseInt(taskId) <= 0) {
            return res.status(400).json({ message: "Task id must be a positive number" });
        }
        const getTaskByIdQuery = `SELECT * FROM tasks WHERE id = ${taskId};`;
        const taskByIdResponse = await client.query(getTaskByIdQuery);
        if (taskByIdResponse.rows.length === 0) {
            return res.status(404).json({ message: "Task not found for this id" });
        }
        // check if the task belongs to the logged in user
        if (taskByIdResponse.rows[0].assignee_id !== req.userData.user_id) {
            return res.status(403).json({ message: "You are not authorized to view this task" });
        }
        const response = {
            id: taskByIdResponse.rows[0].id,
            title: taskByIdResponse.rows[0].title,
            description: taskByIdResponse.rows[0].description,
            status: taskByIdResponse.rows[0].status
        };
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Endpoint to update a task by id
app.put("/tasks/:taskId", authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { title, description, status } = req.body;
        // check if taskId is a number
        if (isNaN(taskId) || parseInt(taskId) <= 0) {
            return res.status(400).json({ message: "Task id must be a positive number" });
        }
        // check if status is valid
        if (status && !validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status, status must be 'to do' or 'in progress' or 'done'" });
        }
        const getTaskByIdQuery = `SELECT * FROM tasks WHERE id = ${taskId};`;
        const taskByIdResponse = await client.query(getTaskByIdQuery);
        if (taskByIdResponse.rows.length === 0) {
            return res.status(404).json({ message: "Task not found for this id" });
        }
        // check if the task belongs to the logged in user
        if (taskByIdResponse.rows[0].assignee_id !== req.userData.user_id) {
            return res.status(403).json({ message: "You are not authorized to update this task" });
        }
        // check title and description are not empty
        const updateFields = [];
        if (title !== undefined) updateFields.push(`title = '${title}'`);
        if (description !== undefined) updateFields.push(`description = '${description}'`);
        if (status !== undefined) updateFields.push(`status = '${status}'`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updateFields.length === 1) {
            return res.status(400).json({ message: "At least one parameter (title, description, status) must be provided" });
        }

        const updateTaskQuery = `
            UPDATE tasks
            SET ${updateFields.join(', ')}
            WHERE id = ${taskId};
        `;
        await client.query(updateTaskQuery);
        res.status(200).json({ message: "Task updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Endpoint to delete a task by id
app.delete("/tasks/:taskId", authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.taskId;
        // check if taskId is a number
        if (isNaN(taskId) || parseInt(taskId) <= 0) {
            return res.status(400).json({ message: "Task id must be a positive number" });
        }
        const getTaskByIdQuery = `SELECT * FROM tasks WHERE id = ${taskId};`;
        const taskByIdResponse = await client.query(getTaskByIdQuery);
        if (taskByIdResponse.rows.length === 0) {
            return res.status(404).json({ message: "Task not found for this id" });
        }
        // check if the task belongs to the logged in user
        if (taskByIdResponse.rows[0].assignee_id !== req.userData.user_id) {
            return res.status(403).json({ message: "You are not authorized to delete this task" });
        }
        const deleteTaskQuery = `DELETE FROM tasks WHERE id = ${taskId};`;
        await client.query(deleteTaskQuery);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});