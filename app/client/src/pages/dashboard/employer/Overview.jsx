import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs, applications, profile as profileAPI } from '../../../api';
import StatsCard from '../../../components/StatsCard';
import EmailVerificationBanner from '../../../components/EmailVerificationBanner';
import { useAuth } from '../../../context/AuthContext';
import {
  TrendingUp, Eye, Briefcase, Users, Clock, Target, Award,
  ChevronRight, AlertCircle, CheckCircle2, Building2, Search,
  Bell, DollarSign, BarChart3, Calendar, FileText, Sparkles,
  MapPin, Star, MessageSquare, UserPlus
} from 'lucide-react';
import OptimizedImage from '../../../components/OptimizedImage';
import ReferralSection from '../../../components/ReferralSection';

export default function EmployerOverview() {
  const { user } = useAuth();
  const [myJobs, setMyJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [jobsData, profileData] = await Promise.all([
        jobs.getMy(),
        profileAPI.get().catch(() => null)
      ]);
      setMyJobs(jobsData);
      setProfile(profileData?.profile);

      if (jobsData.length > 0) {
        const allApps = [];
        for (const job of jobsData.slice(0, 5)) {
          try {
            const apps = await applications.getForJob(job.id);
            allApps.push(...apps.map(app => ({ ...app, job_title: job.title, job_id: job.id })));
          } catch (err) { /* skip */ }
        }
        allApps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
        setRecentApplications(allApps.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = () => {
    if (!profile) return 0;
    let s = 0, t = 10;
    if (profile.company_name) s++;
    if (profile.industry) s++;
    if (profile.company_size) s++;
    if (profile.location) s++;
    if (profile.logo_url) s++;
    if (profile.description && profile.description.length > 50) s++;
    if (profile.website) s++;
    if (profile.phone) s++;
    try { if (profile.benefits && JSON.parse(profile.benefits).length >= 3) s++; } catch {}
    try { if (profile.social_links && (JSON.parse(profile.social_links).facebook || JSON.parse(profile.social_links).linkedin)) s++; } catch {}
    return Math.round((s / t) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = {
    activeJobs: myJobs.filter(j => j.status === 'active').length,
    totalJobs: myJobs.length,
    totalViews: myJobs.reduce((sum, job) => sum + (job.views_count || 0), 0),
    totalApplications: recentApplications.length,
    pendingReviews: recentApplications.filter(app => ['applied', 'screening'].includes(app.status)).length,
    interviewScheduled: recentApplications.filter(app => app.status === 'interview').length,
    offered: recentApplications.filter(app => app.status === 'offered').length,
  };

  const completeness = calculateProfileCompleteness();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const jobPerformance = myJobs
    .filter(j => j.status === 'active')
    .slice(0, 5)
    .map(job => ({
      ...job,
      viewCount: job.views_count || 0,
      appCount: recentApplications.filter(app => app.job_id === job.id).length,
    }));

  const maxMetric = Math.max(...jobPerformance.map(j => Math.max(j.viewCount, j.appCount * 10)), 100);

  return (
    <div>
      <EmailVerificationBanner user={user} />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-8 mb-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {profile?.logo_url ? (
              <OptimizedImage src={profile.logo_url} alt={profile.company_name} width={64} height={64} className="h-16 w-16 rounded-lg bg-white object-contain p-2" eager />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-white/20 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {greeting}{profile?.company_name ? `, ${profile.company_name}` : ''}!
                <span className="ml-2">{hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙'}</span>
              </h1>
              <p className="text-primary-100">
                {stats.pendingReviews > 0
                  ? `You have ${stats.pendingReviews} application${stats.pendingReviews !== 1 ? 's' : ''} to review`
                  : stats.activeJobs > 0
                    ? `${stats.activeJobs} active job${stats.activeJobs !== 1 ? 's' : ''} running`
                    : 'Post a job to start receiving applications'
                }
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm opacity-75">Total Views</div>
            <div className="flex items-center gap-2 justify-end">
              <Eye className="w-5 h-5" />
              <span className="text-3xl font-bold">{stats.totalViews}</span>
            </div>
            <div className="text-xs opacity-75">across all jobs</div>
          </div>
        </div>
      </div>

      {/* Onboarding Banner for very incomplete profiles */}
      {completeness < 50 && (
        <div className="mb-6 bg-primary-50 border-l-4 border-primary-500 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-primary-900 mb-1">Complete your company profile to attract better candidates</h3>
              <p className="text-sm text-primary-800 mb-3">
                Your profile is only {completeness}% complete. Our guided setup takes just a few minutes and helps you stand out.
              </p>
              <Link
                to="/dashboard/employer/onboarding"
                className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition"
              >
                Start guided setup <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completeness Alert */}
      {completeness >= 50 && completeness < 80 && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-amber-900">Complete your company profile ({completeness}%)</h3>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <p className="text-sm text-amber-800 mb-2">
                Companies with complete profiles receive 3x more quality applications.
              </p>
              <Link
                to="/dashboard/employer/company-profile"
                className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline"
              >
                Complete profile <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Active Jobs" value={stats.activeJobs} icon={<Briefcase className="w-6 h-6" />} color="blue" subtitle={`${stats.totalJobs} total`} />
        <StatsCard title="Total Views" value={stats.totalViews} icon={<Eye className="w-6 h-6" />} color="purple" />
        <StatsCard title="Applications" value={stats.totalApplications} icon={<Users className="w-6 h-6" />} color="green" subtitle={`${stats.pendingReviews} pending`} />
        <StatsCard title="Interviews" value={stats.interviewScheduled} icon={<Target className="w-6 h-6" />} color="orange" subtitle={`${stats.offered} offered`} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/dashboard/employer/post-job" className="flex flex-col items-center gap-2 p-4 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition">
            <FileText className="w-6 h-6" />
            <span className="text-sm font-semibold text-center">Post New Job</span>
          </Link>
          <Link to="/dashboard/employer/applicants" className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
            <Users className="w-6 h-6" />
            <span className="text-sm font-semibold text-center">View Applicants</span>
          </Link>
          <Link to="/dashboard/employer/candidate-search" className="flex flex-col items-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition">
            <Search className="w-6 h-6" />
            <span className="text-sm font-semibold text-center">Search Candidates</span>
          </Link>
          <Link to="/dashboard/employer/company-profile" className="flex flex-col items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
            <Building2 className="w-6 h-6" />
            <span className="text-sm font-semibold text-center">Edit Profile</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" /> Recent Applications
            </h2>
            <Link to="/dashboard/employer/applicants" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-2">No applications yet</p>
              <p className="text-sm text-gray-500 mb-4">Post a job to start receiving applications from candidates</p>
              <Link to="/dashboard/employer/post-job" className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm">
                <FileText className="w-4 h-4" /> Post a Job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApplications.slice(0, 8).map(app => (
                <div key={app.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:border-primary-300 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">{app.applicant_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                        app.status === 'screening' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'shortlisted' ? 'bg-purple-100 text-purple-700' :
                        app.status === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                        app.status === 'offered' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{app.job_title}</p>
                    <p className="text-xs text-gray-500">{new Date(app.applied_at).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/dashboard/employer/applicants/${app.job_id}`} className="text-primary-600 hover:text-primary-700 font-medium text-sm ml-4">
                    Review →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Performance */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Job Performance
            </h3>
            {jobPerformance.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active jobs</p>
            ) : (
              <div className="space-y-4">
                {jobPerformance.map(job => (
                  <div key={job.id}>
                    <Link to={`/jobs/${job.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block mb-1">
                      {job.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {job.viewCount}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {job.appCount} apps</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (job.viewCount / maxMetric) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hiring Tips */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-5 border border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Hiring Tips for PNG
            </h3>
            <div className="space-y-3 text-sm">
              <ReferralSection />

            <div>
                <p className="font-medium text-gray-900">📱 Include phone contact</p>
                <p className="text-xs text-gray-600">Many PNG candidates prefer calling over email</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">💰 Show salary range</p>
                <p className="text-xs text-gray-600">Jobs with salary get 2x more applications</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">⚡ Respond within 48hrs</p>
                <p className="text-xs text-gray-600">Fast responses improve your employer rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
