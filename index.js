const express = require('express');
const app = express();

const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
mongoose.connect('mongodb://127.0.0.1:27017/school');
mongoose.set('strictQuery', false);

app.use(express.json());

app.post('/api/register', async (req, res) => {
    try {
        const { teacher, students } = req.body;

        const teacherData = await Teacher.findOne({ name: teacher });
        if (!teacherData) {
            teacherData = new Teacher({ name: teacher });
            await teacherData.save();
        }

        const studentData = [];
        for (const student of students) {
            let studentDoc = await Student.findOne({ name: student });
            if (!studentDoc) {
                studentDoc = new Student({ name: student });
                await studentDoc.save();
            }
            studentData.push(studentDoc.id);
        }

        teacherData.students.push(...studentData);
        await teacherData.save();

        res.status(204).send();
    } catch (e) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/commonstudents', async (req, res) => {
    try {
        const teachers = req.query.teacher;

        if (!teachers) return res.status(400).json({ message: 'Missing teacher query parameter' });

        const teacherEmails = typeof teachers === 'string' ? [teachers] : teachers;

        const teachersDocs = await Teacher.find({ email: { $in: teacherEmails } });
        if (!teachersDocs || teachersDocs.length !== teacherEmails.length) {
            return res.json(400).json({ message: 'One or more teacher were not found' });
        }

        const studentIds = teachers.reduce((acc, teacher) => {
            return acc.length === 0 ? teacher.students : acc.filter(id => teacher.students.includes(id));
        }, []);

        const students = await Student.find({ _id: { $in: studentIds } });
        return res.status(200).json({ students: students.map(student => student.email) });
    } catch (e) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/suspend', async (req, res) => {
    try {
        const studentEmail = req.body.student;
        if (!studentEmail) {
            return res.status(400).json({ error: 'Missing student in request body' });
        }

        const student = await Student.findOne({ email: studentEmail });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        student.suspended = true;
        await student.save();

        return res.status(204).end();
    } catch (e) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/retrievefornotifications', async (req, res) => {
    try {
        const { teacher, notification } = req.body;

        const teacherDoc = await Teacher.findOne({ email: teacher });
        if (!teacherDoc) {
            return res.status(400).json({ message: 'Teacher not found' });
        }

        const studentDocs = await Student.find({ teachers: { $in: teacherDoc.students } });

        const studentEmails = studentDocs.filter(student => !student.suspended).map(student => student.email);

        const mentioned = notification.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);

        return res.status(200).json({ recipients: [...new Set([...new Set([...studentEmails, ...mentioned])])] });
    } catch (e) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(3001);
