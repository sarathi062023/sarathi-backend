# Sarathi Backend

This is the backend of the Sarathi project. It is made using Express and Node.js, with MongoDB used as the database for mentors and mentees.

## Getting started

To test the endpoints, you can use Postman or any other API testing tool. The following are the steps to run the backend:

1.  Clone the repository:
    ```sh
    git clone https://github.com/sarathi062023/sarathi-backend.git
    ```
2.  Navigate to the project directory:

    ```sh
    cd sarathi-backend
    ```

3.  Install the required dependencies:
    ```sh
    npm install
    ```
4.  Create a `.env` file in the root directory and add the following environment variables:
    ```sh
    PORT=3001 # Set the port for the server
    MONGODB_URI=mongodb://localhost:27017/sarathi # MongoDB connection URI
    JWT_SECRET=your_secret_key # Secret key for JWT authentication
    CLIENT_ID=your_client_id # Client ID for OAuth
    CLIENT_SECRET=your_client_secret # Client secret for OAuth
    PASS=your_password # Any additional passwords needed
    ```

5.  Start the server:
    ```sh
    npm run dev
    ```
6.  The server will start on `http://localhost:5173`.

### Authentication

1. **POST** `/auth/register-mentor` - Register a new mentor
2. **POST** `/auth/register-mentee` - Register a new mentee
3. **POST** `/auth/login` - Login a mentor
4. **POST** `/auth/login-Mentee` - Login a mentee
5. **GET** `/auth/logout` - Logout a user
6. **GET** `/auth/user` - Get the current user
7. **POST** `/auth/sendOTP` - Send an OTP for verification
8. **POST** `/auth/verify-otp` - Verify the OTP

### Mentor

1. **GET** `/mentor` - Get all mentors
2. **GET** `/mentor/profiles` - Get all mentor profiles
3. **GET** `/mentor/:id` - Get a mentor by id
4. **POST** `/mentor/edit-profile` - Update a mentor's profile by id

### Mentee

1. **GET** `/mentee` - Get all mentees
2. **GET** `/mentee/:id` - Get a mentee by id

### Dashboard

1. **GET** `/dashboard-mentor` - Get the mentor's dashboard (requires authentication)
2. **GET** `/dashboard-mentee` - Get the mentee's dashboard (requires authentication)

### Session Management

1. **POST** `/session/create` - Create a new session (requires authentication)
2. **GET** `/session` - Get all sessions (requires authentication)
3. **GET** `/session/mentor` - Get session details for a mentor (requires authentication)
4. **POST** `/session/mentee` - Register a mentee for a session (requires authentication)

### Calendar

1. **POST** `/event/add` - Add an event to the calendar (requires authentication)
2. **GET** `/user/calendar` - Get the user's calendar (requires authentication)

### Chat

1. **GET** `/chat` - Get all chats
2. **POST** `/chat` - Add a new chat
3. **GET** `/chat/:id` - Get a chat by id
4. **PUT** `/chat/:id` - Update a chat by id

## Controller Functions

The backend is structured using controllers to manage the different functionalities, including authentication, profile management, session management, and calendar integration. The key functions include:

- `login`: Handle login for mentors.
- `loginMentee`: Handle login for mentees.
- `registerMentor`: Handle mentor registration.
- `registerMentee`: Handle mentee registration.
- `sendOTP`: Send OTP for user verification.
- `verifyOTP`: Verify the OTP sent to the user.
- `getProfileMentee`: Fetch mentee profile details.
- `getProfileMentor`: Fetch mentor profile details.
- `getDashboardMentor`: Fetch mentor dashboard data.
- `getDashboardMentee`: Fetch mentee dashboard data.
- `createSession`: Create a new session.
- `getSession`: Retrieve session details.
- `getUserCalendar`: Get events from the user's calendar.

## Conclusion

This backend setup serves as the foundation for the Sarathi mentoring platform, user authentication, and session management.
const answers = [
    "Are you sure?",
    "Are you really sure??",
    "Are you positive???",
    "Houssein is asking nicely...",
    "Pwease ena houssein",
    "Just think about it",
    "If you say no, Houssein will be very sad",
    "I will be very very sad",
    "I will be very very very sad",
    "Ok fine, Houssein will stop asking...",
    "Just kidding, PLEASE SAY YES ❤️"
];

let messageIndex = 0;

function handleNoClick() {
    const noButton = document.querySelector('.no-button');
    const yesButton = document.querySelector('.yes-button');
    noButton.textContent = answers[messageIndex];
    messageIndex = (messageIndex + 1) % answers.length;
    const currentSize = parseFloat(window.getComputedStyle(yesButton).fontSize);
    yesButton.style.fontSize = `${currentSize * 1.5}px`;
}

function handleYesClick() {
    window.location.href = "yes_page.html";
}
