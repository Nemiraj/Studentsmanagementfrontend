import axios from 'axios';

// Production API URL - Render Backend
const BASE = 'https://studentsmanagementbackend.onrender.com/api/students';

export const getStudents = (search = '') =>
  axios.get(BASE, { params: search ? { search } : {} }).then(r => r.data.data);

export const createStudent = (data) =>
  axios.post(BASE, data).then(r => r.data.data);

export const updateStudent = (id, data) =>
  axios.put(`${BASE}/${id}`, data).then(r => r.data.data);

export const deleteStudent = (id) =>
  axios.delete(`${BASE}/${id}`).then(r => r.data);
