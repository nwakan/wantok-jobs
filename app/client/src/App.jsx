import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './components/Toast';

// Loading fallback
const Loading = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

// Lazy wrapper with Suspense + ErrorBoundary
const Lazy = ({ component: Component }) => (
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

// === Public pages (eagerly loaded — critical path) ===
import Home from './pages/Home';
import JobSearch from './pages/JobSearch';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// === Public pages (lazy — secondary) ===
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Pricing = lazy(() => import('./pages/Pricing'));
const FAQ = lazy(() => import('./pages/FAQ'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const CategoriesPage = lazy(() => import('./pages/Categories'));
const CategoryLanding = lazy(() => import('./pages/CategoryLanding'));
const CompaniesPage = lazy(() => import('./pages/Companies'));
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfile'));
const CompanyReviews = lazy(() => import('./pages/CompanyReviews'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Stats = lazy(() => import('./pages/Stats'));
const ReferenceResponse = lazy(() => import('./pages/ReferenceResponse'));

// === Shared dashboard ===
const ChangePassword = lazy(() => import('./pages/dashboard/shared/ChangePassword'));

// === Jobseeker dashboard ===
const JobseekerOverview = lazy(() => import('./pages/dashboard/jobseeker/Overview'));
const MyApplications = lazy(() => import('./pages/dashboard/jobseeker/MyApplications'));
const MyOffers = lazy(() => import('./pages/dashboard/jobseeker/MyOffers'));
const SavedJobs = lazy(() => import('./pages/dashboard/jobseeker/SavedJobs'));
const JobseekerProfile = lazy(() => import('./pages/dashboard/jobseeker/Profile'));
const JobAlerts = lazy(() => import('./pages/dashboard/jobseeker/JobAlerts'));
const JobseekerMessages = lazy(() => import('./pages/dashboard/jobseeker/Messages'));
const Recommendations = lazy(() => import('./pages/dashboard/jobseeker/Recommendations'));
const JobseekerSettings = lazy(() => import('./pages/dashboard/jobseeker/Settings'));

// === Employer dashboard ===
const EmployerOverview = lazy(() => import('./pages/dashboard/employer/Overview'));
const MyJobs = lazy(() => import('./pages/dashboard/employer/MyJobs'));
const PostJob = lazy(() => import('./pages/dashboard/employer/PostJob'));
const Applicants = lazy(() => import('./pages/dashboard/employer/Applicants'));
const CompareApplicants = lazy(() => import('./pages/dashboard/employer/CompareApplicants'));
const OfferLetters = lazy(() => import('./pages/dashboard/employer/OfferLetters'));
const CompanyProfile = lazy(() => import('./pages/dashboard/employer/CompanyProfile'));
const CandidateSearch = lazy(() => import('./pages/dashboard/employer/CandidateSearch'));
const SavedCandidates = lazy(() => import('./pages/dashboard/employer/SavedCandidates'));
const EmployerAnalytics = lazy(() => import('./pages/dashboard/employer/Analytics'));
const EmployerOrdersBilling = lazy(() => import('./pages/dashboard/employer/OrdersBilling'));
const EmployerMessages = lazy(() => import('./pages/dashboard/employer/Messages'));

// === Admin dashboard ===
const AdminOverview = lazy(() => import('./pages/dashboard/admin/Overview'));
const ManageUsers = lazy(() => import('./pages/dashboard/admin/ManageUsers'));
const ManageJobs = lazy(() => import('./pages/dashboard/admin/ManageJobs'));
const AdminSettings = lazy(() => import('./pages/dashboard/admin/Settings'));
const AdminOrders = lazy(() => import('./pages/dashboard/admin/Orders'));
const AdminPlans = lazy(() => import('./pages/dashboard/admin/Plans'));
const AdminCategories = lazy(() => import('./pages/dashboard/admin/Categories'));
const AdminReports = lazy(() => import('./pages/dashboard/admin/Reports'));
const AdminBanners = lazy(() => import('./pages/dashboard/admin/Banners'));
const AdminArticles = lazy(() => import('./pages/dashboard/admin/Articles'));
const AdminNewsletter = lazy(() => import('./pages/dashboard/admin/Newsletter'));
const AdminMessages = lazy(() => import('./pages/dashboard/admin/Messages'));
const AdminContactMessages = lazy(() => import('./pages/dashboard/admin/ContactMessages'));
const AdminAIAgents = lazy(() => import('./pages/dashboard/admin/AIAgents'));
const AdminFraudSecurity = lazy(() => import('./pages/dashboard/admin/FraudSecurity'));

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
              {/* Public routes — eager */}
              <Route index element={<Home />} />
              <Route path="jobs" element={<JobSearch />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />

              {/* Public routes — lazy */}
              <Route path="about" element={<Lazy component={About} />} />
              <Route path="contact" element={<Lazy component={Contact} />} />
              <Route path="privacy" element={<Lazy component={Privacy} />} />
              <Route path="terms" element={<Lazy component={Terms} />} />
              <Route path="pricing" element={<Lazy component={Pricing} />} />
              <Route path="faq" element={<Lazy component={FAQ} />} />
              <Route path="categories" element={<Lazy component={CategoriesPage} />} />
              <Route path="category/:slug" element={<Lazy component={CategoryLanding} />} />
              <Route path="companies" element={<Lazy component={CompaniesPage} />} />
              <Route path="companies/:id" element={<Lazy component={CompanyProfilePage} />} />
              <Route path="companies/:id/reviews" element={<Lazy component={CompanyReviews} />} />
              <Route path="blog" element={<Lazy component={Blog} />} />
              <Route path="blog/:slug" element={<Lazy component={BlogPost} />} />
              <Route path="stats" element={<Lazy component={Stats} />} />
              <Route path="forgot-password" element={<Lazy component={ForgotPassword} />} />
              <Route path="reset-password" element={<Lazy component={ResetPassword} />} />
              <Route path="verify-email" element={<Lazy component={VerifyEmail} />} />
              <Route path="references/respond/:token" element={<Lazy component={ReferenceResponse} />} />

              {/* Jobseeker dashboard */}
              <Route path="dashboard/jobseeker" element={<ProtectedRoute role="jobseeker" />}>
                <Route index element={<Lazy component={JobseekerOverview} />} />
                <Route path="applications" element={<Lazy component={MyApplications} />} />
                <Route path="offers" element={<Lazy component={MyOffers} />} />
                <Route path="offers/:id" element={<Lazy component={MyOffers} />} />
                <Route path="saved" element={<Lazy component={SavedJobs} />} />
                <Route path="job-alerts" element={<Lazy component={JobAlerts} />} />
                <Route path="recommendations" element={<Lazy component={Recommendations} />} />
                <Route path="messages" element={<Lazy component={JobseekerMessages} />} />
                <Route path="profile" element={<Lazy component={JobseekerProfile} />} />
                <Route path="settings" element={<Lazy component={JobseekerSettings} />} />
                <Route path="change-password" element={<Lazy component={ChangePassword} />} />
              </Route>

              {/* Employer dashboard */}
              <Route path="dashboard/employer" element={<ProtectedRoute role="employer" />}>
                <Route index element={<Lazy component={EmployerOverview} />} />
                <Route path="jobs" element={<Lazy component={MyJobs} />} />
                <Route path="post-job" element={<Lazy component={PostJob} />} />
                <Route path="edit-job/:id" element={<Lazy component={PostJob} />} />
                <Route path="applicants" element={<Lazy component={Applicants} />} />
                <Route path="applicants/:jobId" element={<Lazy component={Applicants} />} />
                <Route path="compare-applicants" element={<Lazy component={CompareApplicants} />} />
                <Route path="offer-letters" element={<Lazy component={OfferLetters} />} />
                <Route path="offer-letters/:id" element={<Lazy component={OfferLetters} />} />
                <Route path="candidate-search" element={<Lazy component={CandidateSearch} />} />
                <Route path="saved-candidates" element={<Lazy component={SavedCandidates} />} />
                <Route path="analytics" element={<Lazy component={EmployerAnalytics} />} />
                <Route path="orders-billing" element={<Lazy component={EmployerOrdersBilling} />} />
                <Route path="messages" element={<Lazy component={EmployerMessages} />} />
                <Route path="profile" element={<Lazy component={CompanyProfile} />} />
                <Route path="change-password" element={<Lazy component={ChangePassword} />} />
              </Route>

              {/* Admin dashboard */}
              <Route path="dashboard/admin" element={<ProtectedRoute role="admin" />}>
                <Route index element={<Lazy component={AdminOverview} />} />
                <Route path="users" element={<Lazy component={ManageUsers} />} />
                <Route path="jobs" element={<Lazy component={ManageJobs} />} />
                <Route path="orders" element={<Lazy component={AdminOrders} />} />
                <Route path="plans" element={<Lazy component={AdminPlans} />} />
                <Route path="categories" element={<Lazy component={AdminCategories} />} />
                <Route path="reports" element={<Lazy component={AdminReports} />} />
                <Route path="banners" element={<Lazy component={AdminBanners} />} />
                <Route path="articles" element={<Lazy component={AdminArticles} />} />
                <Route path="newsletter" element={<Lazy component={AdminNewsletter} />} />
                <Route path="messages" element={<Lazy component={AdminMessages} />} />
                <Route path="contact-messages" element={<Lazy component={AdminContactMessages} />} />
                <Route path="ai-agents" element={<Lazy component={AdminAIAgents} />} />
                <Route path="security" element={<Lazy component={AdminFraudSecurity} />} />
                <Route path="settings" element={<Lazy component={AdminSettings} />} />
                <Route path="change-password" element={<Lazy component={ChangePassword} />} />
              </Route>

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Route>
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
