import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applications, jobs, profile, savedJobs, jobAlerts } from '../../../api';
import StatsCard from '../../../components/StatsCard';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import EmailVerificationBanner from '../../../components/EmailVerificationBanner';
import { useAuth } from '../../../context/AuthContext';
import { 
  TrendingUp, Eye, Briefcase, BookmarkCheck, Bell, AlertCircle, 
  Clock, Target, Award, ChevronRight, Sparkles, Calendar, 
  CheckCircle2, Users, DollarSign, TrendingDown, Lightbulb,
  FileText, Search, ExternalLink, Star
} from 'lucide-react';

export default function JobseekerOverview() {
  const { user } = useAuth();
  const [myApplications, setMyApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [profileViews, setProfileViews] = useState({ today: 0, week: 0, trend: 'up' });
  const [applicationStats, setApplicationStats] = useState({});
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [salaryInsights, setSalaryInsights] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, jobsData, profData, savedData, alertsData, viewedData, viewsData, deadlines, insights] = await Promise.all([
        applications.getMy().catch(() => []),
        jobs.getAll({ limit: 8 }).catch(() => ({ data: [] })),
        profile.get().catch(() => null),
        savedJobs.getAll().catch(() => []),
        jobAlerts.getAll().catch(() => []),
        fetchRecentlyViewed().catch(() => []),
        fetchProfileViews().catch(() => ({ today: 0, week: 0, trend: 'up' })),
        fetchUpcomingDeadlines().catch(() => []),
        fetchSalaryInsights().catch(() => null),
      ]);
      
      const appsList = appsData?.data || (Array.isArray(appsData) ? appsData : []);
      setMyApplications(appsList);
      
      // Calculate application stats
      const stats = calculateApplicationStats(appsList);
      setApplicationStats(stats);
      
      // Mock AI matching for recommendations (improved scoring)
      const matchedJobs = (jobsData.data || []).map(job => {
        const matchScore = calculateJobMatch(job, profData?.profile);
        return { ...job, match_score: matchScore };
      }).sort((a, b) => b.match_score - a.match_score);
      
      setRecommendedJobs(matchedJobs);
      setProfileData(profData);
      setSavedJobsCount(Array.isArray(savedData) ? savedData.length : 0);
      setAlertsCount(Array.isArray(alertsData) ? alertsData.filter(a => a.active).length : 0);
      setRecentlyViewed(viewedData);
      setProfileViews(viewsData);
      setUpcomingDeadlines(deadlines);
      setSalaryInsights(insights);
      
      if (profData?.user?.name) {
        setUserName(profData.user.name.split(' ')[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recently viewed jobs from activity log
  const fetchRecentlyViewed = async () => {
    try {
      const res = await fetch('/api/activity/recent-views?limit=5', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  };

  // Fetch profile views analytics
  const fetchProfileViews = async () => {
    try {
      const res = await fetch('/api/profile/views-analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return { today: 0, week: 0, trend: 'stable' };
      return await res.json();
    } catch {
      return { today: 0, week: 0, trend: 'stable' };
    }
  };

  // Fetch upcoming application deadlines
  const fetchUpcomingDeadlines = async () => {
    try {
      const res = await fetch('/api/applications/upcoming-deadlines', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  };

  // Fetch salary insights for user's target roles
  const fetchSalaryInsights = async () => {
    try {
      const res = await fetch('/api/insights/salary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // Calculate application statistics
  const calculateApplicationStats = (apps) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    return {
      total: apps.length,
      pending: apps.filter(a => ['applied', 'screening'].includes(a.status)).length,
      interview: apps.filter(a => a.status === 'interview').length,
      offered: apps.filter(a => a.status === 'offered').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
      thisWeek: apps.filter(a => new Date(a.applied_at).getTime() > now - 7 * dayMs).length,
      thisMonth: apps.filter(a => new Date(a.applied_at).getTime() > now - 30 * dayMs).length,
      avgResponseTime: calculateAvgResponseTime(apps),
      successRate: apps.length > 0 ? Math.round((apps.filter(a => ['interview', 'offered', 'hired'].includes(a.status)).length / apps.length) * 100) : 0,
    };
  };

  const calculateAvgResponseTime = (apps) => {
    const responded = apps.filter(a => a.updated_at !== a.applied_at);
    if (responded.length === 0) return 0;
    
    const totalDays = responded.reduce((sum, app) => {
      const applied = new Date(app.applied_at).getTime();
      const updated = new Date(app.updated_at).getTime();
      return sum + Math.floor((updated - applied) / (24 * 60 * 60 * 1000));
    }, 0);
    
    return Math.round(totalDays / responded.length);
  };

  // Improved job matching algorithm
  const calculateJobMatch = (job, userProfile) => {
    if (!userProfile) return Math.floor(Math.random() * 30) + 60;
    
    let score = 50; // Base score
    
    // Skills match (up to +30 points)
    try {
      const userSkills = userProfile.skills ? JSON.parse(userProfile.skills).map(s => s.toLowerCase()) : [];
      const jobSkills = job.skills ? JSON.parse(job.skills).map(s => s.toLowerCase()) : [];
      
      if (userSkills.length > 0 && jobSkills.length > 0) {
        const matches = jobSkills.filter(js => userSkills.includes(js)).length;
        score += Math.min(30, (matches / jobSkills.length) * 30);
      }
    } catch (e) {
      // Parsing error, skip
    }
    
    // Job type match (up to +10 points)
    if (userProfile.desired_job_type && job.job_type === userProfile.desired_job_type) {
      score += 10;
    }
    
    // Salary match (up to +10 points)
    if (userProfile.desired_salary_min && job.salary_min) {
      if (job.salary_min >= userProfile.desired_salary_min) {
        score += 10;
      } else {
        const ratio = job.salary_min / userProfile.desired_salary_min;
        score += ratio * 10;
      }
    }
    
    return Math.min(99, Math.round(score));
  };

  const calculateProfileCompleteness = () => {
    if (!profileData?.profile) return 0;
    
    const prof = profileData.profile;
    let completed = 0;
    let total = 20; // Comprehensive 20-point system
    
    // Basic info (5 points)
    if (prof.phone) completed++;
    if (prof.location) completed++;
    if (prof.headline) completed++;
    if (prof.bio && prof.bio.length >= 150) completed++;
    if (prof.profile_photo_url) completed++;
    
    // Professional content (8 points)
    try {
      if (prof.skills && JSON.parse(prof.skills).length >= 5) completed++;
      if (prof.work_history && JSON.parse(prof.work_history).length > 0) completed++;
      if (prof.education && JSON.parse(prof.education).length > 0) completed++;
      if (prof.languages && JSON.parse(prof.languages).length > 0) completed++;
      if (prof.certifications && JSON.parse(prof.certifications).length > 0) completed++;
      if (prof.top_skills && JSON.parse(prof.top_skills).length >= 3) completed++;
    } catch (e) {
      // Parse errors
    }
    
    if (prof.cv_url) completed++;
    if (prof.desired_job_type) completed++;
    
    // Media & showcase (4 points)
    if (prof.profile_banner_url) completed++;
    try {
      if (prof.projects && JSON.parse(prof.projects).length > 0) completed++;
      if (prof.volunteer && JSON.parse(prof.volunteer).length > 0) completed++;
      if (prof.featured && JSON.parse(prof.featured).length > 0) completed++;
    } catch (e) {
      // Parse errors
    }
    
    // Settings (3 points)
    if (prof.profile_slug) completed++;
    if (prof.open_to_work) completed++;
    try {
      if (prof.social_links && Object.keys(JSON.parse(prof.social_links)).length > 0) completed++;
    } catch (e) {
      // Parse error
    }
    
    return Math.round((completed / total) * 100);
  };

  const getProfileStrengthLevel = (score) => {
    if (score >= 90) return { label: 'All-Star', color: 'purple', icon: '⭐', emoji: '🌟' };
    if (score >= 75) return { label: 'Expert', color: 'blue', icon: '🎯', emoji: '🎯' };
    if (score >= 50) return { label: 'Intermediate', color: 'green', icon: '📈', emoji: '📊' };
    return { label: 'Beginner', color: 'amber', icon: '🌱', emoji: '🌱' };
  };

  const getProfileTips = () => {
    if (!profileData?.profile) return [];
    
    const prof = profileData.profile;
    const tips = [];
    
    if (!prof.profile_photo_url) {
      tips.push({ text: 'Add a professional photo', impact: '+15% profile views', link: '/dashboard/jobseeker/profile?tab=basic' });
    }
    if (!prof.headline || prof.headline.length < 50) {
      tips.push({ text: 'Write a compelling headline', impact: '+10% search visibility', link: '/dashboard/jobseeker/profile?tab=basic' });
    }
    if (!prof.bio || prof.bio.length < 150) {
      tips.push({ text: 'Complete your about section (150+ words)', impact: '+20% employer interest', link: '/dashboard/jobseeker/profile?tab=basic' });
    }
    
    try {
      const skills = prof.skills ? JSON.parse(prof.skills) : [];
      const topSkills = prof.top_skills ? JSON.parse(prof.top_skills) : [];
      
      if (skills.length < 5) {
        tips.push({ text: 'Add at least 5 relevant skills', impact: '+25% match rate', link: '/dashboard/jobseeker/profile?tab=basic' });
      }
      if (topSkills.length < 3) {
        tips.push({ text: 'Pin your top 3-5 skills', impact: '+12% profile strength', link: '/dashboard/jobseeker/profile?tab=basic' });
      }
    } catch (e) {
      // Parse error
    }
    
    if (!prof.cv_url) {
      tips.push({ text: 'Upload your CV/resume', impact: 'Required for most applications', link: '/dashboard/jobseeker/profile?tab=basic' });
    }
    
    if (!prof.open_to_work) {
      tips.push({ text: 'Turn on "Open to Work"', impact: '+30% recruiter views', link: '/dashboard/jobseeker/profile?tab=settings' });
    }
    
    if (!prof.profile_slug) {
      tips.push({ text: 'Set a custom profile URL', impact: 'Easy sharing & branding', link: '/dashboard/jobseeker/profile?tab=settings' });
    }
    
    return tips.slice(0, 3); // Top 3 tips
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const completeness = calculateProfileCompleteness();
  const strengthLevel = getProfileStrengthLevel(completeness);
  const profileTips = getProfileTips();

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Email Verification Banner */}
      <EmailVerificationBanner user={user} />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-green-500 rounded-lg shadow-md p-8 mb-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              {greeting}, {userName || 'there'}! 
              <span className="text-4xl">{hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙'}</span>
            </h1>
            <p className="text-lg opacity-90 mb-3">
              {myApplications.length === 0 
                ? "Ready to start your job search? Complete your profile and explore opportunities below."
                : applicationStats.pending > 0
                  ? `You have ${applicationStats.pending} application${applicationStats.pending !== 1 ? 's' : ''} pending review${applicationStats.interview > 0 ? ` and ${applicationStats.interview} interview${applicationStats.interview !== 1 ? 's' : ''}` : ''}.`
                  : `You've applied to ${applicationStats.total} job${applicationStats.total !== 1 ? 's' : ''}. Keep up the momentum!`
              }
            </p>
            {applicationStats.successRate > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{applicationStats.successRate}% success rate</span>
                </div>
                {applicationStats.avgResponseTime > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>~{applicationStats.avgResponseTime} day avg. response</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75 mb-1">Profile Views</div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span className="text-2xl font-bold">{profileViews.week}</span>
              {profileViews.trend === 'up' ? (
                <TrendingUp className="w-5 h-5 text-green-300" />
              ) : profileViews.trend === 'down' ? (
                <TrendingDown className="w-5 h-5 text-red-300" />
              ) : null}
            </div>
            <div className="text-xs opacity-75 mt-1">this week</div>
          </div>
        </div>
      </div>

      {/* Profile Completeness Alert */}
      {completeness < 90 && (
        <div className={`mb-6 bg-${strengthLevel.color}-50 border-l-4 border-${strengthLevel.color}-400 rounded-lg p-5`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 text-3xl">
              {strengthLevel.emoji}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-sm font-semibold text-${strengthLevel.color}-900`}>
                  Profile Strength: {strengthLevel.label}
                </h3>
                <span className={`text-sm font-bold text-${strengthLevel.color}-900`}>{completeness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div
                  className={`h-2.5 rounded-full bg-gradient-to-r from-${strengthLevel.color}-400 to-${strengthLevel.color}-600 transition-all`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
              
              {profileTips.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-sm font-medium text-${strengthLevel.color}-800 mb-2`}>
                    💡 Top recommendations to improve your profile:
                  </p>
                  {profileTips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className={`w-4 h-4 text-${strengthLevel.color}-600 mt-0.5 flex-shrink-0`} />
                      <div className="flex-1">
                        <Link 
                          to={tip.link} 
                          className={`text-sm text-${strengthLevel.color}-800 hover:text-${strengthLevel.color}-900 font-medium hover:underline`}
                        >
                          {tip.text}
                        </Link>
                        <span className={`text-xs text-${strengthLevel.color}-700 ml-2`}>
                          {tip.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Deadline Warnings */}
      {upcomingDeadlines.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">
                ⏰ Upcoming Application Deadlines
              </h3>
              <div className="space-y-2">
                {upcomingDeadlines.map(deadline => (
                  <div key={deadline.job_id} className="flex items-center justify-between text-sm">
                    <Link 
                      to={`/jobs/${deadline.job_id}`}
                      className="text-red-800 hover:text-red-900 font-medium hover:underline"
                    >
                      {deadline.job_title} at {deadline.company_name}
                    </Link>
                    <span className="text-xs text-red-700 font-semibold">
                      {deadline.days_left === 0 ? 'TODAY' : deadline.days_left === 1 ? 'TOMORROW' : `${deadline.days_left} days left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row 1 - Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Total Applications" 
          value={applicationStats.total} 
          icon={<Briefcase className="w-6 h-6" />}
          subtitle={`${applicationStats.thisWeek} this week`}
          color="blue" 
        />
        <StatsCard 
          title="Pending Review" 
          value={applicationStats.pending} 
          icon={<Clock className="w-6 h-6" />}
          subtitle={applicationStats.avgResponseTime > 0 ? `~${applicationStats.avgResponseTime}d avg. response` : 'No responses yet'}
          color="orange" 
        />
        <StatsCard 
          title="Interviews" 
          value={applicationStats.interview} 
          icon={<Target className="w-6 h-6" />}
          subtitle={`${applicationStats.successRate}% success rate`}
          color="purple" 
        />
        <StatsCard 
          title="Saved Jobs" 
          value={savedJobsCount} 
          icon={<BookmarkCheck className="w-6 h-6" />}
          subtitle="Ready to apply"
          color="green" 
        />
      </div>

      {/* Stats Row 2 - Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Profile Views</h3>
            </div>
            {profileViews.trend === 'up' ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : profileViews.trend === 'down' ? (
              <TrendingDown className="w-5 h-5 text-red-600" />
            ) : null}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{profileViews.week}</p>
          <p className="text-sm text-gray-600">this week • {profileViews.today} today</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Active Alerts</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{alertsCount}</p>
          <Link 
            to="/dashboard/jobseeker/job-alerts"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            Manage alerts <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Success Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{applicationStats.successRate}%</p>
          <p className="text-sm text-gray-600">
            {applicationStats.interview + applicationStats.offered} positive responses
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Applications */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Recent Applications
              </h2>
              <Link to="/dashboard/jobseeker/applications" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {myApplications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-gray-600 mb-3 font-medium">No applications yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Start applying to jobs that match your skills and experience
                </p>
                <Link 
                  to="/jobs" 
                  className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  <Search className="w-4 h-4" />
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.slice(0, 5).map(app => (
                  <div key={app.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition">
                    <div className="flex-1">
                      <Link to={`/jobs/${app.job_id}`} className="font-semibold text-gray-900 hover:text-primary-600 text-base mb-1 block">
                        {app.job_title}
                      </Link>
                      <p className="text-sm text-gray-700 mb-2">{app.company_name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          📍 {app.location}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Applied {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {app.match_score && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-primary-600">
                              <Target className="w-3 h-3" />
                              {app.match_score}% match
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Jobs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  Recommended for You
                </h2>
                <p className="text-sm text-gray-600 mt-1">AI-matched jobs based on your profile</p>
              </div>
              <Link to="/dashboard/jobseeker/recommendations" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {recommendedJobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🎯</div>
                <p className="text-gray-600 mb-3 font-medium">No recommendations yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Complete your profile to get personalized job recommendations
                </p>
                <Link 
                  to="/dashboard/jobseeker/profile" 
                  className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Complete Profile
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendedJobs.slice(0, 5).map(job => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link to={`/jobs/${job.id}`} className="text-lg font-bold text-gray-900 hover:text-primary-600">
                            {job.title}
                          </Link>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            job.match_score >= 85 ? 'bg-green-100 text-green-800' :
                            job.match_score >= 75 ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <Star className="w-3 h-3" />
                            {job.match_score}% Match
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{job.company_name}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">📍 {job.location}</span>
                          <span className="flex items-center gap-1">💼 {job.job_type}</span>
                          {job.salary_min && job.salary_max && (
                            <span className="flex items-center gap-1 font-semibold text-green-700">
                              💰 K{job.salary_min.toLocaleString()} - K{job.salary_max.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium text-center"
                      >
                        View Details
                      </Link>
                      <Link
                        to={`/jobs/${job.id}#apply`}
                        className="flex-1 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium text-center"
                      >
                        Quick Apply
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="space-y-6">
          {/* Recently Viewed Jobs */}
          {recentlyViewed.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-600" />
                Recently Viewed
              </h3>
              <div className="space-y-3">
                {recentlyViewed.slice(0, 3).map(job => (
                  <Link 
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block hover:bg-gray-50 p-2 rounded-lg transition"
                  >
                    <p className="font-medium text-sm text-gray-900 hover:text-primary-600 mb-1">
                      {job.title}
                    </p>
                    <p className="text-xs text-gray-600">{job.company_name}</p>
                    <p className="text-xs text-gray-500 mt-1">Viewed {job.viewed_ago}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Salary Insights */}
          {salaryInsights && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-sm p-5 border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Salary Insights
              </h3>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Avg. for your role:</span>
                  <span className="font-bold text-gray-900">K{salaryInsights.avg.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Market range:</span>
                  <span className="font-semibold text-gray-800">
                    K{salaryInsights.min.toLocaleString()} - K{salaryInsights.max.toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Based on {salaryInsights.job_count} {salaryInsights.role_name} jobs in PNG
              </p>
            </div>
          )}

          {/* Career Tips Widget */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-5 border border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              Career Tips
            </h3>
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">💡 Apply within 24 hours</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Candidates who apply within the first day get 3x more responses
                </p>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">✍️ Customize your cover letter</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tailored applications have 40% higher success rates
                </p>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">📞 Follow up after 5 days</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  A polite follow-up shows initiative and keeps you top-of-mind
                </p>
              </div>
            </div>
          </div>

          {/* Download Resume Widget */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm p-5 border border-green-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              Your Resume
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Download your professional resume generated from your profile
            </p>
            <div className="space-y-2">
              <a
                href="/api/jobseeker/resume/download"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium text-center transition"
              >
                Download Resume
              </a>
              <Link
                to="/dashboard/jobseeker/profile"
                className="block w-full px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 text-sm font-medium text-center transition"
              >
                Update Profile
              </Link>
            </div>
          </div>

          {/* Skills Assessment Prompt */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-5 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Skills Assessment
            </h3>
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              Verify your skills with quick assessments and earn badges
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2">
              <Award className="w-4 h-4" />
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
