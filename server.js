
const express =require('express');
const bodyParser =require('body-parser');
const {Pool} =require('pg');
const multer =require('multer') ;
const app = express();
const cors = require('cors');
const path = require('path');
const bcrypt=require('bcrypt');
const {hash} = require('bcrypt');
// import bcrypt, { hash } from 'bcrypt';
// const nodemailer = require('nodemailer');
const PORT=5000;
const saltRound=10;
// const numberToHash = '123g'; // Replace with your number
// bcrypt.hash(numberToHash, saltRound, function(err, hash) {
//     console.log(hash);
// });
const pool = new Pool({
    user:'postgres',
    host:'localhost',
    database:'Online-learning-platform',
    password:'postgres',
    port:5432
});
app.use(cors());
app.use(express.static("public"));
// app.use('/uploads',express.static(path.join(__dirname, 'public')));
// app.use('/uploads',express.static(path.join(__dirname, 'public/public')));
// using multer for uploding files
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       const courseName = req.params.courseName; 
//       const dir = `uploads/${courseName}`;
  
//       if (!fs.existsSync(dir)){
//         fs.mkdirSync(dir, { recursive: true });
//       }
//       cb(null, dir);
//     },
//     filename: (req, file, cb) => {
//       cb(null, Date.now() + path.extname(file.originalname));  
//     }
//   });
//    const upload = multer({ storage: storage })
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads'); // Specify the upload directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the file name
    },
});
const upload = multer({ storage });
app.use(bodyParser.urlencoded({ extended: true }));

// Email configuration
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // Use your email service
//     auth: {
//         user: 'nazilafaizzadah37@gmail.com',
//         pass: '12345678',
//     },
// });


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
    const videoPath = videoFile ? videoFile.path.replace(/\\/g, '/') : null;
    const pdfPath = pdfFile ? pdfFile.path.replace(/\\/g, '/') : null;

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
// register new students
// app.post('/register', upload.none(), async (req, res) => {
//     const { firstName, lastName, gender, course, username, password } = req.body;
//     try {
//         const checkResult = await pool.query('SELECT * FROM student WHERE email = $1', [username]);
//         if (checkResult.rows.length > 0) {
//             return res.status(400).send('You are already registered, please sign in.');
//         }
//         bcrypt.hash(password, saltRound, async (err, hash) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send('Internal server error');
//             }
//             const result = await pool.query(
//                 'INSERT INTO student (fname, lname, gender, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
//                 [firstName, lastName, gender, username, hash]
//             );
//             const newStudentId = result.rows[0].id;
//             // Enroll the student in selected courses
//             const selectedCourses = Array.isArray(course) ? course : [course]; // Ensure it's an array
//             console.log('this are courses',selectedCourses);  
//             const classes = []; // Array to hold course data  
//             for (let selectedCourse of selectedCourses) {
//                 let courseId;
//                 // Use if-else to determine course ID
//                 if (selectedCourse === 'FrontEnd') {
//                     courseId = 1;
//                 } else if (selectedCourse === 'BackEnd') {
//                     courseId = 2;
//                 } else if (selectedCourse === 'uiux') {
//                     courseId = 3;
//                 } else if (selectedCourse === 'graphic') {
//                     courseId = 4;
//                 }
//                 // Insert into enrollment table if a valid course ID is found
//                 if (courseId) {
//                    await pool.query('INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)', [newStudentId, courseId]);
//                   let courseData=  await pool.query('SELECT * FROM courses WHERE id=$1',[courseId]);
//                   classes.push(courseData.rows[0]); // Push the course data to the classes array
//                 //   classes.push(courseData.rows[0]); // Push the course data to the classes array
//                 }
//             }
//             return res.status(201).json({ success: true, message: 'Registration successful!', classes });
//             // return res.status(201).json({ success: true, message: 'Registration successful!' });
//         });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).send('Internal server error');
//     }
// });


// register new students
// let selectedCourses=[];
// app.post('/register', upload.none(), async (req, res) => {
//     const { firstName, lastName, gender, course, username, password } = req.body;
//     try {
//         const checkResult = await pool.query('SELECT * FROM student WHERE email = $1', [username]);
//         if (checkResult.rows.length > 0) {
//             return res.status(400).send('You are already registered, please sign in.');
//         }
//         bcrypt.hash(password, saltRound, async (err, hash) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send('Internal server error');
//             }
//             const result = await pool.query(
//                 'INSERT INTO student (fname, lname, gender, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
//                 [firstName, lastName, gender, username, hash]
//             );
//             const newStudentId = result.rows[0].id;
//              selectedCourses = Array.isArray(course) ? course : [course];
//             const classes = []; // Array to hold course data

//             for (let selectedCourse of selectedCourses) {
//                 let courseId;
//                 if (selectedCourse === 'FrontEnd') {
//                     courseId = 1;
//                 } else if (selectedCourse === 'BackEnd') {
//                     courseId = 2;
//                 } else if (selectedCourse === 'uiux') {
//                     courseId = 3;
//                 } else if (selectedCourse === 'graphic') {
//                     courseId = 4;
//                 }

//                 if (courseId) {
//                     await pool.query('INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)', [newStudentId, courseId]);
//                     const courseData = await pool.query('SELECT * FROM courses WHERE id=$1', [courseId]);
//                     classes.push(courseData.rows[0]); // Push the first element of the array
//                 }
//             }

//             return res.status(201).json({ success: true, message: 'Registration successful!', classes });
//         });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).send('Internal server error');
//     }
// });

let selectedCourses = [];

app.post('/register', upload.none(), async (req, res) => {
    console.log(req.body); // Log incoming data
    const { firstName, lastName, gender, course, username, password } = req.body;
    try {
        const checkResult = await pool.query('SELECT * FROM student WHERE email = $1', [username]);
        if (checkResult.rows.length > 0) {
            return res.status(400).send('You are already registered, please sign in.');
        }
        // Hash the password
        bcrypt.hash(password, saltRound, async (err, hash) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal server error');
            }
            const result = await pool.query(
                'INSERT INTO student (fname, lname, gender, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [firstName, lastName, gender, username, hash]
            );
            const newStudentId = result.rows[0].id;
              selectedCourses = Array.isArray(course) ? course : [course]; // Ensure this is set correctly
            console.log('Selected courses:', selectedCourses); // Log to check

            for (let selectedCourse of selectedCourses) {
                let courseId;
                if (selectedCourse === 'FrontEnd') {
                    courseId = 1;
                } else if (selectedCourse === 'BackEnd') {
                    courseId = 2;
                } else if (selectedCourse === 'uiux') {
                    courseId = 3;
                } else if (selectedCourse === 'graphic') {
                    courseId = 4;
                }
                if (courseId) {
                    await pool.query('INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)', [newStudentId, courseId]);  
                }
            }
           console.log('inside register',selectedCourses);
           
            return res.status(201).json({ success: true, message: 'Registration successful!' });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
    }
});
// let selectedCourses = [];

// app.post('/register', upload.none(), async (req, res) => {
//     console.log(req.body); // Log incoming data
//     const { firstName, lastName, gender, course, username, password } = req.body;
//     try {
//         const checkResult = await pool.query('SELECT * FROM student WHERE email = $1', [username]);
//         if (checkResult.rows.length > 0) {
//             return res.status(400).send('You are already registered, please sign in.');
//         }
//         // Hash the password
//         bcrypt.hash(password, saltRound, async (err, hash) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send('Internal server error');
//             }
//             const result = await pool.query(
//                 'INSERT INTO student (fname, lname, gender, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
//                 [firstName, lastName, gender, username, hash]
//             );
//             const newStudentId = result.rows[0].id;
//             selectedCourses = Array.isArray(course) ? course : [course]; // Ensure this is set correctly
//             console.log('Selected courses:', selectedCourses); // Log to check

//             const classes = []; // Array to hold course data
//             for (let selectedCourse of selectedCourses) {
//                 let courseId;
//                 if (selectedCourse === 'FrontEnd') {
//                     courseId = 1;
//                 } else if (selectedCourse === 'BackEnd') {
//                     courseId = 2;
//                 } else if (selectedCourse === 'uiux') {
//                     courseId = 3;
//                 } else if (selectedCourse === 'graphic') {
//                     courseId = 4;
//                 }

//                 if (courseId) {
//                     await pool.query('INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)', [newStudentId, courseId]);
//                     const courseData = await pool.query('SELECT * FROM courses WHERE id=$1', [courseId]);
//                     classes.push(courseData.rows[0]);
//                 }
//             }
//            console.log('insits register',selectedCourses);
           
//             return res.status(201).json({ success: true, message: 'Registration successful!', classes });
//         });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).send('Internal server error');
//     }
// });
// courses
// console.log('out of the course',selectedCourses);

app.get('/courses', async (req, res) => {
    try {
        console.log('this is selsected courses ',selectedCourses);
        
        for (let i = 0; i < selectedCourses.length; i++) { // Fixed the loop condition
            const courseName = selectedCourses[i]; // Get the course name from the array
             await pool.query('SELECT * FROM courses WHERE course = $1', [courseName],(err,result)=>{
                if(err){
                    console.log('an error in the courses',err);
                }
                res.send(result.rows)
                console.log('this is course',result.rows);
                
            });
        }
    }
    catch(error){
        console.log('courses err',error);
        
    }
})
// login
app.post('/login', upload.none(), async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check students table first
        let result = await pool.query("SELECT * FROM student WHERE email = $1", [username]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const dbPassword = user.password;

            bcrypt.compare(password, dbPassword, (err, match) => {
                if (err) {
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (match) {
                    return res.json({ success: true, userType: 'student' });
                } else {
                    return res.status(401).json({ error: 'Password is not correct!' });
                }
            });
        } else {
            // Check teachers table
            result = await pool.query("SELECT * FROM teachers WHERE email = $1", [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const dbPassword = user.password;

                bcrypt.compare(password, dbPassword, (err, match) => {
                    if (err) {
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    if (match) {
                        // Successful teacher login, send ID
                        return res.json({ success: true, userType: 'teacher', teacherId: user.id });
                    } else {
                        return res.status(401).json({ error: 'Password is not correct!' });
                    }
                });
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