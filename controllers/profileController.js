import jwt from 'jsonwebtoken';
import User from '../models/mentor.js';
import MenteeUser from '../models/mentee.js';
// import SessionRequest from '../models/session.js';
import CreatedSession from '../models/CreateSession-Model.js';
import { google } from 'googleapis';
const SECRET_KEY = process.env.SECRET_KEY; // Keep this key secure

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied, token missing!" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};
const auth = async (req, res) => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'https://sarathi-backend-cgm8.onrender.com/auth/callback',

        );

        const scopes = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly' ,'https://www.googleapis.com/auth/calendar.readonly',];
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });

        res.json({ url });
    } catch (error) {
        console.error('Error authenticating with Google:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }

};

// Callback route (after OAuth authorization)
const callback = async (req, res) => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'https://sarathi-backend-cgm8.onrender.com/auth/callback'  // Update to your redirect URI
        );

        // Exchange the authorization code for access tokens
        const { tokens } = await oauth2Client.getToken(req.query.code);
        oauth2Client.setCredentials(tokens);

        // Get the user's profile information
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const user = await User.findOne({ email: userInfo.data.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found authenticate using the registered account' });
        }

        //save the access token and refresh token to the database
        user.access_token = tokens.access_token;
        user.refresh_token = tokens.refresh_token;
        user.authenticated = true;
        await user.save();

        res.send(`
            <script>
                window.opener.postMessage({ success: true }, '*');
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Failed to create event', error });
    }
};



const addevent = async (req, res) => {
    try {
        // Destructure the session data from the request body
        const { title, description, start, end, attendees } = req.body;
        
        // Validate input
        if (!title || !start || !end) {
            return res.status(400).json({ message: 'Missing required fields: title, start, end' });
        }
        
        // Ensure start and end are in the correct format
        const startDateTime = start.dateTime; // Access the start dateTime
        const endDateTime = end.dateTime;     // Access the end dateTime

        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'https://sarathi-backend-cgm8.onrender.com/auth/callback'  // Update to your redirect URI
        );

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Set the credentials (access and refresh tokens)
        oauth2Client.setCredentials({
            access_token: user.access_token,
            refresh_token: user.refresh_token,
        });

        // Refresh the token if the access token has expired
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                user.refresh_token = tokens.refresh_token; // Save new refresh token if available
            }
            user.access_token = tokens.access_token; // Update access token
            await user.save();
        });

        // Check if the access token has expired and refresh if necessary
        if (!oauth2Client.credentials || !oauth2Client.credentials.access_token || oauth2Client.credentials.expiry_date < Date.now()) {
            const { tokens } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(tokens);
            user.access_token = tokens.access_token;
            await user.save();
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const event = {
            summary: title,  // Use 'summary' instead of 'title'
            description: description || 'No description provided', // Default message if no description
            location: 'Google Meet',  // Can add a physical location if necessary
            start: {
                dateTime: startDateTime,  // Use dynamic start date
                timeZone: start.timeZone || 'Asia/Kolkata', // Adjusted time zone if provided
            },
            end: {
                dateTime: endDateTime,  // Use dynamic end date
                timeZone: end.timeZone || 'Asia/Kolkata', // Adjusted time zone if provided
            },
            conferenceData: {
                createRequest: {
                    requestId: 'random-string-id',
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet',  // Adds Google Meet link automatically
                    },
                },
            },
            attendees: attendees || [],  // Accept attendees from request body
            reminders: {
                useDefault: false,  // Use custom reminders
                overrides: [
                    { method: 'email', minutes: 24 * 60 },  // 24 hours before
                    { method: 'popup', minutes: 10 },  // 10 minutes before
                ],
            },
            colorId: '5',  // Choose colorId from Google Calendar's color options
            transparency: 'opaque',  // Can be 'transparent' (free) or 'opaque' (busy)
            visibility: 'public',  // Can be 'private' or 'public'
        };
        
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all',
        });

        res.status(200).json({ message: 'Event added successfully', data: response.data });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Failed to create event', error: error.message || 'Internal server error' });
    }
};



const getUserCalendar = async (req, res) => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            'https://sarathi-backend-cgm8.onrender.com/auth/callback'  // Replace with actual redirect URI
        );
        const user = await User.findById(req.user.id);
       
        oauth2Client.setCredentials({
            access_token: user.access_token,
            refresh_token: user.refresh_token,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Fetch the user's calendar list
        const { data } = await calendar.calendarList.list();

        // Get the primary calendar ID
        const primaryCalendar = data.items.find(cal => cal.primary);

        if (!primaryCalendar) {
            return res.status(404).json({ message: 'Primary calendar not found' });
        }

        // Send the calendar ID back to the client
        res.status(200).json({ calendarId: primaryCalendar.id });
    } catch (error) {
        console.error('Error fetching user calendar:', error);
        res.status(500).json({ message: 'Failed to fetch user calendar', error });
    }
};


// Fetch profile controller
const getProfileMentee = async (req, res) => {
    try {
        const user = await MenteeUser.findById(req.user.id);
        res.status(200).json({ profile: user });
    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
};
const getProfileMentor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ profile: user });
    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
};

const getDashboardMentee = async (req, res) => {
    try {
        const user = await MenteeUser.findById(req.user.id);
        res.status(200).json({ profile: user });
    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
};
const getDashboardMentor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ profile: user });
    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
};

const getEditMentor = async (req, res) => {
    try {
        const { email,
            password,
            firstName,
            lastName,
            jobTitle,
            company,
            location,
            linkedin,
            skills,
            experience,
            language,
            description, } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.user.id, {
            email,
            password,
            firstName,
            lastName,
            jobTitle,
            company,
            location,
            linkedin,
            skills,
            experience,
            language,
            description,
        }, { new: true });
        res.status(200).json({ message: "Profile Updated Successfully", profile: updatedUser });
    } catch (error) {
        res.status(500).json({ error: "Error occurred" });
    }
};
const createSession = async (req, res) => {
    try {
        const { title, description, start, end, price, type } = req.body;

        // Validate required fields
        if (!title || !description || !start || !end || !price || !type) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Create a new session
        const newSession = new CreatedSession({
            title,
            description,
            start, // Use the ISO date directly
            end,   // Use the ISO date directly
            price,
            type,
            mentorID: req.user.id // Ensure req.user.id is set properly
        });

        // Save the new session to the database
        await newSession.save();

        res.status(200).json({ message: "Session created successfully", session: newSession });
    } catch (error) {
        console.error("Error creating session:", error); // Log the error for debugging
        res.status(500).json({ error: "Error occurred while creating the session" });
    }
};

const getSession = async (req, res) => {
    try {
        const mentorID = req.headers.mentorid; // Extract mentorID from headers

        if (!mentorID) {
            return res.status(400).json({ error: "mentorID is required in headers" });
        }

        const sessions = await CreatedSession.find({ mentorID });
        res.status(200).json({ sessions });
    } catch (error) {
        console.error("Error fetching sessions:", error); // Log the error for debugging
        res.status(500).json({ error: "Error fetching sessions" });
    }
};


const getSessiondetails = async (req, res) => {
    try {
        // Assuming 'mentorID' is a field in the 'CreatedSession' schema
        const sessions = await CreatedSession.find({ mentorID: req.user.id });
        res.status(200).json({ sessions });
    } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).json({ error: "Error fetching sessions" });
    }
}

const getMentors = async (req, res) => {
    try {
        const mentors = await User.find({ role: "mentor" });
        res.status(200).json({ mentors });
    } catch (error) {
        res.status(500).json({ error: "Error fetching mentors" });
    }
}

const registersession = async (req, res) => {
    try {
        const { mentor, mentee, date, time, duration, agenda } = req.body;
        const newSession = { mentor, mentee, date, time, duration, agenda };
        const user = await SessionRequest.findById(req.user.id);
        user.sessions.push(newSession);
        await user.save();
        res.status(200).json({ message: "Session added successfully", session: newSession });
    } catch (error) {
        res.status(500).json({ error: "Error occurred" });
    }
}
const deleteSession = async (req, res) => {
    try {
      const sessionId = req.params.sessionId; // Use sessionId from params
      const session = await SessionRequest.findByIdAndDelete(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.status(200).json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Error deleting session:", error); // Log the error for debugging
      res.status(500).json({ error: "Error occurred while deleting the session" });
    }
  };
// Export functions using ES module syntax
export { authenticateToken, getProfileMentee, getProfileMentor, getDashboardMentee, getEditMentor, getDashboardMentor, createSession, getSession, getMentors, getSessiondetails, auth, callback, addevent,getUserCalendar,deleteSession,registersession };
