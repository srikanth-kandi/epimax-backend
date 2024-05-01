# EpiMax Tasks API

Live API URL - [https://epimax-backend-3j21.onrender.com](https://epimax-backend-3j21.onrender.com)

Since the API is currently deployed on the **Free Web Service** of [Render](https://render.com), sometimes the server may be in sleep mode. If you encounter any issues, please try after some time. Thank you!

> Your free instance will spin down with inactivity, which can delay requests by 50 seconds or more.

### Database Schema

```sql
-- PostgreSQL schema creation for users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL
);

-- PostgreSQL schema creation for tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    assignee_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assignee_id) REFERENCES users(id)
);
```

### Instructions to run the application

1. Clone the repository
2. Run `npm install` to install the dependencies
3. Create a `.env` file in the root directory and add the following environment variables

    ```
    DB_USER=your_db_username
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name
    DB_HOST=your_db_host
    JWT_SECRET=your_secret
    DB_PORT=5432
    DB_CA=your_db_ca
    ```
4. Run `npm start` to start the server
5. The server will start running on `http://localhost:3000`

### Existing User entries in users table

```json
{
    "username": "srikanth",
    "password": "sri_pass"
}
```

```json
{
    "username": "testuser",
    "password": "test@123"
}
```

### Existing Tasks entries in tasks table

Tasks created by `srikanth`

```json
{
    "title": "do the EpiMax Backend Assignment",
    "description": "using the ExpressJS and Deploy online",
    "status": "done"
}
```

```json
{
    "title": "Resolve pending issues on GitHub",
    "description": "For te.react.dev and travel-diary-backend",
    "status": "to do"
}
```

Tasks created by `testuser`

```json
{
    "title": "test task title",
    "description": "test task description",
    "status": "in progress"
}
```

### API Endpoints

1. **User Registration**

    - Endpoint: `/register`
    - Method: `POST`
    - Request Body:
        The `"username"` must be unique.

        ```json
        {
            "username": "example",
            "password": "example_password"
        }
        ```
    - Response:
        - Status Code: `201`
        - Response Body:

            ```json
            {
                "message": "User created successfully"
            }
            ```
    - Error Response:
        - Status Code: `400`
        - Response Body:
        If the `"username"` or `"password"` is missing or `null`.

            ```json
            {
                "message": "username and password are required"
            }
            ```
        - Status Code: `400`
        - Response Body:
        If the user with the same username already exists.

            ```json
            {
                "message": "User with this username already exists"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```

2. **User Login**

    - Endpoint: `/login`
    - Method: `POST`
    - Request Body:
        The `"username"` must be registered and the `"password"` must be correct.

        ```json
        {
            "username": "example",
            "password": "example_password"
        }
        ```
    - Response:
        - Status Code: `200`
        - Response Body:
        Returns a token which is required to access the `Tasks` endpoints and is valid for 24 hours.

            ```json
            {
                "token": "YOUR_JWT_TOKEN"
            }
            ```
    - Error Response:
        - Status Code: `400`
        - Response Body:
        If the `"username"` or `"password"` is missing or `null`.

            ```json
            {
                "message": "username and password are required"
            }
            ```
        - Status Code: `404`
        - Response Body:
        If the user with the given username is not found.

            ```json
            {
                "message": "User with this username does not exist"
            }
            ```
        - Status Code: `400`
        - Response Body:
        If the password is incorrect.

            ```json
            {
                "message": "Invalid password"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```

Before proceeding to below endpoints the token received from the `/login` endpoint must be added to the request headers as `Authorization: Bearer TOKEN_RECEIVED_FROM_LOGIN_ENDPOINT`. Falied to provide the token will result in below response from the server.

```json
{
    "message": "Authentication failed"
}
```

3. **Create Task**

    - Endpoint: `/tasks`
    - Method: `POST`
    - Request Body:

        ```json
        {
            "title": "Task title",
            "description": "Task description",
            "status": "to do"
        }
        ```
    - Response:
        - Status Code: `201`
        - Response Body:

            ```json
            {
                "message": "Task created successfully"
            }
            ```
    - Error Response:
        - Status Code: `400`
        - Response Body:
        If the `"title"`, `"description"`, or `"status"` is missing or `null`.

            ```json
            {
                "message": "title, description and status are required"
            }
            ```
        - Status Code: `400`
        - Response Body:
        If the status is invalid.

            ```json
            {
                "message": "Invalid status, status must be 'to do' or 'in progress' or 'done'"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```

4. **Get All Tasks**

    - Endpoint: `/tasks`
    - Method: `GET`
    - Response:
        - Status Code: `200`
        - Response Body:
        Returns all tasks created by the logged in user.

            ```json
            [
                {
                    "id": 1,
                    "title": "Task title",
                    "description": "Task description",
                    "status": "to do"
                },
                {
                    "id": 2,
                    "title": "Another Task",
                    "description": "Another Task description",
                    "status": "in progress"
                }
            ]
            ```
    - Error Response:
        - Status Code: `404`
        - Response Body:
        If there are no tasks created by the user.

            ```json
            {
                "message": "No tasks found for this user"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```

5. **Get Task by ID**

    - Endpoint: `/tasks/:taskId`
    - Method: `GET`
    - Response:
        - Status Code: `200`
        - Response Body:

            ```json


            {
                "id": 1,
                "title": "Task title",
                "description": "Task description",
                "status": "to do"
            }
            ```
    - Error Response:
        - Status Code: `400`
        - Response Body:
        If the task ID is not a valid number.

            ```json
            {
                "message": "Task id must be a positive number"
            }
            ```
        - Status Code: `404`
        - Response Body:
        If the task with the given ID is not found.

            ```json
            {
                "message": "Task not found for this id"
            }
            ```
        - Status Code: `403`
        - Response Body:
        If the task does not belong to the logged in user.

            ```json
            {
                "message": "You are not authorized to view this task"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```

6. **Update Task**

    - Endpoint: `/tasks/:taskId`
    - Method: `PUT`
    - Request Body:

        ```json
        {
            "title": "Updated Task title",
            "description": "Updated Task description",
            "status": "done"
        }
        ```
    - Response:
        - Status Code: `200`
        - Response Body:

            ```json
            {
                "message": "Task updated successfully"
            }
            ```
    - Error Response:
        - Status Code: `400`
        - Response Body:
        If the task ID is not a valid number.

            ```json
            {
                "message": "Task id must be a positive number"
            }
            ```
        - Status Code: `400`
        - Response Body:
        If the `"status"` is invalid.

            ```json
            {
                "message": "Invalid status, status must be 'to do' or 'in progress' or 'done'"
            }
            ```
        - Status Code: `404`
        - Response Body:
        If the task with the given ID is not found.

            ```json
            {
                "message": "Task not found for this id"
            }
            ```
        - Status Code: `403`
        - Response Body:
        If the task does not belong to the logged in user.

            ```json
            {
                "message": "You are not authorized to update this task"
            }
            ```
        - Status Code: `400`
        - Response Body:
        If there is no data provided to update.

            ```json
            {
                "message": "At least one parameter (title, description, status) must be provided"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```

7. **Delete Task**

    - Endpoint: `/tasks/:taskId`
    - Method: `DELETE`
    - Response:
        - Status Code: `200`
        - Response Body:

            ```json
            {
                "message": "Task deleted successfully"
            }
            ```
    - Error Response:
        - Status Code: `400`
        - Response Body:
        If the task ID is not a valid number.

            ```json
            {
                "message": "Task id must be a positive number"
            }
            ```
        - Status Code: `404`
        - Response Body:
        If the task with the given ID is not found.

            ```json
            {
                "message": "Task not found for this id"
            }
            ```
        - Status Code: `403`
        - Response Body:
        If the task does not belong to the logged in user.

            ```json
            {
                "message": "You are not authorized to delete this task"
            }
            ```
        - Status Code: `500`
        - Response Body:

            ```json
            {
                "message": "Internal server error"
            }
            ```