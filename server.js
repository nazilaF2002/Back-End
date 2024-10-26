const express =require('express');
const bodyParser =require('body-parser');
const {Pool} =require('pg');
const multer =require('multer') ;
const app = express();
const cors = require('cors');
const path = require('path');
const bcrypt=require('bcrypt');
const {hash} = require('bcrypt');
const session = require('express-session');
const JWT= require('jsonwebtoken');
const PORT=5000;
const saltRound=10;
const pool = new Pool({
    user:'postgres',
    host:'localhost',
    database:'Online-learning-platform',
    password:'postgres',
    port:5432
});

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key',
    // resave: true,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads'); // Specify the upload directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the file name
    },
});
const upload = multer({ storage });

const JWTSecret='sklfh3fdh4h534h6bhk3h46hhh3k2h4b2hj6h2hk2';
app.post('/uploads',upload.single('file'),(req,res)=>{
    // console.log('upload'+req.body);
    console.log('second upload'+req.file.path); 
})

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
    //    console.log(Front_teacher);
       
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
app.get('/lessons/:courseType/students', (req, res) => {
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
app.get('/lessons/:courseType', (req, res) => {
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
            // console.log(result.rows);
            
        }
    });
});
// add new lesson
app.post('/lessons/:currentPath/new', upload.fields([{ name: 'video' }, { name: 'pdf' }]), (req, res) => {
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
    pool.query(`INSERT INTO lessons (title, description, video, pdf, course_id) VALUES ($1, $2, $3, $4, $5)`, [title, description, videoPath, pdfPath, id], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ message: 'Database error' });
        }
    });
//    insert new notification
    pool.query('INSERT INTO notifications (teacher_name,lesson_title,course_id) VALUES ($1,$2,$3)',[teacherName,title,id],(err,result)=>{
        if(err){
            console.log('add notificaton error',err);
        }
    })

});
// edit lesson
app.get('/lessons/:courseType/edit/:id', (req, res) => {
    let id = parseInt(req.params.id);

    console.log('this is course id ' + id);

    pool.query('SELECT * FROM lessons WHERE id=$1', [id], (error, result) => {
        if (error) {
            console.log('edit-error', error);
            return res.status(500).send('Internal Server Error'); // Send a response in case of error
        }

        if (result.rows.length === 0) {
            return res.status(404).send('Lesson not found'); // Handle case where no lesson is found
        }

        res.send(result.rows[0]); // Only send response here
        console.log( result.rows[0]);
        
    });
});
// edit put method
app.put('/lessons/:courseType/edit/:id', upload.fields([{ name: 'video' }, { name: 'pdf' }]), (req, res) => {
    const { title, description } = req.body;
    const courseType = req.params.courseType;
    const id = parseInt(req.params.id);

    // Prepare the SQL update query
    const videoPath = req.files['video'] ? req.files['video'][0].path.replace(/\\/g, '/') : null;
    const pdfPath = req.files['pdf'] ? req.files['pdf'][0].path.replace(/\\/g, '/') : null;

    // Use existing paths if new ones are not provided
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
app.delete('/lessons/:courseType/delete/:id', (req, res) => {
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
app.delete('/lessons/:courseType/students/delete/:id', (req, res) => {
    const course = req.params.courseType;
    const id = req.params.id;

    pool.query('DELETE FROM student WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.log('Delete error', err);
            return res.status(500).send('Error deleting lesson');
        }
        res.status(200).send(result.rows);
    });
});
// send notification
app.get('/lessons/:courseType/notification',(req,res)=>{
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
// send porofile content student
app.get('/lessons/:courseType/profile/:id',(req,res)=>{
    const id=req.params.id;
    pool.query('SELECT * FROM student WHERE id=$1',[id],(err,result)=>{
     if(err){
        console.log('profile err',err);
        return res.status(500).send('Error profile getting')
     }
     res.status(200).send(result.rows[0]);
    })
})
// register new student
app.post('/register', upload.none(), async (req, res) => {
    const { firstName, lastName, gender, course, username, password } = req.body;
    console.log('Registration Data:', req.body); // Log incoming data
    try {
        const checkResult = await pool.query('SELECT * FROM student WHERE email = $1', [username]);
        if (checkResult.rows.length > 0) {
            return res.status(400).send('You are already registered, please sign in.');
        }
        const hash = await bcrypt.hash(password, saltRound);
        const result = await pool.query(
            'INSERT INTO student (fname, lname, gender, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [firstName, lastName, gender, username, hash]
        );
        const newStudentId = result.rows[0].id;
        // Store selected courses in the session
        req.session.selectedCourses = Array.isArray(course) ? course : [course];
        console.log('Stored Courses in Session:', req.session.selectedCourses); // Log to verify
        console.log('Session after registration:', req.session);
        for (const selectedCourse of req.session.selectedCourses) {
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
        const token = await JWT.sign({ username: username }, JWTSecret, { expiresIn: '1000h' });
        // Save the token in the session
        req.session.token = token;
        console.log('Generated Token:', token);
        console.log('this is a test');
        return res.status(201).json({ success: true, message: 'Registration successful!', token });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
    }
});
// get courses 
app.get('/courses', async (req, res) => {
    try {
        const courses = [];
        const selectedCourses = req.session.selectedCourses || []; // Use session variable
        console.log('Selected courses:', selectedCourses); // Log selected courses
         console.log('inside of courses', req.session.selectedCourse);
        // console.log('Session:', req.session);
        for (const courseName of selectedCourses) {
            const result = await pool.query('SELECT * FROM courses WHERE course = $1', [courseName]);
            courses.push(...result.rows);
        }
        res.send(courses);
        // res.json(courses);
    } catch (error) {
        console.log('courses err', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// login
app.post('/login', upload.none(), async (req, res) => {
    const { username, password } = req.body;
    // console.log('Session at Login:', req.session);
    try {
        let result = await pool.query("SELECT * FROM student WHERE email = $1", [username]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                return res.json({ success: true, userType: 'student' });
            } else {
                return res.status(401).json({ error: 'Password is not correct!' });
            }
        } else {
            result = await pool.query("SELECT * FROM teachers WHERE email = $1", [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    return res.json({ success: true, userType: 'teacher', teacherId: user.id });
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