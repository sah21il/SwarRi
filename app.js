const express = require('express');
const app = express();
const router = express.Router();
const mongoose = require('mongoose');
const Image = require('./models/image');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const sendgridMail = require('@sendgrid/mail');
const authenticate = require('./middleware/authenticate'); 
const multer = require('multer');
const Audio = require('./models/audio');
const AnimationVideo = require('./models/animeVideo');
const methodOverride = require('method-override');
const DanceVideo = require('./models/DanceVideo');
const nodemailer = require('nodemailer'); // For sending OTP emails
const {v4: uuid} = require("uuid");
const { checkPasswordStrength, generateOTP, verifyOTP } = require('./utils');

const bcrypt = require('bcrypt'); // For generating OTPs
const User = require('./models/user')
const session = require('express-session');

router.use(authenticate);

sendgridMail.setApiKey('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');
require('dotenv').config();

const PORT = 3000;

// Middleware Setup
function isAuthenticated(req, res, next) {
    console.log('Checking authentication...');
    if (req.user) {
        console.log('User is authenticated:', req.user);
        return next();
    }
    console.log('User is not authenticated.');
    res.status(403).send('Unauthorized');
}

async function isOwner(req, res, next) {
    try {
        console.log('Checking ownership for video ID:', req.params.id);
        const video = await AnimationVideo.findById(req.params.id);
        if (!video) {
            console.log('Video not found');
            return res.status(404).send('Video not found');
        }
        console.log('Video owner:', video.owner, 'Current user:', req.user._id);
        if (video.owner.toString() === req.user._id.toString()) {
            req.video = video;
            return next();
        }
        console.log('User is not the owner of the video.');
        res.status(403).send('You are not authorized to delete this video.');
    } catch (error) {
        console.error('Error in isOwner middleware:', error);
        res.status(500).send('Internal Server Error');
    }
}


app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'yourSecretKey', // Replace with a secure secret key
    resave: false,
    saveUninitialized: false,
}));
app.use(async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            req.user = user; // Attach the user to the request object
        } catch (err) {
            console.error('Error fetching user:', err);
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
});

// Set view engine
app.set('view engine', 'ejs');

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});



const imageFilter = (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
    allowedImageTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only image files are allowed!"), false);
};

const audioFilter = (req, file, cb) => {
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3"];
    allowedAudioTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only audio files are allowed!"), false);
};

const videoFilter = (req, file, cb) => {
    const allowedVideoTypes = ["video/mp4", "video/avi", "video/mpeg"];
    allowedVideoTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only video files are allowed!"), false);
};

const uploadImage = multer({ storage, fileFilter: imageFilter });
const uploadAudio = multer({ storage, fileFilter: audioFilter });
const uploadVideo = multer({ storage, fileFilter: videoFilter, limits: { fileSize: 100 * 1024 * 1024 } });

// Connect to MongoDB
mongoose.connect(process.env.URI)
    .then(() => app.listen(process.env.PORT || 3000, () => console.log('Server started')))
    .catch(err => console.log(err));

// Routes

// Home Page
app.get('/', (req, res) => {
    res.redirect('/signup')
});
app.get('/home', (req, res) => {
    res.redirect('/anime');
});
app.get('/signup', (req, res) => {
    res.render('signup', { messageType: null });
});

// app.get('/signin', (req, res) => {
//     res.render('signin', { messageType: null });
// });
app.get('/dance', (req, res) => {
    res.redirect('/dance-videos');
});


// Upload Pages
app.get('/upload', (req, res) => res.render('upload', { title: 'Upload' }));
app.get('/upload-paint', (req, res) => res.render('upload-paint', { title: 'Upload Paintings' }));
app.get('/upload-music', (req, res) => res.render('upload-music', { title: 'Upload Music' }));
app.get('/upload-dance', (req, res) => res.render('upload-dance', { title: 'Upload Dance Video' }));
app.get('/upload-anime', (req, res) => res.render('upload-anime', { title: 'Upload Animation Video' }));

// Paintings
app.get('/paintings', async (req, res) => {
    try {
        const images = await Image.find();
        res.render('paintings', { title: 'Paintings', items: images });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/paintings', uploadImage.single('image'), async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            desc: req.body.desc,
            img: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype
            }
        };
        const image = new Image(obj);
        await image.save();
        res.redirect('/paintings');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading painting');
    }
});

app.get('/paintings/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        res.render('details', { image, title: 'Image Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/paintings/:id', async (req, res) => {
    try {
        const result = await Image.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).send('Painting not found');
        }
        res.redirect('/paintings')
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Music
app.get('/music', async (req, res) => {
    try {
        const audioFiles = await Audio.find();
        res.render('music', { audioFiles, title: 'Music Library' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/music', uploadAudio.single('file'), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            file: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype,
            },
            artist: req.body.artist || 'Unknown',
            genre: req.body.genre || 'Unknown',
            tags: req.body.tags ? req.body.tags.split(',') : [],
        };
        const audio = new Audio(obj);
        await audio.save();
        fs.unlinkSync(path.join(__dirname, 'uploads', req.file.filename));
        res.redirect('/music');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading music');
    }
});
app.get('/music/:id', async (req, res) => {
    try {
        const audio = await Audio.findById(req.params.id); // Fetch the specific audio
        const audioFiles = await Audio.find(); // Fetch all audio files (for the list)

        if (!audio) {
            return res.status(404).send('Audio not found');
        }

        // Pass both `audio` and `audioFiles` to the template
        res.render('details2', { audio, audioFiles, title: 'Audio Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.delete('/music/:id', async (req, res) => {
    try {
        const result = await Audio.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).send('Audio file not found');
        }
        res.redirect('/music');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// Dance Videos



app.post('/dance-videos', uploadVideo.single('file'), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            choreographer: req.body.choreographer || 'Unknown',
            genre: req.body.genre || 'Unknown',
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            fileUrl: `/uploads/${req.file.filename}`,
        };
        const video = new DanceVideo(obj);
        await video.save();
        res.redirect('/dance-videos');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading video');
    }
});

app.get('/dance-videos', async (req, res) => {
    try {
        const videos = await DanceVideo.find(); // Fetches all videos
        res.render('dance', { title: 'Dance Videos', videos }); // Passes videos array to the template
        console.log(videos);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/dance-videos/:id', async (req, res) => {
    try {
        const video = await DanceVideo.findById(req.params.id);
        res.render('details3', { video, title: 'Dance Video Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/dance-videos/:id', async (req, res) => {
    try {
        await DanceVideo.findByIdAndDelete(req.params.id);
        res.redirect('/dance-videos');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.post('/anime', uploadVideo.single('file'), async (req, res) => {
    try {
        const { title, description, artist, genre, tags, duration } = req.body;

        const videoData = {
            title,
            description,
            artist: artist || 'Unknown',
            genre: genre || 'General',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            duration: parseInt(duration) || 0,
            file: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype,
            },
        };

        const newVideo = new AnimationVideo(videoData);
        await newVideo.save();

        fs.unlinkSync(path.join(__dirname, 'uploads', req.file.filename));  // Clean up uploaded file
        res.redirect('/anime');  // Redirect to the videos page
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading video');
    }
});



app.get('/anime', async (req, res) => {
    try {
        // Perform aggregation with allowDiskUse
        const videos = await AnimationVideo.aggregate([
            { $match: {} }, // Match all documents (modify if necessary)
            { $sort: { createdAt: -1 } } // Sort by createdAt descending
        ]).option({ allowDiskUse: true }); // Enable disk usage for sorting

        // Render the template with the list of videos
        res.render('anime', { videos, title: 'Animation Videos Library' });
    } catch (err) {
        console.error('Error retrieving videos:', err.message);
        res.status(500).send('Error retrieving videos');
    }
});
app.get('/anime/:id', async (req, res) => {
    try {
        const video = await AnimationVideo.findById(req.params.id);
        if (!video) {
            return res.status(404).send('Video not found');
        }
        res.render('details4', {
            video,
            user: req.user || null, // Pass the current user if logged in
            title: 'Anime Video Details',
        });
    } catch (err) {
        console.error('Error fetching video details:', err);
        res.status(500).send('Server Error');
    }
});

// Delete Video Route
app.delete('/anime/:id', isAuthenticated, isOwner, async (req, res) => {
    try {
        await req.video.remove(); // `req.video` is set in the `isOwner` middleware
        res.redirect('/anime'); // Redirect back to the animation page
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/send-otp', async (req, res) => {
    const { name, email } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('signup', { 
            message: 'Invalid email format. Please enter a valid email.',
            messageType: 'error'
        });
    }

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.render('signup', { 
                message: 'User already exists. Please log in.',
                messageType: 'error'
            });
        }

        // Generate OTP and store in session
        const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        req.session.otp = otp;
        req.session.email = email;
        req.session.name = name;

        // Send OTP email
        const msg = {
            to: email,
            from: 'sahilarya5796@gmail.com',
            subject: 'OTP Verification',
            text: `Hello ${name}, Your OTP code is ${otp}.`
        };

        await sendgridMail.send(msg);

        // Render OTP verification page
        res.render('verify-otp', { 
            email, 
            message: 'OTP sent successfully.',
            messageType: 'success'
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.render('signup', { 
            message: 'Error sending OTP. Please try again later.',
            messageType: 'error'
        });
    }
});

app.post('/verify-otp', (req, res) => {
    const { otp } = req.body;

    // Check if OTP is correct
    if (String(req.session.otp) === String(otp)) { // Ensure both are strings for comparison
        // Reset attempts after successful verification
        req.session.attempts = 0;
        req.session.otp = null; // Clear OTP after successful use
        res.render('set-password', { message: null });
    } else {
        // Increment the attempt counter
        req.session.attempts = (req.session.attempts || 0) + 1;

        // Check if attempts have reached the limit
        if (req.session.attempts >= 3) {
            // Reset session data and redirect to the signup page after 3 failed attempts
            req.session.destroy(() => {
                res.redirect('/signup'); // Redirect to signup after attempts are exhausted
            });
        } else {
            // Render the OTP verification page with an error message if attempts are below the limit
            res.render('verify-otp', { 
                email: req.session.email, // Preserve email in the rendered view
                message: 'OTP is incorrect. Try again. You will be redirected to signup after 3 failed attempts.', 
                messageType: 'error' 
            });
        }
    }
});



app.post('/set-password', async (req, res) => {
    const { name, email, password } = req.body;

    if (!email || !name || !password) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).send('User already exists. Please login.');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            name: name,
            email: email,
            password: hashedPassword,
            username: email
        });

        await newUser.save();
        res.redirect('/signin?message=User created successfully');
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).send('Error creating user. Please try again later.');
    }
});
// Route to render the forgot password page
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { message: null });
});

// Route to send OTP for password reset
app.post('/send-reset-otp', async (req, res) => {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
        return res.render('forgot-password', { message: 'User does not exist. Please sign up.' });
    }

    // Generate OTP and save it to the session
    const otp = generateOTP();
    req.session.resetOtp = otp;
    req.session.resetEmail = email;

    // Send OTP via email
    const msg = {
        to: email,
        from: 'sahilarya5796@gmail.com',
        subject: 'Password Reset OTP',
        text: `Hi , Your OTP for password reset is ${otp}`,
    };

    try {
        await sendgridMail.send(msg);
        res.render('verify-reset-otp', { message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.render('forgot-password', { message: 'Error sending OTP. Try again later.' });
    }
});

// Route to verify OTP
app.post('/verify-reset-otp', (req, res) => {
    const { otp } = req.body;

    if (verifyOTP(req.session.resetOtp, otp)) {
        res.render('reset-password', { message: null }); // Redirect to reset password form
    } else {
        res.render('verify-reset-otp', { message: 'Invalid OTP. Try again.' });
    }
});

// Route to reset the password
app.post('/reset-password', async (req, res) => {
    const { password } = req.body;
    const email = req.session.resetEmail;

    if (!email) {
        return res.redirect('/forgot-password');
    }

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update the user's password in the database
        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        // Clear session variables
        req.session.resetOtp = null;
        req.session.resetEmail = null;

        res.redirect('/login?message=Password reset successful. Please log in.');
    } catch (error) {
        console.error('Error resetting password:', error);
        res.render('reset-password', { message: 'Error resetting password. Try again later.' });
    }
});











// Example route to handle login and show messages
app.get('/signin', (req, res) => {
    const message = req.query.message || ''; // Default to an empty string if no message is passed
    res.render('signin', { message }); // Render the signin page with the message
});

// Route to handle signin form submission
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.redirect('/signin?message=Missing username or password');
    }

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.redirect('/signin?message=Invalid username or password');
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.redirect('/signin?message=Invalid username or password');
        }

        // Save the user ID in the session
        req.session.userId = user._id;

        // Redirect to homepage
        res.redirect('/anime');
    } catch (error) {
        console.error('Error during login:', error);
        res.redirect('/signin?message=An error occurred. Please try again later.');
    }
});



// OTP verification route
// OTP verification route
app.post('/verify-login-otp', (req, res) => {
    const { otp } = req.body;  // Capture the OTP entered by the user
    const sessionOtp = req.session.otp;  // OTP stored in the session

    // console.log('Entered OTP:', otp);
    // console.log('Session OTP:', sessionOtp);

    // Check if the OTP entered by the user matches the stored OTP
    if (otp === sessionOtp.toString()) {  // Ensure OTP comparison is between strings
        // OTP is valid, mark the user as authenticated
        req.session.isAuthenticated = true;
        req.session.email = req.session.email;  // Store email in session (if not already stored)

        // Redirect to the dashboard
        return res.redirect('/anime');
    } else {
        // OTP is incorrect, render the login-verify page with an error message
        return res.render('login-verify', { email: req.session.email, message: 'Invalid OTP. Please try again.' });
    }
});
