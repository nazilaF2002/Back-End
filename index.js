// here is all my imports
const express =require('express');
const bodyParser =require('body-parser');
const {Pool} =require('pg');
const multer =require('multer') ;
const cors = require('cors');
const path = require('path');
const bcrypt=require('bcrypt');
const {hash} = require('bcrypt');
const JWT= require('jsonwebtoken');
const env= require('dotenv');

//configure env 
env.config();

// makeing an express aplication
const app = express();
const PORT=5000;
const saltRound=10;
// import database
const pool = new Pool({
    user:process.env.USER,
    host:process.env.HOST,
    database:process.env.DATABASE,
    password:process.env.PASSWORD,
    port:5432
});
// useing needed middlewares
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Define size limits for different file types
const limits = {
    image: 2 * 1024 * 1024, // 2 MB for images
    video: 20 * 1024 * 1024, // 20 MB for videos
    pdf: 5 * 1024 * 1024, // 5 MB for PDFs
};
// using multer for uploading files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads'); // Specify the upload directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the file name
    },
});
// Custom file filter
const fileFilter = (req, file, cb) => {
    const fileType = file.mimetype;
    let maxSize;

    // Determine the file type and corresponding max size
    if (fileType.startsWith('image/')) {
        maxSize = limits.image;
    } else if (fileType.startsWith('video/')) {
        maxSize = limits.video;
    } else if (fileType === 'application/pdf') {
        maxSize = limits.pdf;
    } else {
        return cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
    }
    // Check the file size
    if (file.size > maxSize) {
        return cb(new Error(`File size exceeds the limit of ${maxSize / (1024 * 1024)} MB`), false);
    }
    cb(null, true);
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
});
// my jwtToken secret
const JWTSecret=process.env.JWT_SECRET;
// token authentication
let tokenMid= (req,res,nex)=>{
    const authHeader=req.headers['authorization'];
    const token=authHeader && authHeader.split(" ")[1];
    if(!token){
        return res.status(401).json({message:'no auth'})
    }
    JWT.verify(token,JWTSecret,(err,user)=>{
        if(err){
            return res.status(403).json({message:'token not found'})
        }
        req.user=user;
        nex();
    })
}
// get teachers from the database
let Front_teacher='';
let Back_End_teacher='';
let UiUx_teacher='';
let Graphic_teacher='';
// Front-End teacher
pool.query('SELECT * FROM teachers WHERE course_id=$1',[1],(error,result)=>{
    if(error){
        console.log('an error exict in Front-teacher',error);
    }
    else{
       Front_teacher=result.rows[0];    
    }
});
// backend teacher
pool.query('SELECT * FROM teachers WHERE course_id=$1',[2],(error,result)=>{
    if(error){
        console.log('an error exict in Front-teacher',error);
    }
    else{
        Back_End_teacher=result.rows[0];
    }
});
// uiux teacher
pool.query('SELECT * FROM teachers WHERE course_id=$1',[3],(error,result)=>{
    if(error){
        console.log('an error exict in Front-teacher',error);
    }
    else{
       UiUx_teacher=result.rows[0];
    }
});
// graphic teacher
pool.query('SELECT * FROM teachers WHERE course_id=$1',[4],(error,result)=>{
    if(error){
        console.log('an error exict in Front-teacher',error);
    }
    else{
       Graphic_teacher=result.rows[0];
    }
});
// send student data
app.get('/lessons/:courseType/students', tokenMid,(req, res) => {
    const { courseType } = req.params;
    let courseName;
    if (courseType === 'front') {
        courseName = 'Front-End';
    } 
    else if (courseType === 'backend') {
        courseName = 'Back-End';
    } 
    else if (courseType === 'uiux') {
        courseName = 'UI & UX';
    } 
    else if(courseType === 'graphic'){
        courseName = 'Graphic'
    }
    else 
    {
        return res.status(400).send('Invalid course type');
    }

    pool.query('SELECT * FROM enrollment JOIN courses ON courses.id=course_id JOIN student ON student.id=student_id WHERE course_name=$1', [courseName], (error, result) => {
        if (error) {
            console.log('An error occurred', error);
            return res.status(500).send('Server Error');
        } else {
            res.send(result.rows); 
        }
    });
});
// send the lessons data
app.get('/lessons/:courseType', tokenMid,(req, res) => {
    const { courseType } = req.params;
    let courseId;
    if (courseType === 'front') {
        courseId = 1;
    } 
    else if (courseType === 'backend') {
        courseId = 2;
    } 
    else if (courseType === 'uiux') {
        courseId = 3;
    } 
    else if(courseType === 'graphic'){
        courseId = 4;
    }
    else 
    {
        return res.status(400).send('Invalid course type');
    }

    pool.query('SELECT * FROM lessons WHERE course_id=$1',[courseId],(error,result)=>{
        if(error){
            console.log('uiux-error',error);
            
        }
        else{
            res.send(result.rows);             
        }
    });
});
// add new lesson
app.post('/lessons/:currentPath/new', tokenMid, upload.fields([{ name: 'video' }, { name: 'pdf' }]), (req, res) => {
    const { title, description } = req.body;
    console.log('this is new lesson',title);
    const course = req.params.currentPath;
    let teacherName='';
    let id = '';

    switch (course) {
        case 'front':
            id = 1;
            teacherName=Front_teacher.fullname;
            break;
        case 'backend':
            id = 2;
            teacherName=Back_End_teacher.fullname;
            break;
        case 'uiux':
            id = 3;
            teacherName=UiUx_teacher.fullname;
            break;
        case 'graphic':
            id = 4;
            teacherName=Graphic_teacher.fullname;
            break;
        default:
            return res.status(400).json({ message: 'Invalid course' });
    }

    const videoFile = req.files['video'] ? req.files['video'][0] : null;
    const pdfFile = req.files['pdf'] ? req.files['pdf'][0] : null;
    const videoPath = videoFile ? `/uploads/${videoFile.filename}` : null; // Use the filename
    const pdfPath = pdfFile ? `/uploads/${pdfFile.filename}` : null; // Use the filename

    // insert new lesson to the database
    pool.query(`INSERT INTO lessons (title, description, video, pdf, course_id) VALUES ($1, $2, $3, $4, $5)`,
         [title, description, videoPath, pdfPath, id], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json({ success: true, message: 'Lesson added successfully!' });
    });
//    insert new notification
    pool.query('INSERT INTO notifications (teacher_name,lesson_title,course_id) VALUES ($1,$2,$3)',[teacherName,title,id],(err,result)=>{
        if(err){
            console.log('add notificaton error',err);
        }
    })

});
// edit lesson
app.get('/lessons/:courseType/edit/:id', tokenMid,(req, res) => {
    let id = parseInt(req.params.id);
    // select lesson according to the it's id
    pool.query('SELECT * FROM lessons WHERE id=$1', [id], (error, result) => {
        if (error) {
            console.log('edit-error', error);
            return res.status(500).send('Internal Server Error'); // Send a response in case of error
        }
        if (result.rows.length === 0) {
            return res.status(404).send('Lesson not found');
        }
        res.send(result.rows[0]);       
    });
});
// edit put method
app.put('/lessons/:courseType/edit/:id', tokenMid,upload.fields([{ name: 'video' }, { name: 'pdf' }]), (req, res) => {
    const { title, description } = req.body;
    const courseType = req.params.courseType;
    const id = parseInt(req.params.id);
    const videoFile = req.files['video'] ? req.files['video'][0] : null;
    const pdfFile = req.files['pdf'] ? req.files['pdf'][0] : null;
    const videoPath = videoFile ? `/uploads/${videoFile.filename}` : null; // Use the filename
    const pdfPath = pdfFile ? `/uploads/${pdfFile.filename}` : null; // Use the filename
    const query = ` UPDATE lessons SET title = $1, description = $2, video = COALESCE($3, video), pdf = COALESCE($4, pdf) 
     WHERE id = $5
    `;
    pool.query(query, [title, description, videoPath, pdfPath, id], (error, results) => {
        if (error) {
            console.error('Update error:', error);
            return res.status(500).send('Internal Server Error');
        }

        res.status(200).json({ message: 'Lesson updated successfully!' });
    });
});
// Delete lessons and notification
app.delete('/lessons/:courseType/delete/:id',tokenMid, (req, res) => {
    const course = req.params.courseType;
    const id = req.params.id;
     // delete notification from database
     pool.query('DELETE FROM notifications WHERE lesson_title IN (SELECT title FROM lessons WHERE id = $1)',[id],(err,result)=>{
        if(err){
            console.log('delete notification erro ',err);
            
        }
     })
    // delete lesson from database
    pool.query('DELETE FROM lessons WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.log('Delete error', err);
            return res.status(500).send('Error deleting lesson');
        }
        res.status(200).send(result.rows);
    });
   
});
// delete student
app.delete('/lessons/:courseType/students/delete/:id', tokenMid,(req, res) => {
    const course = req.params.courseType;
    const id = req.params.id;
    // delete student from database according their id
    pool.query('DELETE FROM student WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.log('Delete error', err);
            return res.status(500).send('Error deleting lesson');
        }
        res.status(200).send(result.rows);
    });
});
// send notification
app.get('/lessons/:courseType/notification',tokenMid,(req,res)=>{
   let course=req.params.courseType;
   let id='';
   if(course == 'front'){
    id=1;
   }
   else if(course == 'backend'){
    id=2;
   }
   else if(course == 'uiux'){
    id=3;
   }
   else if(course == 'graphic'){
    id=4;
   }
   pool.query('SELECT * FROM notifications WHERE course_id=$1',[id],(err,result)=>{
    if(err){
        console.log('get notification err',err); 
    }
    res.send(result.rows);
   })
})
// send porofile data
app.get('/lessons/:courseType/profile',tokenMid,(req,res)=>{
    const userId = req.user.newStudentId;
    pool.query('SELECT * FROM student WHERE id=$1',[userId],(err,result)=>{
     if(err){
        console.log('profile err',err);
        return res.status(500).send('Error profile getting')
     }
     res.status(200).send(result.rows[0]);
     console.log('profile',result.rows[0]);
     
    })
})
// update pofile
app.put('/lessons/:courseType/profile', tokenMid, upload.single('profileImg'), async (req, res) => {
    if (req.fileValidationError) {
        return res.status(400).send(req.fileValidationError); }
    const { fname, lname } = req.body;
    const userId = req.user.newStudentId;  // get user ID from token
    const username = req.user.username;   //get username from tokem
    let imagePath = null; // Initialize imagePath
    // Check if a file was uploaded
    if (req.file) {
        imagePath = req.file.path.replace(/\\/g, '/').replace('public', ''); // Format image path
    }
    try {
        // Update the students profile in the database
        await pool.query('UPDATE student SET fname = $1, lname = $2, profileimg = $3 WHERE id = $4', 
            [fname, lname, imagePath || null, userId]); // Use the existing image if imagePath is null
        // Update the teachers profile in the database
        await pool.query('UPDATE teachers SET fullname = $1 WHERE email = $2', [fname + ' ' + lname, username]);
        
        res.status(200).send('Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Error updating profile: ' + error.message);
    }
});
// register
app.post('/register', upload.single('profileImage'), async (req, res) => {
    const { firstName, lastName, gender, course, username, password } = req.body;
    const profileImagePath = req.file ? `/uploads/${req.file.filename}` : null; // Correctly format the image path
    const fullname=firstName+' '+lastName;
    console.log('Registration Data:', req.body); // Log incoming data
    try {
        // identify teachers with their username to navigate them to their speacial class
          if(username == 'emmajohson@gmail.com'|| username == 'liambrown@gmail.com' || username== 'olviasmith@gmail.com' || username == 'noahdavis@gmail.com'){
             let course_id;
             if(username == 'emmajohson@gmail.com'){
                course_id=1;
             }
             else if(username == 'liambrown@gmail.com'){
                course_id=2;
             }
             else if(username == 'olviasmith@gmail.com'){
                course_id=3;
             }
             else if(username == 'noahdavis@gmail.com'){
                course_id=4;
             }
            //  check if the username exist in the database
            const checkResult=await pool.query('SELECT * FROM teachers WHERE email = $1',[username]);
             if(checkResult.rows.length > 0){
                return res.status(400).send('You are already registered, please sign in.'); 
             }
            //  useing bcrypt to hash password
             const hash = await bcrypt.hash(password, saltRound);
            //  insert teacher to the database
            const result = await pool.query(
            'INSERT INTO teachers (fullname, gender, email, password,course_id, profileimg) VALUES ($1, $2, $3, $4, $5, $6) ',
            [fullname, gender, username, hash,course_id, profileImagePath] // Save the profile image path
        );
          }
        //  check if the username exist in the database
        const checkResult = await pool.query('SELECT * FROM student WHERE email = $1', [username]);
        if (checkResult.rows.length > 0) {
            return res.status(400).send('You are already registered, please sign in.');
        }
        const hash = await bcrypt.hash(password, saltRound);
        // insert new student to the database
        const result = await pool.query(
            'INSERT INTO student (fname, lname, gender, email, password, profileimg) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [firstName, lastName, gender, username, hash, profileImagePath] 
        );
        const newStudentId = result.rows[0].id;        
        let selectedCourses = Array.isArray(course) ? course : [course];
        for (const selectedCourse of selectedCourses) {
            let courseId;
            if (selectedCourse === 'FrontEnd') courseId = 1;
            else if (selectedCourse === 'BackEnd') courseId = 2;
            else if (selectedCourse === 'uiux') courseId = 3;
            else if (selectedCourse === 'graphic') courseId = 4;
            if (courseId) {
                await pool.query('INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)', [newStudentId, courseId]);
            }
        }

        // Generate and sign the token
        const token = await JWT.sign({ username: username, newStudentId: newStudentId }, JWTSecret, { expiresIn: '3h' });
        return res.status(201).json({ success: true, message: 'Registration successful!', token });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
    }
});
// courses
app.get('/courses', tokenMid, async (req, res) => {
    const userId = req.user.newStudentId; // extract userID from the token
    try {
        // select all courses that is choosen by a user from the database
        const result = await pool.query(`
            SELECT courses.course_name, courses.instructor_name,courses.course, courses.id AS course_id
            FROM enrollment 
            JOIN courses ON courses.id = enrollment.course_id 
            WHERE enrollment.student_id = $1
        `, [userId]);
        const courses = result.rows; // Get the array of course objects
        res.send(courses); // Send the courses to the client
    } catch (error) {
        console.log('courses err', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// login
app.post('/login',upload.none(), async (req, res) => {
    const { username, password } = req.body;
    try {
        let result = await pool.query("SELECT * FROM student WHERE email = $1", [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                const token = await JWT.sign({ username: user.email, newStudentId: user.id }, JWTSecret, { expiresIn: '3h' });
                return res.json({ success: true, userType: 'student', token });
            } else {
                return res.status(401).json({ error: 'Password is not correct!' });
            }
        } else {
            result = await pool.query("SELECT * FROM teachers WHERE email = $1", [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    const token = await JWT.sign({ username: user.email, teacherId: user.id }, JWTSecret, { expiresIn: '3h' });
                    // const token = await JWT.sign({ username: user.email, teacherId: user.id }, JWTSecret, { expiresIn: '15h' });
                    return res.json({ success: true, userType: 'teacher', token });
                } else {
                    return res.status(401).json({ error: 'Password is not correct!' });
                }
            } else {
                return res.status(404).json({ error: "User not found, please sign up." });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(PORT,()=>{
    console.log(`app is running on port ${PORT}`);
})