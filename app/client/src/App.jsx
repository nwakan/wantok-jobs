import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

// Public pages
import Home from './pages/Home';
import JobSearch from './pages/JobSearch';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import NotFound from './pages/NotFound';

// Shared dashboard
import ChangePassword from './pages/dashboard/shared/ChangePassword';

// Jobseeker dashboard
import JobseekerOverview from './pages/dashboard/jobseeker/Overview';
import MyApplications from './pages/dashboard/jobseeker/MyApplications';
import SavedJobs from './pages/dashboard/jobseeker/SavedJobs';
import JobseekerProfile from './pages/dashboard/jobseeker/Profile';

// Employer dashboard
import EmployerOverview from './pages/dashboard/employer/Overview';
import MyJobs from './pages/dashboard/employer/MyJobs';
import PostJob from './pages/dashboard/employer/PostJob';
import Applicants from './pages/dashboard/employer/Applicants';
import CompanyProfile from './pages/dashboard/employer/CompanyProfile';

// Admin dashboard
import AdminOverview from './pages/dashboard/admin/Overview';
import ManageUsers from './pages/dashboard/admin/ManageUsers';
import ManageJobs from './pages/dashboard/admin/ManageJobs';
import Settings from './pages/dashboard/admin/Settings';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="jobs" element={<JobSearch />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="about" element={<About />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />

              {/* Jobseeker dashboard */}
              <Route path="dashboard/jobseeker" element={<ProtectedRoute role="jobseeker" />}>
                <Route index element={<ErrorBoundary><JobseekerOverview /></ErrorBoundary>} />
                <Route path="applications" element={<ErrorBoundary><MyApplications /></ErrorBoundary>} />
                <Route path="saved" element={<ErrorBoundary><SavedJobs /></ErrorBoundary>} />
                <Route path="profile" element={<ErrorBoundary><JobseekerProfile /></ErrorBoundary>} />
                <Route path="change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />
              </Route>

              {/* Employer dashboard */}
              <Route path="dashboard/employer" element={<ProtectedRoute role="employer" />}>
                <Route index element={<ErrorBoundary><EmployerOverview /></ErrorBoundary>} />
                <Route path="jobs" element={<ErrorBoundary><MyJobs /></ErrorBoundary>} />
                <Route path="post-job" element={<ErrorBoundary><PostJob /></ErrorBoundary>} />
                <Route path="edit-job/:id" element={<ErrorBoundary><PostJob /></ErrorBoundary>} />
                <Route path="applicants/:jobId" element={<ErrorBoundary><Applicants /></ErrorBoundary>} />
                <Route path="profile" element={<ErrorBoundary><CompanyProfile /></ErrorBoundary>} />
                <Route path="change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />
              </Route>

              {/* Admin dashboard */}
              <Route path="dashboard/admin" element={<ProtectedRoute role="admin" />}>
                <Route index element={<ErrorBoundary><AdminOverview /></ErrorBoundary>} />
                <Route path="users" element={<ErrorBoundary><ManageUsers /></ErrorBoundary>} />
                <Route path="jobs" element={<ErrorBoundary><ManageJobs /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                <Route path="change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />
              </Route>

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
