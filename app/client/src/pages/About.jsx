export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">About WantokJobs</h1>
      
      <div className="prose prose-lg">
        <p className="text-xl text-gray-600 mb-8">
          WantokJobs is the leading job platform connecting talent with opportunity across Papua New Guinea and the Pacific region.
        </p>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700">
            To empower job seekers and employers in the Pacific region by providing a modern, accessible platform that connects the right talent with the right opportunities. We believe in the potential of Pacific talent and are committed to helping individuals and businesses thrive.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose WantokJobs?</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="text-primary-600 font-bold mr-3">✓</span>
              <div>
                <strong>Local Focus:</strong> We understand the Pacific job market and cater specifically to our region's needs.
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 font-bold mr-3">✓</span>
              <div>
                <strong>Easy to Use:</strong> Simple, intuitive platform designed for everyone.
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 font-bold mr-3">✓</span>
              <div>
                <strong>Trusted by Employers:</strong> Top companies in PNG and the Pacific use our platform.
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 font-bold mr-3">✓</span>
              <div>
                <strong>Free for Job Seekers:</strong> Browse and apply to unlimited jobs at no cost.
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
          <p className="text-gray-700 mb-4">
            WantokJobs was founded with a simple goal: to make job searching and hiring easier in the Pacific region. We saw that job seekers struggled to find opportunities, and employers found it hard to reach qualified candidates.
          </p>
          <p className="text-gray-700">
            Today, we're proud to serve thousands of job seekers and hundreds of employers across Papua New Guinea, Fiji, Solomon Islands, Vanuatu, and other Pacific nations. We're more than just a job board – we're your wantok in the job market.
          </p>
        </div>

        <div className="bg-primary-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Us Today</h2>
          <p className="text-gray-700 mb-6">
            Whether you're looking for your next opportunity or the perfect candidate, WantokJobs is here to help.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/register"
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
            >
              Get Started
            </a>
            <a
              href="/jobs"
              className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg border-2 border-primary-600 hover:bg-primary-50"
            >
              Browse Jobs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
