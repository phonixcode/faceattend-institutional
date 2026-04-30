import axios from 'axios'

const api = axios.create({ baseURL: 'http://127.0.0.1:8000' })

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = sessionStorage.getItem('refreshToken')
      if (refresh) {
        try {
          const { data } = await axios.post('http://127.0.0.1:8000/auth/refresh',
            { refresh_token: refresh })
          sessionStorage.setItem('token', data.access_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          sessionStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login          : (email, password)   => api.post('/auth/login', { email, password }),
  verify2faSetup : (user_id, code, is_student = false) => api.post('/auth/verify-2fa-setup', { user_id, code, is_student }),
  verify2fa      : (user_id, code, is_student = false) => api.post('/auth/verify-2fa', { user_id, code, is_student }),
  me             : ()                  => api.get('/auth/me'),
  meStudent      : ()                  => api.get('/auth/me/student'),
  updateProfile  : (data)              => api.patch('/auth/profile', data),
  updateProfileStudent: (data)         => api.patch('/auth/profile/student', data),
}

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  dashboard      : ()                  => api.get('/admin/dashboard'),
  users          : (params = {})       => api.get('/admin/users', { params: { page: 1, page_size: 20, ...params } }),
  createUser     : (data)              => api.post('/admin/users', data),
  updateUser     : (id, data)          => api.patch(`/admin/users/${id}`, data),
  deleteUser     : (id)                => api.delete(`/admin/users/${id}`),
  universities   : ()                  => api.get('/admin/universities'),
  createUniversity: (data)             => api.post('/admin/universities', data),
  departments    : ()                  => api.get('/admin/departments'),
  createDepartment: (data)             => api.post('/admin/departments', data),
  programmes     : (params = {})       => api.get('/admin/programmes', { params: { page: 1, page_size: 20, ...params } }),
  createProgramme : (data)             => api.post('/admin/programmes', data),
  updateProgramme : (id, data)         => api.patch(`/admin/programmes/${id}`, data),
  modules        : (params = {})       => api.get('/admin/modules', { params: { page: 1, page_size: 20, ...params } }),
  createModule   : (data)              => api.post('/admin/modules', data),
  updateModule   : (id, data)          => api.patch(`/admin/modules/${id}`, data),
  students       : (params = {})       => api.get('/admin/students', { params: { page: 1, page_size: 20, ...params } }),
  createStudent  : (data)              => api.post('/admin/students', data),
  updateStudent  : (id, data)          => api.patch(`/admin/students/${id}`, data),
  toggleStudent  : (id)                => api.post(`/admin/students/${id}/toggle-active`),
  admissionCohorts: ()                 => api.get('/admin/admissions/cohorts'),
  reports        : ()                  => api.get('/admin/reports'),
}

// ── Lecturer ──────────────────────────────────────────────────────────────
export const lecturerApi = {
  dashboard      : ()                  => api.get('/lecturer/dashboard'),
  modules        : ()                  => api.get('/lecturer/modules'),
  module         : (id)                => api.get(`/lecturer/modules/${id}`),
  students       : (moduleId, params = {}) => api.get(`/lecturer/modules/${moduleId}/students`, { params: { page: 1, page_size: 20, ...params } }),
  enrol          : (moduleId, data)    => api.post(`/lecturer/modules/${moduleId}/enrol`, data),
  removeStudent  : (moduleId, sid)     => api.delete(`/lecturer/modules/${moduleId}/students/${sid}`),
  createStudent  : (data)              => api.post('/lecturer/students', data),
  registerFace   : (formData)          => api.post('/lecturer/students/register-face', formData),
  bulkImport     : (moduleId, file)    => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/lecturer/modules/${moduleId}/students/bulk-import`, fd)
  },
  lectures       : (moduleId)          => api.get(`/lecturer/modules/${moduleId}/lectures`),
  createLecture  : (moduleId, data)    => api.post(`/lecturer/modules/${moduleId}/lectures`, data),
  cancelLecture  : (moduleId, lectureId) => api.delete(`/lecturer/modules/${moduleId}/lectures/${lectureId}`),
  pending        : ()                  => api.get('/lecturer/pending-registrations'),
  approve        : (id)                => api.post(`/lecturer/pending-registrations/${id}/approve`),
  reject         : (id)                => api.post(`/lecturer/pending-registrations/${id}/reject`),
  report         : (moduleId)          => api.get(`/scans/module/${moduleId}/report`),
  exportReport   : (moduleId)          => api.get(`/scans/module/${moduleId}/report/export`, { responseType: 'blob' }),
}

// ── Kiosk ─────────────────────────────────────────────────────────────────
export const kioskApi = {
  openScan       : (formData)          => api.post('/scans/open', formData),
  closeScan      : (scanId)            => api.post(`/scans/close/${scanId}`),
  checkin        : (scanId, formData)  => api.post(`/scans/${scanId}/checkin`, formData),
  scanAttendance : (scanId)            => api.get(`/scans/${scanId}/attendance`),
  lectureStatus  : (lectureId)         => api.get(`/scans/lecture/${lectureId}/status`),
  lectureSummary : (lectureId)         => api.get(`/scans/lecture/${lectureId}/summary`),
}

// ── Student ───────────────────────────────────────────────────────────────
export const studentApi = {
  dashboard      : ()                  => api.get('/student/dashboard'),
  attendance     : ()                  => api.get('/student/attendance'),
  moduleAttendance: (moduleId)         => api.get(`/student/attendance/${moduleId}`),
  modules        : ()                  => api.get('/student/modules'),
  registerFace   : (formData)          => api.post('/student/register-face', formData),
}

// ── Director ──────────────────────────────────────────────────────────────
export const directorApi = {
  dashboard      : ()                  => api.get('/director/dashboard'),
  modules        : (params = {})       => api.get('/director/modules', { params: { page: 1, page_size: 20, ...params } }),
  reports        : ()                  => api.get('/director/reports'),
}

// ── Public ────────────────────────────────────────────────────────────────
export const publicApi = {
  moduleInfo     : (moduleId)          => api.get(`/public/register/module/${moduleId}`),
  register       : (formData)          => api.post('/public/register', formData),
}

export default api