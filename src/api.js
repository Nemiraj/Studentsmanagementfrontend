import axios from 'axios';

const BASE = '/api/students';

export const getStudents = (search = '') =>
  axios.get(BASE, { params: search ? { search } : {} }).then(r => r.data.data);

export const createStudent = (data) =>
  axios.post(BASE, data).then(r => r.data.data);

export const updateStudent = (id, data) =>
  axios.put(`${BASE}/${id}`, data).then(r => r.data.data);

export const deleteStudent = (id) =>
  axios.delete(`${BASE}/${id}`).then(r => r.data);
